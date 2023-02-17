'use strict';

const fsp = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');
const C = require('./constants');

module.exports = {
  /*
   * Fetch metadata from `album.yml` file in a given path.
   */
  getAlbumMeta: async (albumPath) => {
    const metaPath = path.join(C.ALBUMS_ROOT, albumPath, 'album.yml');

    let fileContents;
    try {
      fileContents = await fsp.readFile(metaPath, 'utf8');
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
    return this.isJpeg(filePath) || this.isRaw(filePath);
  },
  /*
   * Return whether a filename is for a RAW file
   */
  isJpeg: (filePath) => {
    return !!filePath.match(/(jpeg|jpg)$/i);
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
