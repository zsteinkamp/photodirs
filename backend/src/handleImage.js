'use strict'

import { createReadStream } from 'fs'
import { basename } from 'path'
import sharp from 'sharp'
const { fit: _fit } = sharp
import { pipeline } from 'stream/promises'

import { LOGGER, MAX_DIMENSION, MIN_DIMENSION } from './constants.js'
import { isRaw, isVideo, getOutputTypeForFile } from './util/fileTypes.js'
import {
  jpegFileForRaw,
  jpegFileForVideo,
  getCachedImagePath,
  getSharpTransform,
} from './util/image.js'

const logger = LOGGER

export default async (filePath, size, crop, res) => {
  // Initialize these here up top
  let width = 1600
  let height = 1600

  if (typeof size === 'string') {
    if (size === 'orig') {
      // Return original file ... express takes care of Content-Type!
      res.set('Cache-Control', 'public, max-age=86400')
      res.set(
        'Content-Disposition',
        `attachment; filename="${basename(filePath)}"`,
      )
      return res.sendFile(filePath)
    }

    // User provided size ... has to match
    const matches = size.match(/^(?<width>\d+)x(?<height>\d+)$/)
    if (matches) {
      width = Math.max(
        Math.min(parseInt(matches.groups.width), MAX_DIMENSION),
        MIN_DIMENSION,
      )
      height = Math.max(
        Math.min(parseInt(matches.groups.height), MAX_DIMENSION),
        MIN_DIMENSION,
      )
    }
  }

  // Crop is given as a boolean query string param, e.g. `?crop`
  crop = typeof crop !== 'undefined'

  const resizeOptions = {
    width: width,
    height: height,
    fit: crop ? _fit.cover : _fit.inside,
  }

  if (isRaw(filePath)) {
    // RAW handling -- convert to JPEG, cache, and return JPEG filename.
    // Will return JPEG filename immediately if already cached.
    filePath = await jpegFileForRaw(filePath)
  } else if (isVideo(filePath)) {
    filePath = await jpegFileForVideo(filePath)
  }

  // getCachedImagePath is also responsible for resizing the image and caching it
  const cachedImagePath = await getCachedImagePath(filePath, resizeOptions)

  if (!cachedImagePath) {
    // must have been an error
    return res.status(500).send()
  }
  const readStream = createReadStream(cachedImagePath)
  const transform = getSharpTransform(cachedImagePath, resizeOptions)

  // Set the correct Content-Type header
  res.type(`image/${getOutputTypeForFile(cachedImagePath)}`)
  res.set('Cache-control', 'public, max-age=86400')
  // Stream the image through the transformer and out to the response.
  async function plumbing() {
    await pipeline(readStream, transform, res)
  }
  await plumbing().catch(err => {
    logger.error('IMG CACHE PIPELINE ERROR', { filePath, cachedImagePath, err })
    res.end()
  })
}
