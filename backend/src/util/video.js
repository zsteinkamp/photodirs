'use strict';

const fsp = require('fs/promises');
const path = require('path');
const util = require('node:util');
const execFile = util.promisify(require('child_process').execFile);

const C = require('../constants');
const logger = C.LOGGER;
const cacheUtils = require('./cache');
const fileUtils = require('./file');

const videoUtils = {
  /*
   * Given a path to an original video in the albums path, see if the
   * transcoded one is in the cache, or transcode and cache it. In either case,
   * return the cache path to the transcoded file in the cache.
   */
  getCachedVideoPath: async (filePath) => {
    const cachePath = cacheUtils.cachePathForVideo(filePath);
    logger.debug('getCachedVideoPath', { filePath, cachePath });
    // if the file at cachepath is NOT older than the filePath, then early return the cachepath
    if (await fileUtils.fileExists(cachePath) && (!(await fileUtils.isFileOlderThanAny(cachePath, [filePath])))) {
      // Return existing jpg
      return cachePath;
    }

    logger.info('TRANSCODING START', { filePath, cachePath });

    // Gotta give the cached file a home. Not worth checking for existence...
    await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });

    // Need to generate JPEG version by asking ffmpeg to extract a thumbnail from the video into the cache
    await execFile('/usr/bin/ffmpeg', [
      '-i', filePath, // video file input
      '-vf', 'scale=w=1920:h=1080:force_original_aspect_ratio=decrease,setsar=1:1', // max 1080p
      cachePath // and write to the cachePath
    ]);

    logger.info('TRANSCODING END', { filePath, cachePath });

    // Return the path to the cached JPEG
    return cachePath;
  }
};

module.exports = videoUtils;
