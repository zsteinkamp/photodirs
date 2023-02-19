'use strict';

// requires
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

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

  // merge meta with album object
  await utils.fetchAndMergeMeta(album, dirName);

  if (!album.thumbnail) {
    album.thumbnail = null; // TODO: pick the first image
  }
  return album;
};

const getFileObj = async (fileName, albumPath) => {
  const uriAlbumPath = albumPath.split('/').map(encodeURIComponent).join('/');
  const uriFileName = encodeURIComponent(fileName);
  return {
    type: C.TYPE_PHOTO,
    name: fileName,
    path: path.join('/', uriAlbumPath, uriFileName),
    photoPath: path.join(C.PHOTO_URL_BASE, uriAlbumPath, uriFileName),
    apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriAlbumPath, uriFileName)
  };
};

const apiGetAlbum = async (albumPath) => {
  const result = await getAlbumObj(albumPath);
  result.albums = [];
  result.files = [];

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

  // TODO: pagination
  await dirs.forEach(async (dir) => {
    const album = await getAlbumObj(path.join('/', dir.name));
    result.albums.push(album);
  });

  // TODO: decide if this should be a separate API call because paginating two lists feels yucky
  files.forEach(async (file) => {
    const fileObj = await getFileObj(file.name, albumPath);
    result.files.push(fileObj);
  });

  return [200, result];
};

const apiGetFile = async (reqPath) => {
  const albumPath = path.dirname(reqPath);
  const result = await getFileObj(path.basename(reqPath), albumPath);
  // add parent album to the payload
  result.album = await getAlbumObj(albumPath);

  result.exif = await utils.getExifForFile(reqPath);

  return [200, result];
};

const handleImage = async (filePath, size, crop, res) => {
  let width = 1600;
  let height = 1600;

  if (typeof size === 'string') {
    if (size === 'orig') {
      // return original file
      return fs.createReadStream(filePath).pipe(res);
    }

    // user provided size
    const matches = size.match(/^(?<width>\d+)x(?<height>\d+)$/);
    if (matches) {
      width = Math.max(Math.min(parseInt(matches.groups.width), C.MAX_DIMENSION), C.MIN_DIMENSION);
      height = Math.max(Math.min(parseInt(matches.groups.height), C.MAX_DIMENSION), C.MIN_DIMENSION);
    }
  }

  crop = (typeof crop !== 'undefined');

  const resizeOptions = {
    width: width,
    height: height,
    fit: crop ? sharp.fit.cover : sharp.fit.inside
  };

  if (utils.isRaw(filePath)) {
    // RAW handling -- cache JPEG conversion and return JPEG filename
    filePath = await utils.jpegFileForRaw(filePath);
  }

  const readStream = fs.createReadStream(filePath);

  if (!width && !height) {
    // return the original
    return readStream.pipe(res);
  }

  let transform;

  if (utils.isJpeg(filePath) || utils.isHeif(filePath)) {
    transform = sharp().jpeg().rotate().resize(resizeOptions);
    res.type('image/jpg');
  } else if (utils.isGif(filePath)) {
    transform = sharp().resize(resizeOptions);
    res.type('image/gif');
  } else if (utils.isPng(filePath)) {
    transform = sharp().resize(resizeOptions);
    res.type('image/png');
  }
  return readStream.pipe(transform).pipe(res);
};

module.exports = {
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
  photoGet: async (reqPath, size, crop, res) => {
    const filePath = path.join(C.ALBUMS_ROOT, reqPath);
    if (!(await utils.fileExists(filePath))) {
      return [404, { error: 'directory or file not found' }];
    }

    // file exists so convert/resize/send it
    handleImage(filePath, size, crop, res);
  }
};
