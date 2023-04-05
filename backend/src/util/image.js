'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { pipeline } = require('stream/promises');
const sharp = require('sharp');
const util = require('node:util');
const { spawn } = require('child_process');
const execFile = util.promisify(require('child_process').execFile);

const C = require('../constants');
const logger = C.LOGGER;
const fileTypes = require('./fileTypes');
const fileUtils = require('./file');
const cacheUtils = require('./cache');

const imageUtils = module.exports = {
  /*
   * Locate the cached image closest to what the client is requesting. If it's
   * not found, then create it and return the filename.
   */
  getCachedImagePath: async (filePath, resizeOptions) => {
    logger.debug('GetCachedImagePath', { filePath, resizeOptions });
    // First look for cached file that is close to the size we want
    const [cacheWidth, cacheHeight] = cacheUtils.getCachedImageSizes(resizeOptions);

    const cachePath = cacheUtils.makeResizeCachePath(filePath, cacheWidth, cacheHeight);

    let cacheStat = {};

    try {
      cacheStat = await fsp.stat(cachePath);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        logger.error('CACHESTAT returned error', { e });
      }
    }

    if (typeof cacheStat.size !== 'undefined' && cacheStat.size === 0) {
      logger.warn('Zero length file found. Regenerating.', { cachePath, cacheStat });
    }

    // Generate the file if it doesn't exist or has a zero length.
    // Zero length files can happen due to a bug in the pre-generator
    // that is a TODO.
    if (typeof cacheStat.size === 'undefined' || cacheStat.size === 0) {
      // Now cache the intermediate size
      await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });
      logger.debug('GET_CACHED_IMAGE_PATH', { filePath, cachePath, resizeOptions });
      const readStream = fs.createReadStream(filePath);
      // When we cache the intermediate size, use `sharp.fit.outside` to scale to the short side to facilitate cropping
      const transform = imageUtils.getSharpTransform(filePath, { height: cacheHeight, width: cacheWidth, fit: sharp.fit.outside });
      const outStream = fs.createWriteStream(cachePath);

      async function plumbing() {
        await pipeline(readStream, transform, outStream);
        logger.info('GET_CACHED_IMAGE_PATH:WROTE_FILE', { filePath, cachePath });
      }
      await plumbing().catch(async (err) => {
        logger.error('IMG CACHE PIPELINE ERROR', { filePath, cachePath, err });
        // make sure we don't leave a zero-length file
        await fsp.rm(cachePath, { force: true });
        return null;
      });
    }
    return cachePath;
  },

  /*
   * Returns a Sharp transformer appropriate for the supplied file's type
   */
  getSharpTransform: (filePath, resizeOptions) => {
    const transformer = {
      jpg: sharp().jpeg().rotate().resize(resizeOptions),
      gif: sharp().resize(resizeOptions),
      png: sharp().resize(resizeOptions)
    }[fileTypes.getOutputTypeForFile(filePath)];
    return transformer;
  },

  /*
   * Convert a camera raw image to JPEG, cache it, and return the cache filename.
   * If already cached, then just return the cache filename.
   */
  jpegFileForRaw: async (filePath) => {
    const cachePath = path.join(C.CACHE_ROOT, filePath + '.jpg');
    logger.debug('jpegFileForRaw', { filePath, cachePath });
    if (await fileUtils.fileExists(cachePath)) {
      // Return existing jpg
      return cachePath;
    }

    // Gotta give the cached file a home. Not worth checking for existence...
    await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });

    // Need to generate JPEG version by first extracting a TIFF from the raw
    // file using dcraw and pipelining it through Sharp to get a JPEG.
    const tiffPipe = imageUtils.rawToTiffPipe(filePath);
    const outStream = fs.createWriteStream(cachePath);
    const transform = sharp().rotate().jpeg();

    async function plumbing() {
      await pipeline(tiffPipe, transform, outStream);
      logger.info('JPEG_FILE_FOR_RAW:WROTE_JPG', { filePath, cachePath });
    }
    await plumbing().catch(async (err) => {
      logger.error('JPEG_FILE_FOR_RAW:PIPELINE_ERROR', { err });
      // make sure we don't leave a zero-length file
      await fsp.rm(cachePath, { force: true });
      return null;
    });
    // Return the path to the cached JPEG
    return cachePath;
  },

  /*
   * Create a JPEG thumbnail for a video file, cache it, and return the cache
   * filename.  If already cached, then just return the cache filename.
   */
  jpegFileForVideo: async (filePath) => {
    const cachePath = cacheUtils.cachePathForVideoThumbnail(filePath);
    logger.debug('jpegFileForVideo', { filePath, cachePath });
    if (await fileUtils.fileExists(cachePath) && (!(await fileUtils.isFileOlderThanAny(cachePath, [filePath])))) {
      // Return existing jpg
      return cachePath;
    }

    // Gotta give the cached file a home. Not worth checking for existence...
    await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });

    // Need to generate JPEG version by asking ffmpeg to extract a thumbnail from the video into the cache
    await execFile('/usr/bin/ffmpeg', [
      '-i', filePath, // video file input
      '-y', // overwrite
      '-vf', 'thumbnail=100', // look across 100 frames
      '-frames:v', '1', // and pick one
      cachePath // and write to the cachePath
    ]);

    logger.info('WROTE VIDEO THUMB', { filePath, cachePath });

    // Return the path to the cached JPEG
    return cachePath;
  },

  /*
   * Generate standard resizes
   */
  preResize: async (absFname) => {
    logger.debug('PRE_RESIZE', { absFname });
    // set pre-generate sizes and rules in constants.js
    const preResizeSizes = Object.values(C.SIZE_PRESETS)
      .filter((o) => { return o.pregenerate && (o.size !== 'orig'); })
      .map((o) => {
        return {
          height: ParseInt(o.size.split('x')[0]),
          width:  ParseInt(o.size.split('x')[1])
        };
      });
    return Promise.all(
      preResizeSizes.map((o) => {
        return imageUtils.getCachedImagePath(absFname, { height: o.height, width: o.width }),
      })
    );
  },

  /*
   * Read raw files and return a pipe of TIFF data. This can then be pipelined
   * into our existing stream methodology using Sharp.
   * Uses the venerable dcraw! https://www.dechifro.org/dcraw/
   */
  rawToTiffPipe: (filePath) => {
    // -T == TIFF output
    // -w == camera white balance
    // -c == output to STDOUT
    const dcrawProcess = spawn('/usr/lib/libraw/dcraw_emu', ['-T', '-Z', '-', filePath],
      { stdio: ['ignore', 'pipe', process.stderr] });
    // The `pipe` option above connects STDOUT to a pipe that can then be streamed.
    // This avoids the wasteful overhead of temp files or creating bloated
    // memory buffers to store the entire output.

    // We just want the stdout socket to pipeline from
    return dcrawProcess.stdout;
  }
};
