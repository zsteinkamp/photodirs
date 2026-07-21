import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { pipeline } from 'stream/promises'
import sharp from 'sharp'
import util from 'node:util'
import { execFile, spawn } from 'child_process'
const pExecFile = util.promisify(execFile)

import * as C from '../constants.js'
const logger = C.LOGGER
import * as fileTypes from './fileTypes.js'
import * as imageUtils from './image.js'
import * as fileUtils from './file.js'
import * as cacheUtils from './cache.js'

import type { ResizeOptions } from 'sharp'

/*
 * Locate the cached image closest to what the client is requesting. If it's
 * not found, then create it and return the filename.
 */
export const getCachedImagePath = async (
  filePath: string,
  resizeOptions: ResizeOptions,
): Promise<string | null> => {
  logger.debug('GetCachedImagePath', { filePath, resizeOptions })
  const [cacheWidth, cacheHeight] =
    cacheUtils.getCachedImageSizes(resizeOptions)

  const cachePath = cacheUtils.makeResizeCachePath(
    filePath,
    cacheWidth,
    cacheHeight,
  )

  let cacheStat: Partial<fs.Stats> = {}
  let origStat: Partial<fs.Stats> = {}

  try {
    cacheStat = await fsp.stat(cachePath)
    origStat = await fsp.stat(filePath)
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code !== 'ENOENT') {
      logger.error('CACHESTAT returned error', { e })
    }
  }

  if (typeof cacheStat.size !== 'undefined' && cacheStat.size === 0) {
    logger.warn('Zero length file found. Regenerating.', {
      cachePath,
      cacheStat,
    })
  }

  if (
    typeof cacheStat.size === 'undefined' ||
    cacheStat.size === 0 ||
    (cacheStat.mtime && origStat.mtime && cacheStat.mtime < origStat.mtime)
  ) {
    await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 })
    logger.debug('GEN_AND_CACHE_IMAGE', {
      filePath,
      cachePath,
      resizeOptions,
    })
    const readStream = fs.createReadStream(filePath)
    const transform = imageUtils.getSharpTransform(filePath, {
      height: cacheHeight,
      width: cacheWidth,
      fit: sharp.fit.outside,
    })
    const outStream = fs.createWriteStream(cachePath)

    async function plumbing() {
      await pipeline(readStream, transform!, outStream)
      logger.info('GET_CACHED_IMAGE_PATH:WROTE_FILE', { filePath, cachePath })
    }
    await plumbing().catch(async err => {
      logger.error('IMG CACHE PIPELINE ERROR 2', { filePath, cachePath, err })
      await fsp.rm(cachePath, { force: true })
      return null
    })
  }
  return cachePath
}

/*
 * Returns a Sharp transformer appropriate for the supplied file's type
 */
export const getSharpTransform = (
  filePath: string,
  resizeOptions: ResizeOptions,
): sharp.Sharp | undefined => {
  const transformers: Record<string, sharp.Sharp> = {
    jpg: sharp()
      .jpeg()
      .rotate()
      .resize(resizeOptions as ResizeOptions),
    gif: sharp().resize(resizeOptions as ResizeOptions),
    png: sharp().resize(resizeOptions as ResizeOptions),
  }
  return transformers[fileTypes.getOutputTypeForFile(filePath)]
}

/*
 * Convert a camera raw image to JPEG, cache it, and return the cache filename.
 */
export const jpegFileForRaw = async (
  filePath: string,
): Promise<string | null> => {
  const cachePath = path.join(C.CACHE_ROOT, filePath + '.jpg')
  logger.debug('jpegFileForRaw', { filePath, cachePath })
  if (await fileUtils.fileExists(cachePath)) {
    return cachePath
  }

  await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 })

  const tiffPipe = imageUtils.rawToTiffPipe(filePath)
  const outStream = fs.createWriteStream(cachePath)
  const transform = sharp().rotate().jpeg()

  async function plumbing() {
    await pipeline(tiffPipe, transform, outStream)
    logger.info('JPEG_FILE_FOR_RAW:WROTE_JPG', { filePath, cachePath })
  }
  await plumbing().catch(async err => {
    logger.error('JPEG_FILE_FOR_RAW:PIPELINE_ERROR', {
      filePath,
      cachePath,
      err,
    })
    await fsp.rm(cachePath, { force: true })
    return null
  })
  return cachePath
}

/*
 * Create a JPEG thumbnail for a video file, cache it, and return the cache filename.
 */
export const jpegFileForVideo = async (filePath: string): Promise<string> => {
  const cachePath = cacheUtils.cachePathForVideoThumbnail(filePath)
  logger.debug('jpegFileForVideo', { filePath, cachePath })
  if (
    (await fileUtils.fileExists(cachePath)) &&
    !(await fileUtils.isFileOlderThanAny(cachePath, [filePath]))
  ) {
    return cachePath
  }

  await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 })

  await pExecFile('/usr/bin/ffmpeg', [
    '-threads',
    '2',
    '-i',
    filePath,
    '-y',
    '-vf',
    'thumbnail=100',
    '-frames:v',
    '1',
    '-update',
    '1',
    cachePath,
  ])

  logger.info('WROTE VIDEO THUMB', { filePath, cachePath })

  return cachePath
}

/*
 * Generate standard resizes
 */
export const preResize = async (
  absFname: string,
): Promise<(string | null)[]> => {
  logger.debug('PRE_RESIZE', { absFname })
  const preResizePromises = Object.values(C.SIZE_PRESETS)
    .filter(o => {
      return o.pregenerate && o.size !== 'orig'
    })
    .map(o => {
      const [height, width] = o.size.split('x')
      return {
        height: parseInt(height),
        width: parseInt(width),
      }
    })
    .map(o => {
      return imageUtils.getCachedImagePath(absFname, {
        height: o.height,
        width: o.width,
      })
    })
  return Promise.all(preResizePromises)
}

/*
 * Read raw files and return a pipe of TIFF data.
 */
export const rawToTiffPipe = (filePath: string) => {
  const dcrawProcess = spawn(
    '/usr/bin/dcraw_emu',
    ['-T', '-Z', '-', filePath],
    { stdio: ['ignore', 'pipe', process.stderr] },
  )
  return dcrawProcess.stdout
}
