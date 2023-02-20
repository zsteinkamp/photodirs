'use strict';

// requires
const fsp = require('fs/promises');
const path = require('path');

const C = require('./constants');
const utils = require('./utils');

const getFileObj = async (fileName, albumPath, options) => {
  const uriAlbumPath = albumPath.split('/').map(encodeURIComponent).join('/');
  const uriFileName = encodeURIComponent(fileName);
  const retObj = {
    type: C.TYPE_PHOTO,
    title: fileName,
    path: path.join('/', uriAlbumPath, uriFileName),
    photoPath: path.join(C.PHOTO_URL_BASE, uriAlbumPath, uriFileName),
    apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriAlbumPath, uriFileName)
  };
  if (options.breadcrumb) {
    retObj.breadcrumb = await utils.getBreadcrumbForPath(albumPath);
  }
  return retObj;
};

const getAlbumPayload = async (albumPath) => {
  const result = await utils.getAlbumObj(albumPath);
  const dirs = [];
  const files = [];
  (await fsp.readdir(path.join(C.ALBUMS_ROOT, albumPath), { withFileTypes: true })).forEach((dirEnt) => {
    if (dirEnt.isDirectory()) {
      dirs.push(dirEnt);
    } else if (dirEnt.isFile()) {
      if (utils.isSupportedImageFile(dirEnt.name)) {
        files.push(dirEnt);
      }
    }
  });

  result.breadcrumb = await utils.getBreadcrumbForPath(albumPath);

  // TODO: Pagination / caching this metadata
  const albumPromises = dirs.map((dir) => utils.getAlbumObj(path.join('/', albumPath, dir.name), { thumbnail: true }));
  const albumResult = await Promise.all(albumPromises);
  result.albums = albumResult;

  // TODO: metadata caching and/or pagination
  const filePromises = files.map((file) => getFileObj(file.name, albumPath, { breadcrumb: false }));
  const fileResult = await Promise.all(filePromises);
  result.files = fileResult;

  return result;
};

const apiGetAlbum = async (albumPath) => {
  return [200, await getAlbumPayload(albumPath)];
};

const apiGetFile = async (reqPath) => {
  const albumPath = path.dirname(reqPath);
  const result = await getFileObj(path.basename(reqPath), albumPath, { breadcrumb: true });
  // Add parent album to the payload
  result.album = await getAlbumPayload(albumPath);

  result.exif = await utils.getExifForFile(reqPath);

  return [200, result];
};

module.exports = {
  apiGetFile,
  apiGetAlbum
};
