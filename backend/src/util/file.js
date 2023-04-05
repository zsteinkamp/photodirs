'use strict';

const fsp = require('fs/promises');
const glob = require('glob');
const path = require('path');

const C = require('../constants');
const logger = C.LOGGER;
const fileTypes = require('./fileTypes');

const fileUtils = module.exports = {
  /*
   * promisify glob
   */
  globPromise: async (pattern) => {
    return new Promise((resolve, reject) => {
      glob(pattern, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    });
  },

  /*
   * returns whether the given testFile is older than any of the files in compareArr
   */
  isFileOlderThanAny: async (testFile, compareArr) => {
    if (await fileUtils.fileExists(testFile)) {
      const testFileMtime = (await fsp.stat(testFile)).mtime;
      for (const compareFile of compareArr) {
        if (await fileUtils.fileExists(compareFile)) {
          if (testFileMtime < (await fsp.stat(compareFile)).mtime) {
            return true;
          }
        }
      }
    }
    return false;
  },

  /*
   * return a list of filenames of supported files in the given dirName
   */
  getSupportedFiles: async (dirName) => {
    const albumDir = path.join(C.ALBUMS_ROOT, dirName);
    try {
      const dirFiles = (await fsp.readdir(albumDir, { withFileTypes: true }))
        .filter((dirEnt) => (dirEnt.isFile() && fileTypes.isSupportedImageFile(dirEnt.name)))
        .map((dirEnt) => dirEnt.name);
      logger.debug('getSupportedFiles', { dirName, dirFiles });
      return dirFiles;
    } catch (e) {
      if (e.code === 'PERM' || e.code === 'eaccess') {
        logger.info('Permission Denied', { error: e });
        return [];
      }
      throw e;
    }
  },

  /*
   * Return whether a given file or directory exists and is readable. Not sure
   * why this isn't just in the fs lib as a boolean function not requiring
   * try/catch...
   */
  fileExists: async (filePath) => {
    try {
      await fsp.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
};
