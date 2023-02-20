'use strict';

// requires
const fsp = require('fs/promises');
const path = require('path');

const C = require('./constants');
const utils = require('./utils');

const getAlbumObj = async (dirName) => {
  let albumDate = new Date();
  if (dirName.match(/^\d{4}-\d{2}-\d{2}/)) {
    albumDate = new Date(dirName.substr(0, 10));
  }
  // TODO: other methods of inferring date? - dir mtime, oldest file, newest file
  const uriPath = dirName.split('/').map(encodeURIComponent).join('/');
  const album = {
    type: C.TYPE_ALBUM,
    title: dirName.replace(/^\//, ''),
    date: albumDate.toISOString(),
    path: path.join('/', uriPath),
    apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriPath),
    description: null
  };

  // Merge meta with album object
  await utils.fetchAndMergeMeta(album, dirName);

  if (!album.thumbnail) {
    album.thumbnail = null; // TODO: pick the first image
  }
  return album;
};

const getFileObj = async (fileName, albumPath, options) => {
  const uriAlbumPath = albumPath.split('/').map(encodeURIComponent).join('/');
  const uriFileName = encodeURIComponent(fileName);
  const retObj = {
    type: C.TYPE_PHOTO,
    name: fileName,
    path: path.join('/', uriAlbumPath, uriFileName),
    photoPath: path.join(C.PHOTO_URL_BASE, uriAlbumPath, uriFileName),
    apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriAlbumPath, uriFileName)
  };
  if (options.breadcrumb) {
    retObj.breadcrumb = await utils.getBreadcrumbForPath(albumPath);
  }
  return retObj;
};

const apiGetAlbum = async (albumPath) => {
  const result = await getAlbumObj(albumPath);
  result.albums = [];
  result.files = [];
  result.breadcrumb = await utils.getBreadcrumbForPath(albumPath);

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

  // TODO: Pagination / caching this metadata
  await dirs.forEach(async (dir) => {
    const album = await getAlbumObj(path.join('/', dir.name));
    result.albums.push(album);
  });

  // TODO: metadata caching and/or pagination
  files.forEach(async (file) => {
    const fileObj = await getFileObj(file.name, albumPath, { breadcrumb: false });
    result.files.push(fileObj);
  });

  return [200, result];
};

const apiGetFile = async (reqPath) => {
  const albumPath = path.dirname(reqPath);
  const result = await getFileObj(path.basename(reqPath), albumPath, { breadcrumb: true });
  // Add parent album to the payload
  result.album = await getAlbumObj(albumPath);

  result.exif = await utils.getExifForFile(reqPath);

  return [200, result];
};

module.exports = {
  apiGetFile,
  apiGetAlbum
};
