'use strict';

// requires
const fsp = require('fs/promises');
const path = require('path');

const C = require('./constants');
const handleImage = require('./handleImage');
const { apiGetAlbum, apiGetFile } = require('./handleApi');
const utils = require('./utils');

module.exports = {
  // Handles both album and file metadata requests
  apiGet: async (reqPath) => {
    const filePath = path.join(C.ALBUMS_ROOT, reqPath);
    if (!(await utils.fileExists(filePath))) {
      return [404, { error: 'directory or file not found' }];
    }

    if ((await fsp.stat(filePath)).isDirectory()) {
      return apiGetAlbum(reqPath);
    }
    return apiGetFile(reqPath);
  },
  // For delivering resized/cropped images
  photoGet: async (reqPath, size, crop, res) => {
    const filePath = path.join(C.ALBUMS_ROOT, reqPath);
    if (!(await utils.fileExists(filePath))) {
      return res.status(404).send({ error: 'directory or file not found' });
    }

    // File exists so convert/resize/send it
    handleImage(filePath, size, crop, res);
  }
};
