'use strict';

const chokidar = require('chokidar');
const fsp = require('fs/promises');
const path = require('path');

const C = require('./constants');
const albumObjUtils = require('./util/albumObj');
const batchUtils = require('./util/batch');
const cacheUtils = require('./util/cache');
const fileObj = require('./util/fileObj');
const fileTypes = require('./util/fileTypes');
const fileUtils = require('./util/file');
const imageUtils = require('./util/image');

const scanDirectory = async (dirName) => {
  //console.log('SCAN_DIRECTORY:TOP', { dirName });
  // do a depth-first traversal so we can build the directory metadata from the bottom up
  const subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, dirName), { withFileTypes: true })).filter((dirEnt) => dirEnt.isDirectory());
  // recurse into subdirs before continuing
  await batchUtils.promiseAllInBatches(subdirs, (dirEnt) => scanDirectory(path.join(dirName, dirEnt.name)), 10);

  // get the list of supported files in this directory
  const dirFiles = await fileUtils.getSupportedFiles(dirName);

  //console.log('SCAN_DIRECTORY:MID', { dirName, dirFiles });

  // first write the file objs
  await batchUtils.promiseAllInBatches(dirFiles, (fName) => fileObj.getFileObj(dirName, fName), 10);

  // now cache the 400x400 and 1000x1000 size
  await batchUtils.promiseAllInBatches(dirFiles, async (fName) => {
    let absFname = path.join('/albums', dirName, fName);
    if (fileTypes.isRaw(absFname)) {
      // convert raw file
      const cachePath = await imageUtils.jpegFileForRaw(absFname);
      //console.log('PRE-CONVERT RAW', { absFname, cachePath });
      absFname = cachePath;
    }
    // resize the file to common sizes
    await imageUtils.preResize(absFname);
  }, 10);

  // write the standard album obj
  const albumObj = await albumObjUtils.getAlbumObj(dirName);

  // write the extended album obj
  await albumObjUtils.getExtendedAlbumObj(albumObj);
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
      if (fileTypes.isSupportedImageFile(evtPath)) {
        await cacheUtils.cleanUpCacheFor(albumFilePath);
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
