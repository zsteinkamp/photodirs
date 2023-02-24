'use strict';

const chokidar = require('chokidar');
const fsp = require('fs/promises');
const path = require('path');

const utils = require('./utils');
const C = require('./constants');

const scanDirectory = async (dirName) => {
  // do a depth-first traversal so we can build the directory metadata from the bottom up
  const subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, dirName), { withFileTypes: true })).filter((dirEnt) => dirEnt.isDirectory());
  for (const dirEnt of subdirs) {
    await scanDirectory(path.join(dirName, dirEnt.name));
  }
  // get the list of supported files in this directory
  const dirFiles = await utils.getSupportedFiles(dirName);

  // first write the file objs
  for (const fName of dirFiles) {
    // this method will also write out the result in cache
    await utils.getFileObj(dirName, fName);
  }

  // write the standard album obj
  const albumObj = await utils.getAlbumObj(dirName);

  // write the extended album obj
  await utils.getExtendedAlbumObj(albumObj);
  //console.log('checked/wrote metadatas in', dirName);
};

/*
 * Set up album directory watcher. Currently pre-generates jpegs from raw files.
 */
const watch = () => {
  const chokidarDebounce = {};
  const watcher = chokidar.watch(C.ALBUMS_ROOT, { ignoreInitial: true }).on('all', (event, evtPath) => {
    console.log('WATCH', { event, evtPath });
    if (chokidarDebounce[evtPath]) {
      clearTimeout(chokidarDebounce[evtPath]);
    }
    chokidarDebounce[evtPath] = setTimeout(async (event, evtPath) => {
      const albumPath = evtPath.substr(C.ALBUMS_ROOT.length);
      if (event === 'unlinkDir') {
        // directory removed -- so just nuke it in cache then rebuild the parent
        await fsp.rm(path.join(C.CACHE_ROOT, 'albums', albumPath), { recursive: true, force: true });
        // write out album metadata for the parent dir
        const albumObj = await utils.getAlbumObj(path.dirname(albumPath));
        await utils.getExtendedAlbumObj(albumObj);
      } else if (event === 'unlink') {
        if (utils.isSupportedImageFile(evtPath)) {
          // make sure the cache file still exists (may be deleted already if the dir was removed)
          if (!(await utils.fileExists(path.join(C.CACHE_ROOT, 'albums', albumPath)))) {
            console.log('Ignoring ... cache file already removed');
            return;
          }
          // clean up cache files and resizers
          await utils.cleanUpCacheFor(albumPath);
          // update album metadata
          const albumObj = await utils.getAlbumObj(path.dirname(albumPath));
          // write the extended album obj
          await utils.getExtendedAlbumObj(albumObj);
        }
      } else if (event === 'add' || event === 'change') {
        if (utils.isSupportedImageFile(evtPath)) {
          // update file metadata
          await utils.getFileObj(path.dirname(albumPath), path.basename(albumPath));
          console.log('UPDATE METADATA FOR', { evtPath });

          // update album metadata
          const albumObj = await utils.getAlbumObj(path.dirname(albumPath));
          // write the extended album obj
          await utils.getExtendedAlbumObj(albumObj);

          if (utils.isRaw(evtPath)) {
            // convert raw file
            const cachePath = await utils.jpegFileForRaw(evtPath);
            console.log('PRE-CONVERT RAW', { evtPath, cachePath });
            evtPath = cachePath;
          }

          // now cache the 400x400 and 1000x1000 size
          const resized400Path = await utils.getCachedImagePath(evtPath, { height: 400, width: 400 });
          const resized1000Path = await utils.getCachedImagePath(evtPath, { height: 1000, width: 1000 });
          console.log('RESIZED', { evtPath, resized400Path, resized1000Path });
        }
      }
      delete chokidarDebounce[evtPath];
    }, 1000, event, evtPath); // last args are passed as args to callback
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
