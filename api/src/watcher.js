'use strict';

const chokidar = require('chokidar');
const fsp = require('fs/promises');
const path = require('path');

const utils = require('./utils');
const C = require('./constants');

const scanDirectory = async (dirName) => {
  console.log('TOP', dirName);
  // do a depth-first traversal so we can build the directory metadata from the bottom up
  const subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, dirName), { withFileTypes: true })).filter((dirEnt) => dirEnt.isDirectory());
  for (const dirEnt of subdirs) {
    await scanDirectory(path.join(dirName, dirEnt.name));
  }
  // write the standard album obj
  const albumObj = await utils.getAlbumObj(dirName);
  // write the extended album obj
  await utils.getExtendedAlbumObj(albumObj);

  const dirFiles = (await fsp.readdir(path.join(C.ALBUMS_ROOT, dirName), { withFileTypes: true }))
    .filter((dirEnt) => dirEnt.isFile());
  for (const dirEnt of dirFiles) {
    if (utils.isSupportedImageFile(dirEnt.name)) {
      // this method will also write out the result in cache
      const fileObj = await utils.getFileObj(dirName, dirEnt.name);
      // this method will also write out the result in cache
      await utils.getExtendedFileObj(fileObj);
    }
  };
};

/*
 * Set up album directory watcher. Currently pre-generates jpegs from raw files.
 */
const watch = () => {
  const chokidarDebounce = {};
  const watcher = chokidar.watch(C.ALBUMS_ROOT, { ignoreInitial: true }).on('all', (event, path) => {
    console.log('WATCH', { event, path });
    if (chokidarDebounce[path]) {
      clearTimeout(chokidarDebounce[path]);
    }
    chokidarDebounce[path] = setTimeout(async (event, path) => {
      if (event === 'add' || event === 'change') {
        if (utils.isSupportedImageFile(path)) {
          if (utils.isRaw(path)) {
            // convert raw file
            const cachePath = await utils.jpegFileForRaw(path);
            console.log('PRE-CONVERT RAW', { path, cachePath });
            path = cachePath;
          }

          // now cache the 400x400 and 1000x1000 size
          const resized400Path = await utils.getCachedImagePath(path, { height: 400, width: 400 });
          const resized1000Path = await utils.getCachedImagePath(path, { height: 1000, width: 1000 });
          console.log('RESIZED', { path, resized400Path, resized1000Path });
        }
      }
      delete chokidarDebounce[path];
    }, 1000, event, path); // last args are passed as args to callback
  });
  process.on('SIGINT', () => { console.log('SIGINT'); });
  process.on('SIGQUIT', () => { console.log('SIGQUIT'); });
  process.on('SIGTERM', (sig) => {
    console.log('SIGTERM STOPPING WATCHER', sig);
    watcher.close();
    console.log('WATCHER STOPPed');
  });
};

const watcher = module.exports = {
  start: () => {
    // run initial deep scan
    watcher.deepScan().then(watch);
  },
  deepScan: async () => {
    console.log('DEEP SCAN METHOD');
    await scanDirectory('/');
  }
};
