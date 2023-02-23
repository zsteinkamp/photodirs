'use strict';

// requires
const path = require('path');

const utils = require('./utils');

const apiGetAlbum = async (albumPath) => {
  const albumObj = await utils.getAlbumObj(albumPath);
  const extAlbumObj = await utils.getExtendedAlbumObj(albumObj);
  return [200, extAlbumObj];
};

const apiGetFile = async (reqPath) => {
  const albumPath = path.dirname(reqPath);
  const fileObj = await utils.getFileObj(albumPath, path.basename(reqPath));
  // adds breadcrumb and exif to payload
  const extFileObj = await utils.getExtendedFileObj(fileObj);
  // add album to payload here because the extended album contains the file
  // list, and that creates an N! situation when files are added
  const albumObj = await utils.getAlbumObj(extFileObj.albumPath);
  extFileObj.album = await utils.getExtendedAlbumObj(albumObj);

  return [200, extFileObj];
};

module.exports = {
  apiGetFile,
  apiGetAlbum
};
