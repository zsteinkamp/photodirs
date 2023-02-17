'use strict';

// requires
const dcraw = require('dcraw');
const exifReader = require('exif-reader');
const fsp = require('fs/promises');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Duplex } = require('stream');

const C = require('./constants');
const utils = require('./utils');

const apiGetAlbum = async (albumPath) => {
  const result = {
    albums: [],
    files: []
  };

  if (albumPath === '/') {
    result.title = 'Root Album';
  }

  const uriAlbumPath = albumPath.split('/').map(encodeURIComponent).join('/');

  // get meta for the current albumPath
  Object.assign(result, utils.getAlbumMeta(albumPath));

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
  dirs.forEach((dir) => {
    let albumDate = new Date();
    if (dir.name.match(/^\d{4}-\d{2}-\d{2}/)) {
      albumDate = new Date(dir.name.substr(0, 10));
    }
    // TODO: other methods of inferring date? - dir mtime, oldest file, newest file
    const album = {
      title: dir.name,
      date: albumDate.toISOString(),
      apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, encodeURIComponent(dir.name)),
      description: null
    };

    // merge meta with album object
    Object.assign(album, utils.getAlbumMeta(dir.name));

    if (!album.thumbnail) {
      album.thumbnail = null; // TODO: method to select a thumbnail
    }

    result.albums.push(album);
  });

  // TODO: decide if this should be a separate API call because paginating two lists feels yucky
  files.forEach((file) => {
    const uriFileName = encodeURIComponent(file.name);
    result.files.push({
      name: file.name,
      photoPath: path.join(C.PHOTO_URL_BASE, uriAlbumPath, uriFileName),
      apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriAlbumPath, uriFileName)
    });
  });

  return [200, result];
};

const apiGetFile = async (reqPath) => {
  const filePath = path.join(C.ALBUMS_ROOT, reqPath);

  const exif = {};

  if (!utils.isRaw(filePath)) {
    const imgMeta = await sharp(filePath).metadata();
    const imgExif = exifReader(imgMeta.exif);
    exif.image = imgExif.image;
  }

  const uriReqPath = reqPath.split('/').map(encodeURIComponent).join('/');

  const result = {
    exif: exif,
    photoPath: path.join(C.PHOTO_URL_BASE, uriReqPath)
  };

  return [200, result];
};

const handleImage = async (filePath, size, fit, res) => {
  let width = null;
  let height = null;

  if (typeof size === 'string') {
    const matches = size.match(/^(?<width>\d+)x(?<height>\d+)$/);

    width = parseInt(matches.groups.width);
    height = parseInt(matches.groups.height);
  }

  const resizeOptions = {
    width: width,
    height: height,
    fit: fit === 'cover' ? sharp.fit.cover : sharp.fit.inside
  };

  // default -- overridden if RAW
  let readStream = fs.createReadStream(filePath);

  if (utils.isRaw(filePath)) {
    // RAW handling
    const rawBuf = await fsp.readFile(filePath);
    // vvvv get raw metadata
    // dcraw(rawBuf, { verbose: true, identify: true });
    const tiffBuf = dcraw(rawBuf, { exportAsTIFF: true, useExportMode: true });

    const jpegBuf = await sharp(tiffBuf).jpeg().rotate().resize(resizeOptions).toBuffer();

    // convert buffer to stream
    readStream = new Duplex();
    readStream.push(jpegBuf);
    readStream.push(null);
  }

  if (!width && !height) {
    // return the original
    return readStream.pipe(res);
  }

  const transform = sharp().rotate().resize(resizeOptions);

  res.type('image/jpg');
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
  photoGet: async (reqPath, size, fit, res) => {
    const filePath = path.join(C.ALBUMS_ROOT, reqPath);
    if (!(await utils.fileExists(filePath))) {
      return [404, { error: 'directory or file not found' }];
    }

    // file exists so convert/resize/send it
    handleImage(filePath, size, fit, res);
  }
};
