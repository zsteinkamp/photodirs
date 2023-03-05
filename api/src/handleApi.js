'use strict';

// requires
const path = require('path');

const albumObjUtils = require('./util/albumObj');
const fileObjUtils = require('./util/fileObj');
const imageUtils = require('./util/image');

const apiGetAlbum = async (albumPath) => {
  const albumObj = await albumObjUtils.getAlbumObj(albumPath);
  const extAlbumObj = await albumObjUtils.getExtendedAlbumObj(albumObj);
  return [200, extAlbumObj];
};

const apiGetFile = async (reqPath) => {
  // get the fileObj
  const fileObj = await fileObjUtils.getFileObj(path.dirname(reqPath), path.basename(reqPath));

  // add album to fileObj
  const albumObj = await albumObjUtils.getAlbumObj(fileObj.albumPath);
  fileObj.album = await albumObjUtils.getExtendedAlbumObj(albumObj);
  fileObj.exif = await imageUtils.getExifForFile(fileObj.path);

  // add breadcrumb
  fileObj.breadcrumb = await albumObjUtils.getBreadcrumbForPath(fileObj.albumPath);

  return [200, fileObj];
};

module.exports = {
  apiGetFile,
  apiGetAlbum
};
