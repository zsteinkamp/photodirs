'use strict';

const path = require('path');
const exiftool = require('node-exiftool');

const C = require('../constants');
const logger = C.LOGGER;
const fileTypes = require('./fileTypes');
const metaUtils = require('./meta');

const exifUtils = module.exports = {
  /*
   * Convenience method to load the exif reader and return the Detail props.
   */
  getExifForFile: async (reqPath) => {
    const exifObj = await exifUtils.getExifObjForFile(reqPath);
    return exifUtils.getExifDetailProps(exifObj);
  },

  /*
   * Return an object filled with EXIF for a given file, or empty object.
   */
  getExifObjForFile: async (reqPath) => {
    let ret = {};

    const filePath = path.join(C.ALBUMS_ROOT, reqPath);

    logger.debug('GET_EXIF_FOR_FILE', { filePath });
    if (!(fileTypes.isSupportedImageFile(filePath))) {
      return ret;
    }

    const ep = new exiftool.ExiftoolProcess('/usr/bin/exiftool');
    await ep.open();
    const meta = await ep.readMetadata(filePath);//, ['-File:all']);
    await ep.close();

    // Sometimes we get an array back
    ret = meta.data[0] || meta.data || {};

    if (meta.error) {
      logger.error('EXIFTOOL ERROR', { err: meta.error });
    }

    const fileYML = filePath + '.yml';
    ret = await metaUtils.fetchAndMergeMeta(ret, fileYML);

    return ret;
  },

  /*
   * Given a full EXIF object, return the properties that will be shown in the exif panel.
   */
  getExifDetailProps: (exif) => {
    const ret = {};
    for (const prop of C.EXIF_DETAIL_PROPERTIES) {
      if (exif[prop]) {
        ret[prop] = exif[prop];
      }
    }
    //console.log('EXIF_DETAIL_PROPS', { exif, ret });
    return ret;
  },

  /*
   * Get exif title
   */
  getExifTitle: (exif) => {
    return exif[C.META_TITLE_PROPERTY] || exif[C.EXIF_TITLE_PROPERTY] || exif[C.EXIF_VIDEO_TITLE_PROPERTY] || null;
  },

  /*
   * Get exif description
   */
  getExifDescription: (exif) => {
    return exif[C.META_DESCRIPTION_PROPERTY] || exif[C.EXIF_DESCRIPTION_PROPERTY] || exif[C.EXIF_VIDEO_DESCRIPTION_PROPERTY] || null;
  }
};
