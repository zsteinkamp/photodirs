'use strict';

const fsp = require('fs/promises');
const path = require('path');

const C = require('./constants');
const logger = C.LOGGER;
const albumObjUtils = require('./util/albumObj');
const batchUtils = require('./util/batch');
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
  logger.debug('SCAN_DIRECTORY:TOP', { dirName });

  // do a depth-first traversal so we can build the directory metadata from the bottom up
  const subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, dirName), { withFileTypes: true }))
    .filter((dirEnt) => dirEnt.isDirectory() && !dirEnt.name.match(C.MAC_FORBIDDEN_FILES_REGEX));

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
      const jpegPath = await imageUtils.jpegFileForRaw(absFname);
      logger.debug('PRE-CONVERT RAW', { absFname, jpegPath });
      absFname = jpegPath;
    } else if (fileTypes.isVideo(absFname)) {
      transcodingQueue.push({ filePath: absFname });
      const posterPath = await imageUtils.jpegFileForVideo(absFname);
      logger.debug('PRE-GENERATE VIDEO THUMBNAIL', { absFname, posterPath });
      absFname = posterPath;
    }
    // resize the file to common sizes
    await imageUtils.preResize(absFname);
  }, 10);

  // write the standard album obj
  const albumObj = await albumObjUtils.getAlbumObj(dirName);

  // write the extended album obj
  await albumObjUtils.getExtendedAlbumObj(albumObj);
  logger.debug('CHECKED/WROTE METADATAS', { dirName });
};

/*
 * Kick it all off!
 */
(async () => {
  logger.info('STARTING UP ... INITIAL SCAN');

  await scanDirectory('/');
  logger.info('INITIAL SCAN COMPLETE');
  let scanning = false;
  setInterval(async () => {
    if (!scanning) {
      logger.info('>>>>>>>> PERIODIC SCAN STARTING');
      scanning = true;
      await scanDirectory('/');
      scanning = false;
      logger.info('<<<<<<<< PERIODIC SCAN COMPLETE');
    } else {
      logger.info('======== PERIODIC SCAN STILL IN PROGRESS');
    }
  }, 60000);
})();
