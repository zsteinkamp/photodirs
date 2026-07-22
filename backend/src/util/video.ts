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
export const getCachedVideoPath = async (filePath: string): Promise<string> => {
  const cachePath = cachePathForVideo(filePath)
  logger.debug('getCachedVideoPath', { filePath, cachePath })
  if (
    (await fileExists(cachePath)) &&
    !(await isFileOlderThanAny(cachePath, [filePath]))
  ) {
    return cachePath
  }

  logger.info('TRANSCODING START', { filePath, cachePath })

  await mkdir(dirname(cachePath), { recursive: true, mode: 755 })

  await pExecFile('/usr/bin/ffmpeg', [
    '-threads',
    '2',
    '-i',
    filePath,
    '-y',
    '-crf',
    '22',
    '-preset',
    'veryfast',
    // Keep the source resolution — do NOT downscale. The old
    // scale=1920:1080 cap squeezed vertical videos (e.g. 2160x3840) down to
    // ~608x1080, throwing away most of their detail. pad only rounds the
    // dimensions up to even numbers, which H.264 requires.
    '-vf',
    'pad=ceil(iw/2)*2:ceil(ih/2)*2',
    cachePath,
  ])

  logger.info('TRANSCODING END', { filePath, cachePath })

  return cachePath
}
