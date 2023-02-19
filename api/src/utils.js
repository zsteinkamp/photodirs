'use strict';

const exifReader = require('exifreader');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { pipeline } = require('stream/promises');
const sharp = require('sharp');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const C = require('./constants');

const utils = module.exports = {
  /*
   * Returns a Sharp transformer appropriate for the supplied file's type
   */
  getSharpTransform: (filePath, resizeOptions) => {
    return {
      jpg: sharp().jpeg().rotate().resize(resizeOptions),
      gif: sharp().resize(resizeOptions),
      png: sharp().resize(resizeOptions)
    }[utils.getOutputTypeForFile(filePath)];
  },

  /*
   * Returns the extension/type of the file we are going to output
   * Handy for some code here, such as `getSharpTransform`
   */
  getOutputTypeForFile: (filePath) => {
    if (utils.isGif(filePath)) {
      return 'gif';
    } else if (utils.isPng(filePath)) {
      return 'png';
    }
    return 'jpg';
  },
  /*
   * Rather than caching every single size a client requests, cache in
   * increments of 200px. The final output is produced by resizing the cached
   * image the next size bigger than what the client is requesting (or the
   * exact size if that works out!), and is usually very fast. By serving image
   * with good cache-control headers, we can get great performance.
   */
  getCachedImageSizes: (resizeOptions) => {
    const cacheWidth = 200 * Math.ceil(resizeOptions.width / 200);
    const cacheHeight = 200 * Math.ceil(resizeOptions.height / 200);
    return [cacheWidth, cacheHeight];
  },
  /*
   * Locate the cached image closest to what the client is requesting. If it's
   * not found, then create it and return the filename.
   */
  getCachedImagePath: async (filePath, resizeOptions) => {
    // First look for cached file that is close to the size we want
    const [cacheWidth, cacheHeight] = utils.getCachedImageSizes(resizeOptions);

    const cachePath = utils.makeCachePath(filePath, cacheWidth, cacheHeight);

    if (!(await utils.fileExists(cachePath))) {
      // Now cache the intermediate size
      await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });
      const readStream = fs.createReadStream(filePath);
      // When we cache the intermediate size, use `sharp.fit.outside` to scale to the short side to facilitate cropping
      const transform = utils.getSharpTransform(filePath, { height: cacheHeight, width: cacheWidth, fit: sharp.fit.outside });
      const outStream = fs.createWriteStream(cachePath);
      await pipeline(readStream, transform, outStream);
    }
    return cachePath;
  },
  /*
   * Convert a camera raw image to JPEG, cache it, and return the cache filename.
   * If already cached, then just return the cache filename.
   */
  jpegFileForRaw: async (filePath) => {
    const cachePath = path.join(C.CACHE_ROOT, filePath + '.jpg');
    if (await utils.fileExists(cachePath)) {
      // Return existing jpg
      return cachePath;
    }

    // Gotta give the cached file a home. Not worth checking for existence...
    await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });

    // Need to generate JPEG version by first extracting a TIFF from the raw
    // file using dcraw and pipelining it through Sharp to get a JPEG.
    const tiffPipe = utils.rawToTiffPipe(filePath);
    const outStream = fs.createWriteStream(cachePath);
    await pipeline(tiffPipe, sharp().rotate().jpeg(), outStream);

    // Return the path to the cached JPEG
    return cachePath;
  },
  /*
   * Return the cache path for a given file and size
   */
  makeCachePath: (filePath, height, width) => {
    if (!filePath.startsWith(C.CACHE_ROOT)) {
      // If this was a raw conversion, the filePath with already have the
      // CACHE_ROOT, so we need to protect against making it
      // `/cache/cache/...`.
      filePath = path.join(C.CACHE_ROOT, filePath);
    }
    // e.g. /cache/albums/album_hawaii/hawaii.CR2^1200x800.jpg
    return `${filePath}^${width}x${height}.${utils.getOutputTypeForFile(filePath)}`;
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
    const dcrawProcess = spawn('/usr/bin/dcraw', ['-T', '-w', '-c', filePath],
      { stdio: ['ignore', 'pipe', process.stderr] });
    // The `pipe` option above connects STDOUT to a pipe that can then be streamed.
    // This avoids the wasteful overhead of temp files or creating bloated
    // memory buffers to store the entire output.

    // We just want the stdout socket to pipeline from
    return dcrawProcess.stdout;
  },
  /*
   * Pull some EXIF data from supported files
   */
  getExifForFile: async (reqPath) => {
    const ret = {};

    const filePath = path.join(C.ALBUMS_ROOT, reqPath);
    if (!(utils.isJpeg(filePath) || utils.isHeif(filePath) || utils.isRaw(filePath))) {
      return ret;
    }

    const exif = await exifReader.load(filePath);
    for (const prop of C.EXIF_DESCRIPTION_PROPERTIES) {
      if (exif[prop]) {
        ret[prop] = exif[prop] ? exif[prop].description : null;
      }
    }
    return ret;
  },
  /*
   * Merge metadata into an object, usually from `album.yml` or `{image_name}.yml` files.
   */
  fetchAndMergeMeta: async (dest, path) => {
    const meta = await utils.getAlbumMeta(path);
    Object.entries(meta).forEach(([key, val]) => {
      dest[key] = val;
    });
    return dest;
  },
  /*
   * Fetch metadata from `album.yml` file in a given path.
   */
  getAlbumMeta: async (albumPath) => {
    const metaPath = path.join(C.ALBUMS_ROOT, albumPath, 'album.yml');

    let fileContents;
    try {
      // TODO: figure out bug when this is async
      fileContents = fs.readFileSync(metaPath);
    } catch {
      // no meta file
      return {};
    }
    const meta = yaml.load(fileContents);
    if (meta.apiPath) {
      throw new Error(`Metadata file at ${metaPath} cannot contain a property called 'apiPath'.`);
    }
    return meta;
  },
  /*
   * Return whether a given directory entry is a supported type of image.
   * TODO: do more than look at extension
   */
  isSupportedImageFile: (filePath) => {
    return utils.isJpeg(filePath) ||
      utils.isHeif(filePath) ||
      utils.isRaw(filePath) ||
      utils.isPng(filePath) ||
      utils.isGif(filePath);
  },
  /*
   * Return whether a filename is for a JPEG file
   */
  isJpeg: (filePath) => {
    return !!filePath.match(/(jpeg|jpg)$/i);
  },
  /*
   * Return whether a filename is for a HEIC file
   */
  isHeif: (filePath) => {
    return !!filePath.match(/(heif|heic)$/i);
  },
  /*
   * Return whether a filename is for a GIF file
   */
  isGif: (filePath) => {
    return !!filePath.match(/(gif)$/i);
  },
  /*
   * Return whether a filename is for a PNG file
   */
  isPng: (filePath) => {
    return !!filePath.match(/(png)$/i);
  },
  /*
   * Return whether a filename is for a RAW file
   */
  isRaw: (filePath) => {
    return !!filePath.match(/(crw|cr2|dng|arw)$/i);
  },
  /*
   * Return whether a given file or directory exists and is readable. Not sure
   * why this isn't just in the fs lib as a boolean function not requiring
   * try/catch...
   */
  fileExists: async (filePath) => {
    try {
      await fsp.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
};
