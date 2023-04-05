'use strict';

const fsp = require('fs/promises');
const path = require('path');

const C = require('../constants');
const logger = C.LOGGER;
const batchUtils = require('./batch');
const cache = require('./cache');
const exifUtils = require('./exif');
const fileObj = require('./fileObj');
const fileTypes = require('./fileTypes');
const fileUtils = require('./file');
const metaUtils = require('./meta');

const albumObjUtils = module.exports = {
  /*
   * Given a reqPath (i.e. the path root is the album root), return an array of
   * breadcrumb nodes, from the root to the current node.  Nodes have a title
   * and path.
   */
  getBreadcrumbForPath: async (reqPath) => {
    const pushPaths = [];
    let pathParts = [];
    if (reqPath === '/') {
      pathParts = [''];
    } else {
      pathParts = reqPath.split('/');
    }
    const breadcrumbPromises = pathParts.map(async (token) => {
      pushPaths.push(token);
      const currPath = pushPaths.join('/');
      const albumObj = await albumObjUtils.getAlbumObj(currPath);
      const breadcrumbNode = {
        title: albumObj.title || token,
        path: albumObj.uriPath,
        apiPath: albumObj.apiPath
      };
      return breadcrumbNode;
    });
    const retArr = await Promise.all(breadcrumbPromises);
    return retArr;
  },

  /*
   * returns the extended album object
   */
  getExtendedAlbumObj: async (extAlbumObj) => {
    logger.debug('getExtendedAlbumObj', { path: extAlbumObj.path });
    const extAlbumFname = path.join(C.CACHE_ROOT, 'albums', extAlbumObj.path, 'album.extended.json');
    if (await fileUtils.fileExists(extAlbumFname)) {
      let subdirs;
      try {
        subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, extAlbumObj.path), { withFileTypes: true }))
          .filter((dirEnt) => dirEnt.isDirectory() && !dirEnt.name.match(C.MAC_FORBIDDEN_FILES_REGEX));
      } catch (e) {
        if (e.code === 'PERM' || e.code === 'EACCESS') {
          logger.info('Permission Denied', { error: e });
        } else {
          throw e;
        }
      }
      const subdirAlbumJson = subdirs.map((elem) => path.join(C.CACHE_ROOT, 'albums', extAlbumObj.path, elem.name, 'album.json'));
      // make sure to check the local `album.json` too
      subdirAlbumJson.push(path.join(C.CACHE_ROOT, 'albums', extAlbumObj.path, 'album.json'));

      // return cached if our metadata file is not older than the directory
      // it's in and not older than any album.json files in subdirectories
      if (!(await fileUtils.isFileOlderThanAny(extAlbumFname, subdirAlbumJson))) {
        logger.debug('RETURN CACHE', extAlbumFname);
        return JSON.parse(await fsp.readFile(extAlbumFname, { encoding: 'utf8' }));
      }
    }
    const dirs = [];
    const files = [];
    const albumPath = path.join(C.ALBUMS_ROOT, extAlbumObj.path);
    try {
      (await fsp.readdir(albumPath, { withFileTypes: true }))
        .filter((dirEnt) => !dirEnt.name.match(C.MAC_FORBIDDEN_FILES_REGEX))
        .forEach(async (dirEnt) => {
          logger.debug('GET_EXT_ALB_OBJ:SUBDIRS', { dirEnt });
          if (dirEnt.isDirectory()) {
            dirs.push(dirEnt);
            //// ensure the directory isn't empty
            //const supportedFiles = await fileUtils.getSupportedFiles(path.join(extAlbumObj.path, dirEnt.name));
            //logger.debug('GET_EXT_ALB_OBJ:SUPPORTED_FILES', { path: extAlbumObj.path, supportedFiles });
            //if (supportedFiles.length > 0) {
            //  dirs.push(dirEnt);
            //}
          } else if (dirEnt.isFile()) {
            if (fileTypes.isSupportedImageFile(dirEnt.name)) {
              files.push(dirEnt);
            }
          }
        });
    } catch (e) {
      if (e.code === 'PERM' || e.code === 'EACCESS') {
        logger.info('Permission Denied', { error: e });
      } else {
        throw e;
      }
    }

    extAlbumObj.breadcrumb = await albumObjUtils.getBreadcrumbForPath(extAlbumObj.path);

    // TODO: Pagination / caching this metadata
    const albumResult = await batchUtils.promiseAllInBatches(dirs, (dir) => albumObjUtils.getAlbumObj(path.join('/', extAlbumObj.path, dir.name)), 10);

    // Sort albums in descending date order
    albumResult.sort((a, b) => {
      // b-a for descending order
      return (new Date(b.date)) - (new Date(a.date));
    });
    extAlbumObj.albums = albumResult;

    // TODO: metadata caching and/or pagination
    const fileResult = await batchUtils.promiseAllInBatches(files, (file) => fileObj.getFileObj(extAlbumObj.path, file.name), 10);
    extAlbumObj.files = fileResult;

    // write out the file for next time
    await fsp.mkdir(path.dirname(extAlbumFname), { recursive: true, mode: 755 });
    await fsp.writeFile(extAlbumFname, JSON.stringify(extAlbumObj));
    logger.info('GET_EXTENDED_ALBUM_OBJ - Wrote cache file', { extAlbumFname });

    return extAlbumObj;
  },

  /*
   * returns the standard album object
   */
  getAlbumObj: async (dirName) => {
    logger.debug('getAlbumObj', { dirName });
    const stdAlbumFname = path.join(C.CACHE_ROOT, 'albums', dirName, 'album.json');
    if (await fileUtils.fileExists(stdAlbumFname)) {
      // get the path in the `/cache` directory of the supported file metadatas
      const supportedFilesBare = await fileUtils.getSupportedFiles(dirName);
      const fileObjFnames = supportedFilesBare.map((fName) => cache.getFileObjMetadataFname(dirName, fName));
      // make sure we also compare with the album.yml file in the album dir
      fileObjFnames.push(path.join(C.ALBUMS_ROOT, dirName, 'album.yml'));
      logger.debug('GET_ALBUM_OBJ', { fileObjFnames });

      // return the cached version only if the album metadata is not older than `.` or any supported file metadatas in that directory
      if (!(await fileUtils.isFileOlderThanAny(stdAlbumFname, fileObjFnames))) {
        logger.debug('RETURN CACHE', stdAlbumFname);
        return JSON.parse(await fsp.readFile(stdAlbumFname, { encoding: 'utf8' }));
      }
    }

    // TODO: other methods of inferring date? - dir mtime, oldest file, newest file
    const uriPath = dirName.split('/').map(encodeURIComponent).join('/');
    const albumTitle = path.basename(dirName)
      .replace(/^\//, '')
      .replace(/_/g, ' ')
      .replace(/^\d{4}-\d{2}-\d{2}/, '')
      .trim();
    let albumObj = {
      type: C.TYPE_ALBUM,
      title: albumTitle,
      path: path.join('/', dirName),
      uriPath: path.join('/', uriPath),
      apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriPath),
      description: null
    };

    // Merge meta with album object
    const metaPath = path.join(C.ALBUMS_ROOT, dirName, 'album.yml');
    albumObj = await metaUtils.fetchAndMergeMeta(albumObj, metaPath);

    // now divine the date if it was not set in the album.yml file
    if (!albumObj.date) {
      // let's try to come up with a date
      // 1) If the directory name has a date
      const matches = dirName.match(/(\d{4}-\d{2}-\d{2})/);
      if (matches) {
        try {
          albumObj.date = new Date(matches[0]).toISOString();
        } catch (e) {
          logger.warn('INVALID DATE', { matched: matches[0], dirName });
        }
      }
      if (!albumObj.date) {
        // 2) Next get the exif data for files inside and use the oldest
        let leastDate = null;
        const supportedFiles = await fileUtils.getSupportedFiles(dirName);
        const exifArr = await batchUtils.promiseAllInBatches(supportedFiles, (fName) => exifUtils.getExifForFile(path.join(dirName, fName)), 10);
        logger.debug('GET_ALBUM_OBJ', { dirName, exifArr });
        for (const exif of exifArr) {
          if (exif.DateTime) {
            logger.debug('GET_ALBUM_OBJ:EXIF', { dt: exif.DateTime });
            // sometimes the dates look like 2020:03:21 and so the colons need to be changed to slashes
            exif.DateTime = exif.DateTime.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1/$2/$3 ');
            const exifDate = new Date(exif.DateTime);
            if (!leastDate || exifDate < leastDate) {
              leastDate = exifDate;
            }
          }
        }
        if (leastDate) {
          // 3) it got set to something
          albumObj.date = leastDate.toISOString();
        }
      }
    }

    if (!albumObj.date) {
      // gotta put something, so put today
      albumObj.date = (new Date()).toISOString();
    }

    if (albumObj.thumbnail) {
      // fixup with directory name
      albumObj.thumbnail = path.join(C.PHOTO_URL_BASE, uriPath, encodeURIComponent(albumObj.thumbnail));
    } else {
      const thumbFname = await albumObjUtils.getAlbumDefaultThumbnailFilename(dirName);
      if (thumbFname) {
        albumObj.thumbnail = path.join(C.PHOTO_URL_BASE, uriPath, encodeURIComponent(thumbFname));
      }
    }

    // write out the file for next time
    await fsp.mkdir(path.dirname(stdAlbumFname), { recursive: true, mode: 755 });
    await fsp.writeFile(stdAlbumFname, JSON.stringify(albumObj));
    logger.info('GET_ALBUM_OBJ - Wrote cache file', { stdAlbumFname });

    return albumObj;
  },

  /*
   * Fancy algorithm to get the default thumbnail for an album
   */
  getAlbumDefaultThumbnailFilename: async (reqPath) => {
    const albumPath = path.join(C.ALBUMS_ROOT, reqPath);
    let thumbEntry;

    try {
      thumbEntry = (await fsp.readdir(albumPath, { withFileTypes: true }))
        .filter((dirEnt) => !dirEnt.name.match(C.MAC_FORBIDDEN_FILES_REGEX))
        .find((dirEnt) => fileTypes.isSupportedImageFile(dirEnt.name));
    } catch (e) {
      if (e.code === 'PERM' || e.code === 'EACCESS') {
        logger.info('Permission Denied', { error: e });
      } else {
        throw e;
      }
    }
    if (thumbEntry) {
      return thumbEntry.name;
    }
    return null;
  }
};
