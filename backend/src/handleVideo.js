'use strict'

import { LOGGER } from './constants.js'
import { getOutputTypeForFile } from './util/fileTypes.js'
import { getCachedVideoPath } from './util/video.js'

const logger = LOGGER

export const handleVideo = async (filePath, res) => {
  // getCachedVideoPath is also responsible for resizing the image and caching it
  const cachedVideoPath = await getCachedVideoPath(filePath)

  if (!cachedVideoPath) {
    // must have been an error
    return res.status(500).send()
  }

  logger.info('HANDLE VIDEO', { filePath, cachedVideoPath })

  // Set the correct Content-Type header
  res.type(`video/${getOutputTypeForFile(cachedVideoPath)}`)
  res.set('Cache-control', 'public, max-age=86400')
  res.sendFile(cachedVideoPath)
}
