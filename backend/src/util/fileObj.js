'use strict';

const fsp = require('fs/promises');
const path = require('path');

const C = require('../constants');
const logger = C.LOGGER;
const cacheUtils = require('./cache');
const fileUtils = require('./file');
const fileTypes = require('./fileTypes');
const exifUtils = require('./exif');
const metaUtils = require('./meta');

module.exports = {
  /*
   * returns the standard File object
   */
  getFileObj: async (albumPath, fileName) => {
    logger.debug('getFileObj', { albumPath, fileName });
    const fileObjMetaFname = cacheUtils.getFileObjMetadataFname(albumPath, fileName);
    const filePath = path.join(C.ALBUMS_ROOT, albumPath, fileName);
    logger.debug('GET_FILE_OBJ:TOP', { fileObjMetaFname, filePath });
    if (await fileUtils.fileExists(fileObjMetaFname)) {
      logger.debug('GET_FILE_OBJ:EXISTS', { fileObjMetaFname });
      const metaStat = await fsp.stat(fileObjMetaFname);
      const fileStat = await fsp.stat(filePath);

      let ymlStat = null;
      const ymlFName = filePath + '.yml';

      if (await fileUtils.fileExists(ymlFName)) {
        ymlStat = await fsp.stat(ymlFName);
      }
      const useCache = metaStat.mtime >= fileStat.mtime && (!ymlStat || (metaStat.mtime >= ymlStat.mtime));
      logger.debug('GET_FILE_OBJ:STATS', { ms: metaStat.mtime, fs: fileStat.mtime, ys: ymlStat && ymlStat.mtime, useCache, fileName });
      // check to see if the cached metadata file is not older than the album file it relates to
      if (useCache) {
        logger.debug('RETURN CACHE', { fileObjMetaFname });
        return JSON.parse(await fsp.readFile(fileObjMetaFname, { encoding: 'utf8' }));
      }
    }
    logger.debug('GET_FILE_OBJ:NOCACHE', { fileObjMetaFname, albumPath, fileName });
    const uriAlbumPath = albumPath.split('/').map(encodeURIComponent).join('/');
    const uriFileName = encodeURIComponent(fileName);
    const reqPath = path.join('/', albumPath, fileName);

    // Get exif data
    const exifObj = await exifUtils.getExifObjForFile(reqPath);
    const fileTitle = exifUtils.getExifTitle(exifObj) || fileName;
    const fileDescription = exifUtils.getExifDescription(exifObj) || '';
    const fileExif = exifUtils.getExifDetailProps(exifObj);
    const isVideo = fileTypes.isVideo(fileName);

    // Get YML Meta if there
    const fileYML = filePath + '.yml';
    const fileMeta = await metaUtils.fetchAndMergeMeta({}, fileYML);

    const fileObj = {
      type: isVideo ? C.TYPE_VIDEO : C.TYPE_PHOTO,
      title: fileTitle,
      description: fileDescription,
      fileName: fileName,
      albumPath: albumPath,
      meta: fileMeta,
      path: reqPath,
      uriPath: path.join('/', uriAlbumPath, uriFileName),
      photoPath: path.join(C.PHOTO_URL_BASE, uriAlbumPath, uriFileName),
      apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriAlbumPath, uriFileName),
      exif: fileExif
    };

    if (isVideo) {
      fileObj.videoPath = path.join(C.VIDEO_URL_BASE, uriAlbumPath, uriFileName);
    }

    // write out the file for next time
    await fsp.mkdir(path.dirname(fileObjMetaFname), { recursive: true, mode: 755 });
    await fsp.writeFile(fileObjMetaFname, JSON.stringify(fileObj));
    logger.info('GET_FILE_OBJ - Wrote cache file', { fileObjMetaFname });

    return fileObj;
  }
};
