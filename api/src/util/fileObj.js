'use strict';

const fsp = require('fs/promises');
const path = require('path');

const C = require('../constants');
const cacheUtils = require('./cache');
const fileUtils = require('./file');
const imageUtils = require('./image');

module.exports = {
  /*
   * returns the standard File object
   */
  getFileObj: async (albumPath, fileName) => {
    //console.log('getFileObj', { albumPath, fileName });
    const fileObjMetaFname = cacheUtils.getFileObjMetadataFname(albumPath, fileName);
    //console.log('GET_FILE_OBJ:TOP', { fileObjMetaFname, albumPath, fileName });
    if (await fileUtils.fileExists(fileObjMetaFname)) {
      //console.log('GET_FILE_OBJ:EXISTS', { fileObjMetaFname });
      const metaStat = await fsp.stat(fileObjMetaFname);
      const fileStat = await fsp.stat(path.join(C.ALBUMS_ROOT, albumPath, fileName));
      //console.log('GET_FILE_OBJ:STATS', { ms: metaStat.mtime, fs: fileStat.mtime, useCache: metaStat.mtime >= fileStat.mtime });
      // check to see if the cached metadata file is not older than the album file it relates to
      if (metaStat.mtime >= fileStat.mtime) {
        //console.log('RETURN CACHE', fileObjMetaFname);
        return JSON.parse(await fsp.readFile(fileObjMetaFname, { encoding: 'utf8' }));
      }
    }
    //console.log('GET_FILE_OBJ:NOCACHE', { fileObjMetaFname, albumPath, fileName });
    const uriAlbumPath = albumPath.split('/').map(encodeURIComponent).join('/');
    const uriFileName = encodeURIComponent(fileName);
    const reqPath = path.join('/', albumPath, fileName);
    const fileExif = await imageUtils.getExifForFile(reqPath);
    const fileTitle = fileExif[C.EXIF_TITLE_PROPERTY] || fileName;
    const fileDescription = fileExif[C.EXIF_DESCRIPTION_PROPERTY] || '';
    const fileObj = {
      type: C.TYPE_PHOTO,
      title: fileTitle,
      description: fileDescription,
      fileName: fileName,
      albumPath: albumPath,
      path: reqPath,
      uriPath: path.join('/', uriAlbumPath, uriFileName),
      photoPath: path.join(C.PHOTO_URL_BASE, uriAlbumPath, uriFileName),
      apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriAlbumPath, uriFileName)
    };

    // write out the file for next time
    await fsp.mkdir(path.dirname(fileObjMetaFname), { recursive: true, mode: 755 });
    await fsp.writeFile(fileObjMetaFname, JSON.stringify(fileObj));
    console.info('GET_FILE_OBJ', 'Wrote cache file', fileObjMetaFname);

    return fileObj;
  }
};
