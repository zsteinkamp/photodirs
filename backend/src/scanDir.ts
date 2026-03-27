import { readdir } from 'fs/promises'
import { join } from 'path'
import fastq from 'fastq'

import { LOGGER, ALBUMS_ROOT, MAC_FORBIDDEN_FILES_REGEX } from './constants.js'
import { getAlbumObj, getExtendedAlbumObj } from './util/albumObj.js'
import { promiseAllInBatches } from './util/batch.js'
import { getFileObj } from './util/fileObj.js'
import { isRaw, isVideo } from './util/fileTypes.js'
import { getSupportedFiles } from './util/file.js'
import { jpegFileForRaw, jpegFileForVideo, preResize } from './util/image.js'
import * as videoUtils from './util/video.js'

const logger = LOGGER

const transcoder = async ({ filePath }: { filePath: string }) => {
  return await videoUtils.getCachedVideoPath(filePath)
}
const transcodingQueue = fastq.promise(transcoder, 1)

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
      10,
    )

    const dirFiles = await getSupportedFiles(dirName)

    logger.debug('SCAN_DIRECTORY:MID', { dirName, dirFiles })

    await promiseAllInBatches(dirFiles, fName => getFileObj(dirName, fName), 10)

    await promiseAllInBatches(
      dirFiles,
      async fName => {
        let absFname = join('/albums', dirName, fName)
        if (isRaw(absFname)) {
          const jpegPath = await jpegFileForRaw(absFname)
          logger.debug('PRE-CONVERT RAW', { absFname, jpegPath })
          if (jpegPath) absFname = jpegPath
        } else if (isVideo(absFname)) {
          transcodingQueue.push({ filePath: absFname })
          const posterPath = await jpegFileForVideo(absFname)
          logger.debug('PRE-GENERATE VIDEO THUMBNAIL', {
            absFname,
            posterPath,
          })
          absFname = posterPath
        }
        await preResize(absFname)
      },
      10,
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
