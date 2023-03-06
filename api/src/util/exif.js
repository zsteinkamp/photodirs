'use strict';

const exifReader = require('exifreader');
const path = require('path');

const C = require('../constants');
const fileTypes = require('./fileTypes');

const exifUtils = module.exports = {
  /*
   * Convenience method to load the exif reader and return the Detail props.
   */
  getExifForFile: async (reqPath) => {
    const exifObj = await exifUtils.getExifReaderForFile(reqPath);
    return exifUtils.getExifDetailProps(exifObj);
  },

  /*
   * Return an `exifReader` object for a given file, or empty object.
   */
  getExifReaderForFile: async (reqPath) => {
    const ret = {};

    const filePath = path.join(C.ALBUMS_ROOT, reqPath);
    //console.log('GET_EXIF_FOR_FILE', { filePath });
    if (!(fileTypes.isJpeg(filePath) || fileTypes.isHeif(filePath) || fileTypes.isRaw(filePath))) {
      return ret;
    }

    return await exifReader.load(filePath);
  },

  /*
   * Given an `exifReader` object, return the properties that will be shown in the exif panel.
   */
  getExifDetailProps: (exif) => {
    const ret = {};
    for (const prop of C.EXIF_DETAIL_PROPERTIES) {
      if (exif[prop]) {
        ret[prop] = exif[prop] ? exif[prop].description : null;
      }
    }
    return ret;
  },

  /*
   * Get exif title
   */
  getExifTitle: (exif) => {
    return exif[C.EXIF_TITLE_PROPERTY] ? exif[C.EXIF_TITLE_PROPERTY].description : null;
  },

  /*
   * Get exif description
   */
  getExifDescription: (exif) => {
    return exif[C.EXIF_DESCRIPTION_PROPERTY] ? exif[C.EXIF_DESCRIPTION_PROPERTY].description : null;
  }
};
