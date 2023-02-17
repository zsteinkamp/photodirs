'use strict';

// requires
const readdir = require('fs/promises').readdir;
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// constants
const PREFIX = '/albums';

module.exports = {
  getAlbums: async () => {
    const result = [];
    const dirs = (await readdir(PREFIX, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory());

    dirs.forEach((dir) => {
      // if (dir.name.match(/^(\d{4}-\d{2}-\d{2})/)
      const album = {
        title: dir.name,
        date: dir.name,
        path: '/' + dir.name,
        description: null
      };

      // look for metadata file inside directory
      const metaPath = path.join(PREFIX, dir.name, 'album.yml');
      if (fs.existsSync(metaPath)) {
        const fileContents = fs.readFileSync(metaPath, 'utf8');
        const meta = yaml.load(fileContents);
        Object.assign(album, meta);
        album.hasMeta = true;
      }
      result.push(album);
    });
    return [result, 200];
  },

  getOneAlbum: async (path) => {
    return [`hello ${path}`, 200];
  }
};
