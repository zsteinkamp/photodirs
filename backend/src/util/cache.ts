import { rm } from 'fs/promises'
import { join, dirname } from 'path'

import { LOGGER, CACHE_ROOT, MAX_PARALLEL_JOBS } from '../constants.js'
import { promiseAllInBatches } from './batch.js'
import { getOutputTypeForFile } from './fileTypes.js'
import { globPromise } from './file.js'

const logger = LOGGER

export function getCachedImageSizes(resizeOptions: {
  width?: number
  height?: number
}): [number, number] {
  const cacheWidth = 200 * Math.ceil((resizeOptions.width || 200) / 200)
  const cacheHeight = 200 * Math.ceil((resizeOptions.height || 200) / 200)
  return [cacheWidth, cacheHeight]
}

export function makeResizeCachePath(
  filePath: string,
  height: number,
  width: number,
): string {
  if (!filePath.startsWith(CACHE_ROOT)) {
    filePath = join(CACHE_ROOT, filePath)
  }
  return `${filePath}^${width}x${height}.${getOutputTypeForFile(filePath)}`
}

export function getFileObjMetadataFname(
  albumPath: string,
  fileName: string,
): string {
  return join(CACHE_ROOT, 'albums', albumPath, fileName + '.json')
}

export function cachePathForVideo(filePath: string): string {
  return join(CACHE_ROOT, filePath + '^transcoded.mp4')
}

export function cachePathForVideoThumbnail(filePath: string): string {
  return join(CACHE_ROOT, filePath + '^thumb.jpg')
}

export async function cleanUpCacheFor(albumFilePath: string): Promise<void> {
  const files = await globPromise(
    join(CACHE_ROOT, 'albums', `${albumFilePath}*`),
  )
  const albumPath = dirname(albumFilePath)
  files.push(join(CACHE_ROOT, 'albums', albumPath, 'album.json'))
  files.push(join(CACHE_ROOT, 'albums', albumPath, 'album.extended.json'))
  logger.debug('CleanUpCacheFor', { files })
  await promiseAllInBatches(
    files,
    file => rm(file, { force: true }),
    MAX_PARALLEL_JOBS,
  )
}
