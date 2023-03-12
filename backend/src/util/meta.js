'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

const C = require('../constants');
const logger = C.LOGGER;

const metaUtils = module.exports = {
  /*
   * Merge metadata into an object, usually from `album.yml` or `{image_name}.yml` files.
   */
  fetchAndMergeMeta: async (dest, metaPath) => {
    const meta = await metaUtils.getPathMeta(metaPath);
    Object.entries(meta).forEach(([key, val]) => {
      dest[key] = val;
    });
    logger.debug('META', { metaPath, meta, dest });
    return dest;
  },

  /*
   * Fetch metadata from `album.yml` file in a given path.
   */
  getPathMeta: async (metaPath) => {
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
