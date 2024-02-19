'use strict'

import { rm } from 'fs/promises'
import { join, dirname } from 'path'

import { LOGGER, CACHE_ROOT } from '../constants.js'
const logger = LOGGER
import { promiseAllInBatches } from './batch.js'
import { getOutputTypeForFile } from './fileTypes.js'
import { globPromise } from './file.js'

export function getCachedImageSizes(resizeOptions) {
  const cacheWidth = 200 * Math.ceil(resizeOptions.width / 200)
  const cacheHeight = 200 * Math.ceil(resizeOptions.height / 200)
  return [cacheWidth, cacheHeight]
}
export function makeResizeCachePath(filePath, height, width) {
  if (!filePath.startsWith(CACHE_ROOT)) {
    // If this was a raw conversion, the filePath with already have the
    // CACHE_ROOT, so we need to protect against making it
    // `/cache/cache/...`.
    filePath = join(CACHE_ROOT, filePath)
  }
  // e.g. /cache/albums/album_hawaii/hawaii.CR2^1200x800.jpg
  return `${filePath}^${width}x${height}.${getOutputTypeForFile(filePath)}`
}
export function getFileObjMetadataFname(albumPath, fileName) {
  return join(CACHE_ROOT, 'albums', albumPath, fileName + '.json')
}
export function cachePathForVideo(filePath) {
  return join(CACHE_ROOT, filePath + '^transcoded.mp4')
}
export function cachePathForVideoThumbnail(filePath) {
  return join(CACHE_ROOT, filePath + '^thumb.jpg')
}
export async function cleanUpCacheFor(albumFilePath) {
  const files = await globPromise(
    join(CACHE_ROOT, 'albums', `${albumFilePath}*`),
  )
  const albumPath = dirname(albumFilePath)
  files.push(join(CACHE_ROOT, 'albums', albumPath, 'album.json'))
  files.push(join(CACHE_ROOT, 'albums', albumPath, 'album.extended.json'))
  logger.debug('CleanUpCacheFor', { files })
  await promiseAllInBatches(files, file => rm(file, { force: true }), 10)
}
