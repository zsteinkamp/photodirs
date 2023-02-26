'use strict';

const chokidar = require('chokidar');
const fsp = require('fs/promises');
const path = require('path');

const utils = require('./utils');
const C = require('./constants');

const scanDirectory = async (dirName) => {
  //console.log('SCAN_DIRECTORY:TOP', { dirName });
  // do a depth-first traversal so we can build the directory metadata from the bottom up
  const subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, dirName), { withFileTypes: true })).filter((dirEnt) => dirEnt.isDirectory());
  // recurse into subdirs before continuing
  await utils.promiseAllInBatches(subdirs, (dirEnt) => scanDirectory(path.join(dirName, dirEnt.name)), 10);

  // get the list of supported files in this directory
  const dirFiles = await utils.getSupportedFiles(dirName);

  //console.log('SCAN_DIRECTORY:MID', { dirName, dirFiles });

  // first write the file objs
  await utils.promiseAllInBatches(dirFiles, (fName) => utils.getFileObj(dirName, fName), 10);

  // now cache the 400x400 and 1000x1000 size
  await utils.promiseAllInBatches(dirFiles, async (fName) => {
    let absFname = path.join('/albums', dirName, fName);
    if (utils.isRaw(absFname)) {
      // convert raw file
      const cachePath = await utils.jpegFileForRaw(absFname);
      console.log('PRE-CONVERT RAW', { absFname, cachePath });
      absFname = cachePath;
    }
    await utils.preResize(absFname);
  }, 10);

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
  const watcher = chokidar.watch(C.ALBUMS_ROOT, { usePolling: true, interval: 1000, awaitWriteFinish: true, ignoreInitial: true }).on('all', async (event, evtPath) => {
    console.log('WATCHER ACTIVITY', { event, evtPath });

    // clean up cache on directory and file deletions
    if (event === 'unlinkDir') {
      // directory removed -- so just nuke it in cache then rebuild the parent
      const cachePath = path.join(C.CACHE_ROOT, evtPath);
      console.log('UNLINK_DIR', { cachePath });
      await fsp.rm(cachePath, { recursive: true, force: true });
      // also remove parent album jsons
      await fsp.rm(path.join(path.dirname(cachePath), 'album.json'), { force: true });
      await fsp.rm(path.join(path.dirname(cachePath), 'album.extended.json'), { force: true });
    } else if (event === 'unlink') {
      const albumFilePath = evtPath.substr(C.ALBUMS_ROOT.length);
      if (utils.isSupportedImageFile(evtPath)) {
        await utils.cleanUpCacheFor(albumFilePath);
      }
    }

    if (chokidarDebounce) {
      clearTimeout(chokidarDebounce);
    }
    chokidarDebounce = setTimeout(async () => {
      await scanDirectory('/');
      console.log('SCAN COMPLETE');
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
    console.log('STARTING UP ... INITIAL SCAN');
    await scanDirectory('/');
    console.log('SCAN COMPLETE');
  }
};
