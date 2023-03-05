'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const C = require('../constants');

const metaUtils = module.exports = {
  /*
   * Merge metadata into an object, usually from `album.yml` or `{image_name}.yml` files.
   */
  fetchAndMergeMeta: async (dest, path) => {
    const meta = await metaUtils.getAlbumMeta(path);
    Object.entries(meta).forEach(([key, val]) => {
      dest[key] = val;
    });
    //console.log('META', { path, meta, dest });
    return dest;
  },

  /*
   * Fetch metadata from `album.yml` file in a given path.
   */
  getAlbumMeta: async (albumPath) => {
    const metaPath = path.join(C.ALBUMS_ROOT, albumPath, 'album.yml');

    let fileContents;
    try {
      // TODO: figure out bug when this is async
      fileContents = fs.readFileSync(metaPath);
    } catch {
      // no meta file
      return {};
    }
    const meta = yaml.load(fileContents);
    if (meta.apiPath) {
      throw new Error(`Metadata file at ${metaPath} cannot contain a property called 'apiPath'.`);
    }
    return meta;
  }
};
