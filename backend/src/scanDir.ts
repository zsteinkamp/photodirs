import { readdir } from 'fs/promises'
import { join } from 'path'
import fastq from 'fastq'

import {
  LOGGER,
  ALBUMS_ROOT,
  MAC_FORBIDDEN_FILES_REGEX,
  MAX_PARALLEL_JOBS,
} from './constants.js'
import { getAlbumObj, getExtendedAlbumObj } from './util/albumObj.js'
import { promiseAllInBatches } from './util/batch.js'
import { getFileObj } from './util/fileObj.js'
import { isRaw, isVideo } from './util/fileTypes.js'
import { getSupportedFiles } from './util/file.js'
import { jpegFileForRaw, jpegFileForVideo, preResize } from './util/image.js'
import * as videoUtils from './util/video.js'

const logger = LOGGER

//
// GLOBAL concurrency limiters, shared across the ENTIRE recursive scan.
//
// scanDirectory() recurses, and the per-directory promiseAllInBatches() limits
// below only cap fan-out at a single tree node. Because the batches nest, the
// effective concurrency of the heavy media operations grows ~10^depth, which
// spawned dozens of simultaneous ffmpeg/Sharp jobs and drove the host into
// swap. Routing every CPU/RAM-heavy op through a single global fastq queue
// caps TOTAL concurrent heavy work at MAX_PARALLEL_JOBS regardless of how many
// directories are being scanned at once. These operations never await each
// other, so a shared queue cannot deadlock.
//
const transcoder = async ({ filePath }: { filePath: string }) => {
  return await videoUtils.getCachedVideoPath(filePath)
}
// Video transcode is the heaviest ffmpeg job: keep it strictly serial.
const transcodingQueue = fastq.promise(transcoder, 1)
// Videos already queued/in-flight for transcode, so the 60s periodic scan
// doesn't re-push the same file every minute while the library catches up.
const transcodePending = new Set<string>()

// Video poster-frame extraction (ffmpeg).
const posterQueue = fastq.promise(
  async ({ absFname }: { absFname: string }) => jpegFileForVideo(absFname),
  MAX_PARALLEL_JOBS,
)
// RAW -> JPEG conversion (dcraw + Sharp).
const rawQueue = fastq.promise(
  async ({ absFname }: { absFname: string }) => jpegFileForRaw(absFname),
  MAX_PARALLEL_JOBS,
)
// Pre-generated resizes (Sharp/libvips — the big memory consumer).
const resizeQueue = fastq.promise(
  async ({ absFname }: { absFname: string }) => preResize(absFname),
  MAX_PARALLEL_JOBS,
)

// Live counts for the status dashboard. fastq exposes running() (in-flight)
// and length() (waiting) at runtime, but its 1.15 typings omit running(), so
// read through a narrow cast. (Individual jobs are recorded inside the work
// functions themselves — only when they actually run ffmpeg/Sharp, not on the
// cache-hit no-ops the periodic scan performs on every file.)
type QueueStats = { running(): number; length(): number }
const stats = (q: QueueStats): { running: number; queued: number } => ({
  running: q.running(),
  queued: q.length(),
})
export const getQueueCounts = (): Record<
  string,
  { running: number; queued: number }
> => ({
  transcode: stats(transcodingQueue as unknown as QueueStats),
  poster: stats(posterQueue as unknown as QueueStats),
  raw: stats(rawQueue as unknown as QueueStats),
  resize: stats(resizeQueue as unknown as QueueStats),
})

export const scanDirectory = async (dirName: string): Promise<void> => {
  logger.debug('SCAN_DIRECTORY:TOP', { dirName })

  try {
    const subdirs = (
      await readdir(join(ALBUMS_ROOT, dirName), {
        withFileTypes: true,
      })
    ).filter(
      dirEnt =>
        dirEnt.isDirectory() && !dirEnt.name.match(MAC_FORBIDDEN_FILES_REGEX),
    )

    await promiseAllInBatches(
      subdirs,
      dirEnt => scanDirectory(join(dirName, dirEnt.name)),
      MAX_PARALLEL_JOBS,
    )

    const dirFiles = await getSupportedFiles(dirName)

    logger.debug('SCAN_DIRECTORY:MID', { dirName, dirFiles })

    await promiseAllInBatches(
      dirFiles,
      fName => getFileObj(dirName, fName),
      MAX_PARALLEL_JOBS,
    )

    await promiseAllInBatches(
      dirFiles,
      async fName => {
        let absFname = join('/albums', dirName, fName)
        if (isRaw(absFname)) {
          const jpegPath = await rawQueue.push({ absFname })
          logger.debug('PRE-CONVERT RAW', { absFname, jpegPath })
          if (jpegPath) absFname = jpegPath
        } else if (isVideo(absFname)) {
          // Fire-and-forget transcode, but only enqueue once per file until it
          // finishes — otherwise the 60s periodic scan re-queues every
          // uncached video every minute and the queue grows without bound.
          if (!transcodePending.has(absFname)) {
            transcodePending.add(absFname)
            transcodingQueue
              .push({ filePath: absFname })
              .catch((err: unknown) =>
                logger.error('TRANSCODE_FAILED', { absFname, err }),
              )
              .finally(() => transcodePending.delete(absFname))
          }
          // A thumbnail failure (e.g. ffmpeg OOM-killed on a huge 4K frame)
          // must not abort the whole directory scan / crash the watcher: skip
          // just this file's poster + resize and let the rest proceed.
          try {
            const posterPath = await posterQueue.push({ absFname })
            logger.debug('PRE-GENERATE VIDEO THUMBNAIL', {
              absFname,
              posterPath,
            })
            absFname = posterPath
          } catch (err: unknown) {
            logger.error('VIDEO_THUMBNAIL_FAILED', { absFname, err })
            return
          }
        }
        await resizeQueue.push({ absFname })
      },
      MAX_PARALLEL_JOBS,
    )

    const albumObj = await getAlbumObj(dirName)
    await getExtendedAlbumObj(albumObj)
    logger.debug('CHECKED/WROTE METADATAS', { dirName })
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'PERM' || err.code === 'EACCES') {
      logger.info('Permission Denied', { error: err })
      return
    } else if (err.code === 'ENOENT') {
      logger.info('Path not found', { dirName })
      return
    } else {
      logger.error('readdir error5', {
        keys: Object.keys(err),
        code: err.code,
        errno: err.errno,
      })
      throw e
    }
  }
}
