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

const self = module.exports = {
  jpegFileForRaw: async (filePath) => {
    const cachePath = path.join(C.CACHE_ROOT, filePath + '.jpg');
    if (await self.fileExists(cachePath)) {
      // return existing jpg
      return cachePath;
    }

    // need to generate jpeg
    await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });
    const tiffPipe = self.rawToTiffPipe(filePath);
    const outStream = fs.createWriteStream(cachePath);
    await pipeline(tiffPipe, sharp().rotate().jpeg(), outStream);
    return cachePath;
  },
  /*
   * Return the cache key for a given file and arguments
   */
  cacheKeyForFile: (filePath, size, crop) => {
    return `${filePath}!${size}!${crop ? 'y' : 'n'}`;
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
    if (!(self.isJpeg(filePath) || self.isHeif(filePath) || self.isRaw(filePath))) {
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
    const meta = await self.getAlbumMeta(path);
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
    return self.isJpeg(filePath) ||
      self.isHeif(filePath) ||
      self.isRaw(filePath) ||
      self.isPng(filePath) ||
      self.isGif(filePath);
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
