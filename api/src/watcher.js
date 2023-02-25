'use strict';

const chokidar = require('chokidar');
const fsp = require('fs/promises');
const path = require('path');

const utils = require('./utils');
const C = require('./constants');

const scanDirectory = async (dirName) => {
  // do a depth-first traversal so we can build the directory metadata from the bottom up
  const subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, dirName), { withFileTypes: true })).filter((dirEnt) => dirEnt.isDirectory());
  // recurse into subdirs before continuing
  await Promise.all(subdirs.map((dirEnt) => scanDirectory(path.join(dirName, dirEnt.name))));

  // get the list of supported files in this directory
  const dirFiles = await utils.getSupportedFiles(dirName);

  // first write the file objs
  await Promise.all(dirFiles.map((fName) => utils.getFileObj(dirName, fName)));

  // now cache the 400x400 and 1000x1000 size
  await Promise.all(dirFiles.map(async (fName) => {
    let absFname = path.join('/albums', dirName, fName);
    if (utils.isRaw(absFname)) {
      // convert raw file
      const cachePath = await utils.jpegFileForRaw(absFname);
      console.log('PRE-CONVERT RAW', { absFname, cachePath });
      absFname = cachePath;
    }
    await utils.preResize(absFname);
  }));

  // write the standard album obj
  const albumObj = await utils.getAlbumObj(dirName);

  // write the extended album obj
  await utils.getExtendedAlbumObj(albumObj);
  console.log('checked/wrote metadatas in', dirName);
};

/*
 * Set up album directory watcher. Wait for 2 seconds of calm after activity to rescan.
 */
const watch = () => {
  let chokidarDebounce = null;
  const watcher = chokidar.watch(C.ALBUMS_ROOT, { ignoreInitial: true }).on('all', (event, evtPath) => {
    console.log('WATCHER ACTIVITY', { event, evtPath });
    if (chokidarDebounce) {
      clearTimeout(chokidarDebounce);
    }
    chokidarDebounce = setTimeout(async () => {
      await scanDirectory('/');
      chokidarDebounce = null;
    }, 2000);
  });
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
