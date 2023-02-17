'use strict';

// requires
const fsp = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');

// constants
const ALBUMS_ROOT = '/albums';
const API_BASE = '/api';
const PHOTO_URL_BASE = '/photo';

/*
 * Fetch metadata from `album.yml` file in a given path.
 */
const getAlbumMeta = async (albumPath) => {
  const metaPath = path.join(ALBUMS_ROOT, albumPath, 'album.yml');

  let fileContents;
  try {
    fileContents = await fsp.readFile(metaPath, 'utf8');
  } catch {
    // no meta file
    return {};
  }
  const meta = yaml.load(fileContents);
  if (meta.apiPath) {
    throw new Error(`Metadata file at ${metaPath} cannot contain a property called 'apiPath'.`);
  }
  return meta;
};

/*
 * Return whether a given directory entry is a supported type of image.
 * TODO: do more than look at extension
 */
const isSupportedImageFile = (filePath) => {
  return !!filePath.match(/(jpeg|jpg|crw|cr2|dng)$/i);
};

const apiGetForAlbum = async (albumPath) => {
  const result = {
    albums: [],
    files: []
  };

  if (albumPath === '/') {
    result.title = 'Root Album';
  }

  // get meta for the current albumPath
  Object.assign(result, getAlbumMeta(albumPath));

  const dirs = [];
  const files = [];
  (await fsp.readdir(path.join(ALBUMS_ROOT, albumPath), { withFileTypes: true })).forEach((dirEnt) => {
    if (dirEnt.isDirectory()) {
      dirs.push(dirEnt);
    } else if (dirEnt.isFile()) {
      if (isSupportedImageFile(dirEnt.name)) {
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
      apiPath: path.join(API_BASE, ALBUMS_ROOT, encodeURIComponent(dir.name)),
      description: null
    };

    // merge meta with album object
    Object.assign(album, getAlbumMeta(dir.name));

    if (!album.thumbnail) {
      album.thumbnail = null; // TODO: method to select a thumbnail
    }

    result.albums.push(album);
  });

  // TODO: decide if this should be a separate API call because paginating two lists feels yucky
  files.forEach((file) => {
    const photoPath = path.join(PHOTO_URL_BASE, albumPath, file.name);
    result.files.push({
      name: file.name,
      photoPath: photoPath,
      apiPath: path.join(API_BASE, ALBUMS_ROOT, albumPath, encodeURIComponent(file.name))
    });
  });

  return [result, 200];
};

const apiGetForFile = async (filePath) => {
  return ['a file!', 200];
};

module.exports = {
  apiGetForPath: async (reqPath) => {
    const filePath = path.join(ALBUMS_ROOT, reqPath);
    try {
      await fsp.access(filePath);
    } catch {
      return [{ error: 'directory or file not found' }, 404];
    }

    if ((await fsp.stat(filePath)).isDirectory()) {
      return apiGetForAlbum(reqPath);
    }
    return apiGetForFile(reqPath);
  }
};
