'use strict'

const fsp = require('fs/promises')
const path = require('path')

const C = require('../constants')
const logger = C.LOGGER
const batchUtils = require('./batch')
const fileTypes = require('./fileTypes')
const fileUtils = require('./file')

module.exports = {
  /*
   * Rather than caching every single size a client requests, cache in
   * increments of 200px. The final output is produced by resizing the cached
   * image the next size bigger than what the client is requesting (or the
   * exact size if that works out!), and is usually very fast. By serving image
   * with good cache-control headers, we can get great performance.
   */
  getCachedImageSizes: (resizeOptions) => {
    const cacheWidth = 200 * Math.ceil(resizeOptions.width / 200)
    const cacheHeight = 200 * Math.ceil(resizeOptions.height / 200)
    return [cacheWidth, cacheHeight]
  },

  /*
   * Return the cache path for a given file and size
   */
  makeResizeCachePath: (filePath, height, width) => {
    if (!filePath.startsWith(C.CACHE_ROOT)) {
      // If this was a raw conversion, the filePath with already have the
      // CACHE_ROOT, so we need to protect against making it
      // `/cache/cache/...`.
      filePath = path.join(C.CACHE_ROOT, filePath)
    }
    // e.g. /cache/albums/album_hawaii/hawaii.CR2^1200x800.jpg
    return `${filePath}^${width}x${height}.${fileTypes.getOutputTypeForFile(
      filePath
    )}`
  },

  /*
   * returns the cache path for a given file's metadata
   */
  getFileObjMetadataFname: (albumPath, fileName) => {
    return path.join(C.CACHE_ROOT, 'albums', albumPath, fileName + '.json')
  },

  /*
   * Given a `filePath` to a video file, return the filename of the cached
   * transcoded file.
   */
  cachePathForVideo: (filePath) => {
    return path.join(C.CACHE_ROOT, filePath + '^transcoded.mp4')
  },

  /*
   * Given a `filePath` to a video file, return the filename of the original
   * full-size thumbnail in the cache.
   */
  cachePathForVideoThumbnail: (filePath) => {
    return path.join(C.CACHE_ROOT, filePath + '^thumb.jpg')
  },

  /*
   * given a path to something in `/albums` dir, clean up files in the `/cache` dir
   */
  cleanUpCacheFor: async (albumFilePath) => {
    const files = await fileUtils.globPromise(
      path.join(C.CACHE_ROOT, 'albums', `${albumFilePath}*`)
    )
    const albumPath = path.dirname(albumFilePath)
    files.push(path.join(C.CACHE_ROOT, 'albums', albumPath, 'album.json'))
    files.push(
      path.join(C.CACHE_ROOT, 'albums', albumPath, 'album.extended.json')
    )
    logger.debug('CleanUpCacheFor', { files })
    await batchUtils.promiseAllInBatches(
      files,
      (file) => fsp.rm(file, { force: true }),
      10
    )
  },
}
