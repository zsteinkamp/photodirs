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
    // Cap frame rate at 30 (never upsampled). Native-4K H.264 at 60fps is
    // Level 5.2, which many browser/GPU decoders won't hardware-decode -> they
    // fall back to software and stutter. 30fps keeps us at Level 5.1 and halves
    // the decode load.
    '-fpsmax',
    '30',
    // Cap the bitrate for streaming. CRF alone put native-4K clips at ~145Mbps,
    // too high for smooth browser playback; the VBV cap keeps peaks streamable
    // while CRF still governs quality below the ceiling.
    '-maxrate',
    '25M',
    '-bufsize',
    '50M',
    // Keep the source resolution — do NOT downscale. The old
    // scale=1920:1080 cap squeezed vertical videos (e.g. 2160x3840) down to
    // ~608x1080, throwing away most of their detail. pad only rounds the
    // dimensions up to even numbers, which H.264 requires.
    '-vf',
    'pad=ceil(iw/2)*2:ceil(ih/2)*2',
    // Move the moov atom to the front so the browser can start playing before
    // the whole file downloads (progressive streaming).
    '-movflags',
    '+faststart',
    cachePath,
  ])

  logger.info('TRANSCODING END', { filePath, cachePath })

  return cachePath
}
