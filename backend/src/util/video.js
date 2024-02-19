'use strict'

import { mkdir } from 'fs/promises'
import { dirname } from 'path'
import { promisify } from 'node:util'
import { execFile } from 'child_process'
const pExecFile = promisify(execFile)

import { LOGGER } from '../constants.js'
const logger = LOGGER
import { cachePathForVideo } from './cache.js'
import { fileExists, isFileOlderThanAny } from './file.js'

/*
 * Given a path to an original video in the albums path, see if the
 * transcoded one is in the cache, or transcode and cache it. In either case,
 * return the cache path to the transcoded file in the cache.
 */
export const getCachedVideoPath = async filePath => {
  const cachePath = cachePathForVideo(filePath)
  logger.debug('getCachedVideoPath', { filePath, cachePath })
  // if the file at cachepath is NOT older than the filePath, then early return the cachepath
  if (
    (await fileExists(cachePath)) &&
    !(await isFileOlderThanAny(cachePath, [filePath]))
  ) {
    // Return existing jpg
    return cachePath
  }

  logger.info('TRANSCODING START', { filePath, cachePath })

  // Gotta give the cached file a home. Not worth checking for existence...
  await mkdir(dirname(cachePath), { recursive: true, mode: 755 })

  // Need to generate JPEG version by asking ffmpeg to extract a thumbnail from the video into the cache
  await pExecFile('/usr/bin/ffmpeg', [
    '-i',
    filePath, // video file input
    '-y', // overwrite
    '-crf',
    '30', // Decent quality but great on bandwidth
    '-vf',
    'scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2', // max 1080p and even dimensions
    cachePath, // and write to the cachePath
  ])

  logger.info('TRANSCODING END', { filePath, cachePath })

  // Return the path to the cached JPEG
  return cachePath
}
