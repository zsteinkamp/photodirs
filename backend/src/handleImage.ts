import { createReadStream } from 'fs'
import { basename } from 'path'
import sharp from 'sharp'
const { fit: _fit } = sharp
import { pipeline } from 'stream/promises'
import { Response } from 'express'

import { LOGGER, MAX_DIMENSION, MIN_DIMENSION } from './constants.js'
import { isRaw, isVideo, getOutputTypeForFile } from './util/fileTypes.js'
import {
  jpegFileForRaw,
  jpegFileForVideo,
  getCachedImagePath,
  getSharpTransform,
} from './util/image.js'

const logger = LOGGER

export const handleImage = async (
  filePath: string,
  size: string | undefined,
  crop: string | boolean | undefined,
  hash: string | undefined,
  res: Response,
): Promise<void> => {
  let width = 1600
  let height = 1600

  // A `hash` param makes the URL content-addressed: the frontend changes it
  // whenever the underlying file changes, so the response is safe to cache
  // forever. Without it, fall back to a conservative 1-day TTL.
  const cacheControl = hash
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=86400'

  if (typeof size === 'string') {
    if (size === 'orig') {
      res.set('Cache-Control', cacheControl)
      res.set(
        'Content-Disposition',
        `attachment; filename="${basename(filePath)}"`,
      )
      res.sendFile(filePath)
      return
    }

    const matches = size.match(/^(?<width>\d+)x(?<height>\d+)$/)
    if (matches?.groups) {
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

  const shouldCrop = typeof crop !== 'undefined'

  const resizeOptions = {
    width: width,
    height: height,
    fit: shouldCrop ? _fit.cover : _fit.inside,
  }

  if (isRaw(filePath)) {
    const jpegPath = await jpegFileForRaw(filePath)
    if (jpegPath) filePath = jpegPath
  } else if (isVideo(filePath)) {
    filePath = await jpegFileForVideo(filePath)
  }

  const cachedImagePath = await getCachedImagePath(filePath, resizeOptions)

  if (!cachedImagePath) {
    res.status(500).send()
    return
  }
  const readStream = createReadStream(cachedImagePath)
  const transform = getSharpTransform(cachedImagePath, resizeOptions)

  res.type(`image/${getOutputTypeForFile(cachedImagePath)}`)
  res.set('Cache-control', cacheControl)
  async function plumbing() {
    await pipeline(readStream, transform!, res)
  }
  await plumbing().catch(err => {
    logger.error('IMG CACHE PIPELINE ERROR 1', {
      filePath,
      cachedImagePath,
      err,
    })
    res.end()
  })
}
