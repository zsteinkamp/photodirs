'use strict'

const C = require('./constants')
const logger = C.LOGGER
const fileTypes = require('./util/fileTypes')
const videoUtils = require('./util/video')

const handleVideo = async (filePath, res) => {
  // getCachedImagePath is also responsible for resizing the image and caching it
  const cachedVideoPath = await videoUtils.getCachedVideoPath(filePath)

  if (!cachedVideoPath) {
    // must have been an error
    return res.status(500).send()
  }

  logger.info('HANDLE VIDEO', { filePath, cachedVideoPath })

  // Set the correct Content-Type header
  res.type(`video/${fileTypes.getOutputTypeForFile(cachedVideoPath)}`)
  res.set('Cache-control', 'public, max-age=86400')
  res.sendFile(cachedVideoPath)
}

module.exports = handleVideo
