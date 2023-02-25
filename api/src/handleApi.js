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
  // get the fileObj
  const fileObj = await utils.getFileObj(path.dirname(reqPath), path.basename(reqPath));

  // add album to fileObj
  const albumObj = await utils.getAlbumObj(fileObj.albumPath);
  fileObj.album = await utils.getExtendedAlbumObj(albumObj);
  fileObj.exif = await utils.getExifForFile(fileObj.path);

  // add breadcrumb
  fileObj.breadcrumb = await utils.getBreadcrumbForPath(fileObj.albumPath);

  return [200, fileObj];
};

module.exports = {
  apiGetFile,
  apiGetAlbum
};
