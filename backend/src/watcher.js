'use strict';

const chokidar = require('chokidar');
const fsp = require('fs/promises');
const path = require('path');

const C = require('./constants');
const logger = C.LOGGER;
const albumObjUtils = require('./util/albumObj');
const batchUtils = require('./util/batch');
const cacheUtils = require('./util/cache');
const fileObj = require('./util/fileObj');
const fileTypes = require('./util/fileTypes');
const fileUtils = require('./util/file');
const imageUtils = require('./util/image');
const videoUtils = require('./util/video');

// Bring up a single-worker queue for video transcoding
const transcodingQueue = require('fastq').promise(transcoder, 1);
async function transcoder({ filePath }) {
  return await videoUtils.getCachedVideoPath(filePath);
}

const scanDirectory = async (dirName) => {
  logger.info('SCAN_DIRECTORY:TOP', { dirName });
  // do a depth-first traversal so we can build the directory metadata from the bottom up
  const subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, dirName), { withFileTypes: true })).filter((dirEnt) => dirEnt.isDirectory());
  // recurse into subdirs before continuing
  await batchUtils.promiseAllInBatches(subdirs, (dirEnt) => scanDirectory(path.join(dirName, dirEnt.name)), 10);

  // get the list of supported files in this directory
  const dirFiles = await fileUtils.getSupportedFiles(dirName);

  logger.debug('SCAN_DIRECTORY:MID', { dirName, dirFiles });

  // first write the file objs
  await batchUtils.promiseAllInBatches(dirFiles, (fName) => fileObj.getFileObj(dirName, fName), 10);

  // now cache the 400x400 and 1000x1000 size
  await batchUtils.promiseAllInBatches(dirFiles, async (fName) => {
    let absFname = path.join('/albums', dirName, fName);
    if (fileTypes.isRaw(absFname)) {
      // convert raw file
      const cachePath = await imageUtils.jpegFileForRaw(absFname);
      logger.debug('PRE-CONVERT RAW', { absFname, cachePath });
      absFname = cachePath;
    } else if (fileTypes.isVideo(absFname)) {
      transcodingQueue.push({ filePath: absFname });
      const cachePath = await imageUtils.jpegFileForVideo(absFname);
      logger.debug('PRE-GENERATE VIDEO THUMBNAIL', { absFname, cachePath });
      absFname = cachePath;
    }
    // resize the file to common sizes
    await imageUtils.preResize(absFname);
  }, 10);

  // write the standard album obj
  const albumObj = await albumObjUtils.getAlbumObj(dirName);

  // write the extended album obj
  await albumObjUtils.getExtendedAlbumObj(albumObj);
  logger.info('CHECKED/WROTE METADATAS', { dirName });
};

/*
 * Set up album directory watcher. Wait for 2 seconds of calm after activity to rescan.
 */
const watch = () => {
  logger.info(`STARTING WATCHER on ${C.ALBUMS_ROOT}`);
  // Chokidar tells us multiple times when things happen. The strategy here is
  // to wait for a lull in any chokidar activity, then just trigger a full
  // scan. It is quite fast ripping through areas where nothing changed, so I
  // decided it wasn't worth the hassle to write a more elaborate dependency
  // identifier.
  // TODO: Next level of performance would be to identify uniqe paths in the
  // burst of chokidar activity, then launch a scanner into the deepest (leaf
  // node) paths
  let chokidarDebounce = null;
  const watcher = chokidar.watch(C.ALBUMS_ROOT, { usePolling: true, interval: 1000, awaitWriteFinish: true, ignoreInitial: true }).on('all', async (event, evtPath) => {
    logger.info('WATCHER ACTIVITY', { event, evtPath });

    // clean up cache on directory and file deletions
    if (event === 'unlinkDir') {
      // directory removed -- so just nuke it in cache then rebuild the parent
      const cachePath = path.join(C.CACHE_ROOT, evtPath);
      logger.info('UNLINK_DIR', { cachePath });
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

    // debounce chokidar events by 2.0 seconds. See big comment above for explanation of strategy
    if (chokidarDebounce) {
      clearTimeout(chokidarDebounce);
    }
    chokidarDebounce = setTimeout(async () => {
      await scanDirectory('/');
      logger.info('SCAN COMPLETE');
      chokidarDebounce = null;
    }, 2000);
  });
  process.on('SIGTERM', (sig) => {
    logger.info('SIGTERM STOPPING WATCHER', sig);
    watcher.close();
    logger.info('WATCHER STOPPed');
  });
};

/*
 * Kick it all off!
 */
(async () => {
  logger.info('STARTING UP ... INITIAL SCAN');
  await scanDirectory('/');
  logger.info('INITIAL SCAN COMPLETE');
  watch();
})();
