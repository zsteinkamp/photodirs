'use strict';

const exifReader = require('exifreader');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const { pipeline } = require('stream/promises');

const C = require('./constants');

const utils = module.exports = {
  getSharpTransform: (filePath, resizeOptions) => {
    return {
      jpg: sharp().jpeg().rotate().resize(resizeOptions),
      gif: sharp().resize(resizeOptions),
      png: sharp().resize(resizeOptions)
    }[utils.getOutputTypeForFile(filePath)];
  },

  // lets us clean up some big IFs
  getOutputTypeForFile: (filePath) => {
    if (utils.isGif(filePath)) {
      return 'gif';
    } else if (utils.isPng(filePath)) {
      return 'png';
    }
    return 'jpg';
  },
  // Cache images in increments of 200px to avoid disk bloat.
  getCachedImageSizes: (resizeOptions) => {
    const cacheWidth = 200 * Math.ceil(resizeOptions.width / 200);
    const cacheHeight = 200 * Math.ceil(resizeOptions.height / 200);
    return [cacheWidth, cacheHeight];
  },
  getCachedImagePath: async (filePath, resizeOptions) => {
    // first look for cached file that is close to the size we want
    const [cacheWidth, cacheHeight] = utils.getCachedImageSizes(resizeOptions);

    const cachePath = utils.makeCachePath(filePath, cacheWidth, cacheHeight);

    if (!(await utils.fileExists(cachePath))) {
      // now cache the intermediate size
      await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });
      const readStream = fs.createReadStream(filePath);
      // when we cache the intermediate size, use `sharp.fit.outside` to scale to the short side to facilitate cropping ()
      const transform = utils.getSharpTransform(filePath, { height: cacheHeight, width: cacheWidth, fit: sharp.fit.outside });
      const outStream = fs.createWriteStream(cachePath);
      await pipeline(readStream, transform, outStream);
    }
    return cachePath;
  },
  jpegFileForRaw: async (filePath) => {
    const cachePath = path.join(C.CACHE_ROOT, filePath + '.jpg');
    if (await utils.fileExists(cachePath)) {
      // return existing jpg
      return cachePath;
    }

    // need to generate jpeg
    await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });
    const tiffPipe = utils.rawToTiffPipe(filePath);
    const outStream = fs.createWriteStream(cachePath);
    await pipeline(tiffPipe, sharp().rotate().jpeg(), outStream);
    return cachePath;
  },
  /*
   * Return the cache path for a given file and size
   */
  makeCachePath: (filePath, height, width) => {
    if (!filePath.startsWith(C.CACHE_ROOT)) {
      // if this was a raw conversion, the filePath with already have the CACHE_ROOT
      filePath = path.join(C.CACHE_ROOT, filePath);
    }
    return `${filePath}^${width}x${height}.${utils.getOutputTypeForFile(filePath)}`;
  },
  /*
   * Read raw files and return a pipe of TIFF
   */
  rawToTiffPipe: (filePath) => {
    // -T == TIFF output
    // -w == camera white balance
    // -c == output to STDOUT
    return spawn('/usr/bin/dcraw', ['-T', '-w', '-c', filePath],
      { stdio: ['ignore', 'pipe', process.stderr] }).stdout;
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
   * Merge metadata into an object
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
    return !!filePath.match(/(crw|cr2|dng)$/i);
  },
  /*
   * Return whether a given file or directory exists and is readable.
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
