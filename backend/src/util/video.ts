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
    '-i',
    filePath,
    '-y',
    '-crf',
    '30',
    '-vf',
    'scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2',
    cachePath,
  ])

  logger.info('TRANSCODING END', { filePath, cachePath })

  return cachePath
}
