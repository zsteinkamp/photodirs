'use strict';

const exifReader = require('exifreader');
const glob = require('glob');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { pipeline } = require('stream/promises');
const sharp = require('sharp');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const C = require('./constants');

const utils = module.exports = {
  /**
   * Same as Promise.all(items.map(item => task(item))), but it waits for
   * the first {batchSize} promises to finish before starting the next batch.
   *
   * @template A
   * @template B
   * @param {function(A): B} task The task to run for each item.
   * @param {A[]} items Arguments to pass to the task for each call.
   * @param {int} batchSize
   * @returns {Promise<B[]>}
   */
  promiseAllInBatches: async (items, task, batchSize) => {
    let position = 0;
    let results = [];
    while (position < items.length) {
      const itemsForBatch = items.slice(position, position + batchSize);
      results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
      position += batchSize;
    }
    return results;
  },

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
   * given a path to something in `/albums` dir, clean up files in the `/cache` dir
   */
  cleanUpCacheFor: async (albumFilePath) => {
    const files = await (utils.globPromise(path.join(C.CACHE_ROOT, 'albums', `${albumFilePath}*`)));
    const albumPath = path.dirname(albumFilePath);
    files.push(path.join(C.CACHE_ROOT, 'albums', albumPath, 'album.json'));
    files.push(path.join(C.CACHE_ROOT, 'albums', albumPath, 'album.extended.json'));
    //console.log('CleanUpCacheFor', { files });
    await utils.promiseAllInBatches(files, (file) => fsp.rm(file, { force: true }), 10);
  },

  /*
   * returns whether the given testFile is older than any of the files in compareArr
   */
  isFileOlderThanAny: async (testFile, compareArr) => {
    if (await utils.fileExists(testFile)) {
      const testFileMtime = (await fsp.stat(testFile)).mtime;
      for (const compareFile of compareArr) {
        if (await utils.fileExists(compareFile)) {
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
    const dirFiles = (await fsp.readdir(albumDir, { withFileTypes: true }))
      .filter((dirEnt) => (dirEnt.isFile() && utils.isSupportedImageFile(dirEnt.name)))
      .map((dirEnt) => dirEnt.name);
    //console.log('getSupportedFiles', { dirName, dirFiles });
    return dirFiles;
  },

  /*
   * returns the cache path for a given file's metadata
   */
  getFileObjMetadataFname: (albumPath, fileName) => {
    return path.join(C.CACHE_ROOT, 'albums', albumPath, fileName + '.json');
  },

  /*
   * returns the standard File object
   */
  getFileObj: async (albumPath, fileName) => {
    //console.log('getFileObj', { albumPath, fileName });
    const fileObjMetaFname = utils.getFileObjMetadataFname(albumPath, fileName);
    //console.log('GET_FILE_OBJ:TOP', { fileObjMetaFname, albumPath, fileName });
    if (await utils.fileExists(fileObjMetaFname)) {
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
    const fileObj = {
      type: C.TYPE_PHOTO,
      title: fileName,
      fileName: fileName,
      albumPath: albumPath,
      path: path.join('/', albumPath, fileName),
      uriPath: path.join('/', uriAlbumPath, uriFileName),
      photoPath: path.join(C.PHOTO_URL_BASE, uriAlbumPath, uriFileName),
      apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriAlbumPath, uriFileName)
    };

    // write out the file for next time
    await fsp.mkdir(path.dirname(fileObjMetaFname), { recursive: true, mode: 755 });
    await fsp.writeFile(fileObjMetaFname, JSON.stringify(fileObj));
    console.info('GET_FILE_OBJ', 'Wrote cache file', fileObjMetaFname);

    return fileObj;
  },

  /*
   * returns the extended album object
   */
  getExtendedAlbumObj: async (extAlbumObj) => {
    //console.log('getExtendedAlbumObj', { path: extAlbumObj.path });
    const extAlbumFname = path.join(C.CACHE_ROOT, 'albums', extAlbumObj.path, 'album.extended.json');
    if (await utils.fileExists(extAlbumFname)) {
      const subdirs = (await fsp.readdir(path.join(C.ALBUMS_ROOT, extAlbumObj.path), { withFileTypes: true }))
        .filter((dirEnt) => dirEnt.isDirectory());
      const subdirAlbumJson = subdirs.map((elem) => path.join(C.CACHE_ROOT, 'albums', extAlbumObj.path, elem.name, 'album.json'));
      // make sure to check the local `album.json` too
      subdirAlbumJson.push(path.join(C.CACHE_ROOT, 'albums', extAlbumObj.path, 'album.json'));

      // return cached if our metadata file is not older than the directory
      // it's in and not older than any album.json files in subdirectories
      if (!(await utils.isFileOlderThanAny(extAlbumFname, subdirAlbumJson))) {
        //console.log('RETURN CACHE', extAlbumFname);
        return JSON.parse(await fsp.readFile(extAlbumFname, { encoding: 'utf8' }));
      }
    }
    const dirs = [];
    const files = [];
    const albumPath = path.join(C.ALBUMS_ROOT, extAlbumObj.path);
    (await fsp.readdir(albumPath, { withFileTypes: true })).forEach(async (dirEnt) => {
      //console.log('GET_EXT_ALB_OBJ:SUBDIRS', { dirEnt });
      if (dirEnt.isDirectory()) {
        // ensure the directory isn't empty
        const supportedFiles = await utils.getSupportedFiles(path.join(extAlbumObj.path, dirEnt.name));
        //console.log('GET_EXT_ALB_OBJ:SUPPORTED_FILES', { path: extAlbumObj.path, supportedFiles });
        if (supportedFiles.length > 0) {
          dirs.push(dirEnt);
        }
      } else if (dirEnt.isFile()) {
        if (utils.isSupportedImageFile(dirEnt.name)) {
          files.push(dirEnt);
        }
      }
    });

    extAlbumObj.breadcrumb = await utils.getBreadcrumbForPath(extAlbumObj.path);

    // TODO: Pagination / caching this metadata
    const albumResult = await utils.promiseAllInBatches(dirs, (dir) => utils.getAlbumObj(path.join('/', extAlbumObj.path, dir.name)), 10);

    // Sort albums in descending date order
    albumResult.sort((a, b) => {
      // b-a for descending order
      return (new Date(b.date)) - (new Date(a.date));
    });
    extAlbumObj.albums = albumResult;

    // TODO: metadata caching and/or pagination
    const fileResult = await utils.promiseAllInBatches(files, (file) => utils.getFileObj(extAlbumObj.path, file.name), 10);
    extAlbumObj.files = fileResult;

    // write out the file for next time
    await fsp.mkdir(path.dirname(extAlbumFname), { recursive: true, mode: 755 });
    await fsp.writeFile(extAlbumFname, JSON.stringify(extAlbumObj));
    console.info('Wrote cache file', extAlbumFname);

    return extAlbumObj;
  },

  /*
   * returns the standard album object
   */
  getAlbumObj: async (dirName) => {
    //console.log('getAlbumObj', { dirName });
    const stdAlbumFname = path.join(C.CACHE_ROOT, 'albums', dirName, 'album.json');
    if (await utils.fileExists(stdAlbumFname)) {
      // get the path in the `/cache` directory of the supported file metadatas
      const supportedFilesBare = await utils.getSupportedFiles(dirName);
      const fileObjFnames = supportedFilesBare.map((fName) => utils.getFileObjMetadataFname(dirName, fName));
      // make sure we also compare with the album.yml file in the album dir
      fileObjFnames.push(path.join(C.ALBUMS_ROOT, dirName, 'album.yml'));
      //console.log('GET_ALBUM_OBJ', { fileObjFnames });

      // return the cached version only if the album metadata is not older than `.` or any supported file metadatas in that directory
      if (!(await utils.isFileOlderThanAny(stdAlbumFname, fileObjFnames))) {
        //console.log('RETURN CACHE', stdAlbumFname);
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
    albumObj = await utils.fetchAndMergeMeta(albumObj, dirName);

    // now divine the date if it was not set in the album.yml file
    if (!albumObj.date) {
      // let's try to come up with a date
      // 1) If the directory name has a date
      const matches = dirName.match(/(\d{4}-\d{2}-\d{2})/);
      if (matches) {
        try {
          albumObj.date = new Date(matches[0]).toISOString();
        } catch (e) {
          console.log('INVALID DATE', { matched: matches[0], dirName });
        }
      }
      if (!albumObj.date) {
        // 2) Next get the exif data for files inside and use the oldest
        let leastDate = null;
        const supportedFiles = await utils.getSupportedFiles(dirName);
        const exifArr = await utils.promiseAllInBatches(supportedFiles, (fName) => utils.getExifForFile(path.join(dirName, fName)), 10);
        //console.log('GET_ALBUM_OBJ', { dirName, exifArr });
        for (const exif of exifArr) {
          if (exif.DateTime) {
            //console.log('GET_ALBUM_OBJ:EXIF', { dt: exif.DateTime });
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
      const thumbFname = await utils.getAlbumDefaultThumbnailFilename(dirName);
      albumObj.thumbnail = path.join(C.PHOTO_URL_BASE, uriPath, encodeURIComponent(thumbFname));
    }

    // write out the file for next time
    await fsp.mkdir(path.dirname(stdAlbumFname), { recursive: true, mode: 755 });
    await fsp.writeFile(stdAlbumFname, JSON.stringify(albumObj));
    console.info('GET_ALBUM_OBJ', 'Wrote cache file', stdAlbumFname);

    return albumObj;
  },

  /*
   * Fancy algorithm to get the default thumbnail for an album
   */
  getAlbumDefaultThumbnailFilename: async (reqPath) => {
    const albumPath = path.join(C.ALBUMS_ROOT, reqPath);
    const thumbEntry = (await fsp.readdir(albumPath, { withFileTypes: true })).find((dirEnt) => {
      return utils.isSupportedImageFile(dirEnt.name);
    });
    if (thumbEntry) {
      return thumbEntry.name;
    }
    return null;
  },

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
      const albumObj = await utils.getAlbumObj(currPath);
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
   * Returns a Sharp transformer appropriate for the supplied file's type
   */
  getSharpTransform: (filePath, resizeOptions) => {
    const transformer = {
      jpg: sharp().jpeg().rotate().resize(resizeOptions),
      gif: sharp().resize(resizeOptions),
      png: sharp().resize(resizeOptions)
    }[utils.getOutputTypeForFile(filePath)];
    return transformer;
  },

  /*
   * Returns the extension/type of the file we are going to output
   * Handy for some code here, such as `getSharpTransform`
   */
  getOutputTypeForFile: (filePath) => {
    if (utils.isGif(filePath)) {
      return 'gif';
    } else if (utils.isPng(filePath)) {
      return 'png';
    }
    return 'jpg';
  },

  /*
   * Rather than caching every single size a client requests, cache in
   * increments of 200px. The final output is produced by resizing the cached
   * image the next size bigger than what the client is requesting (or the
   * exact size if that works out!), and is usually very fast. By serving image
   * with good cache-control headers, we can get great performance.
   */
  getCachedImageSizes: (resizeOptions) => {
    const cacheWidth = 200 * Math.ceil(resizeOptions.width / 200);
    const cacheHeight = 200 * Math.ceil(resizeOptions.height / 200);
    return [cacheWidth, cacheHeight];
  },

  /*
   * Locate the cached image closest to what the client is requesting. If it's
   * not found, then create it and return the filename.
   */
  getCachedImagePath: async (filePath, resizeOptions) => {
    //console.log('GetCachedImagePath', { filePath, resizeOptions });
    // First look for cached file that is close to the size we want
    const [cacheWidth, cacheHeight] = utils.getCachedImageSizes(resizeOptions);

    const cachePath = utils.makeResizeCachePath(filePath, cacheWidth, cacheHeight);

    let cacheStat = {};

    try {
      cacheStat = await fsp.stat(cachePath);
    } catch (e) {
      if (e.code !== 'ENOENT') {
        console.error('CACHESTAT returned error', { e });
      }
    }

    if (typeof cacheStat.size !== 'undefined' && cacheStat.size === 0) {
      console.log('Zero length file found. Regenerating.', { cachePath, cacheStat });
    }

    // Generate the file if it doesn't exist or has a zero length.
    // Zero length files can happen due to a bug in the pre-generator
    // that is a TODO.
    if (typeof cacheStat.size === 'undefined' || cacheStat.size === 0) {
      // Now cache the intermediate size
      await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });
      //console.log('GET_CACHED_IMAGE_PATH', { filePath, cachePath, resizeOptions });
      const readStream = fs.createReadStream(filePath);
      // When we cache the intermediate size, use `sharp.fit.outside` to scale to the short side to facilitate cropping
      const transform = utils.getSharpTransform(filePath, { height: cacheHeight, width: cacheWidth, fit: sharp.fit.outside });
      const outStream = fs.createWriteStream(cachePath);

      async function plumbing() {
        await pipeline(readStream, transform, outStream);
        console.log('GET_CACHED_IMAGE_PATH:WROTE_FILE', { filePath, cachePath });
      }
      await plumbing().catch(async (err) => {
        console.error('IMG CACHE PIPELINE ERROR', { filePath, cachePath, err });
        // make sure we don't leave a zero-length file
        await fsp.rm(cachePath, { force: true });
        return null;
      });
    }
    return cachePath;
  },

  /*
   * Convert a camera raw image to JPEG, cache it, and return the cache filename.
   * If already cached, then just return the cache filename.
   */
  jpegFileForRaw: async (filePath) => {
    const cachePath = path.join(C.CACHE_ROOT, filePath + '.jpg');
    //console.log('jpegFileForRaw', { filePath, cachePath });
    if (await utils.fileExists(cachePath)) {
      // Return existing jpg
      return cachePath;
    }

    // Gotta give the cached file a home. Not worth checking for existence...
    await fsp.mkdir(path.dirname(cachePath), { recursive: true, mode: 755 });

    // Need to generate JPEG version by first extracting a TIFF from the raw
    // file using dcraw and pipelining it through Sharp to get a JPEG.
    const tiffPipe = utils.rawToTiffPipe(filePath);
    const outStream = fs.createWriteStream(cachePath);
    const transform = sharp().rotate().jpeg();

    async function plumbing() {
      await pipeline(tiffPipe, transform, outStream);
      console.log('JPEG_FILE_FOR_RAW:WROTE_JPG', { filePath, cachePath });
    }
    await plumbing().catch(async (err) => {
      console.error('JPEG_FILE_FOR_RAW:PIPELINE_ERROR', { err });
      // make sure we don't leave a zero-length file
      await fsp.rm(cachePath, { force: true });
      return null;
    });
    // Return the path to the cached JPEG
    return cachePath;
  },

  /*
   * Generate standard resizes
   */
  preResize: async (absFname) => {
    //console.log('PRE_RESIZE', { absFname });
    return Promise.all([
      utils.getCachedImagePath(absFname, { height: 400, width: 400 }),
      utils.getCachedImagePath(absFname, { height: 1600, width: 1600 })
    ]);
  },

  /*
   * Return the cache path for a given file and size
   */
  makeResizeCachePath: (filePath, height, width) => {
    if (!filePath.startsWith(C.CACHE_ROOT)) {
      // If this was a raw conversion, the filePath with already have the
      // CACHE_ROOT, so we need to protect against making it
      // `/cache/cache/...`.
      filePath = path.join(C.CACHE_ROOT, filePath);
    }
    // e.g. /cache/albums/album_hawaii/hawaii.CR2^1200x800.jpg
    return `${filePath}^${width}x${height}.${utils.getOutputTypeForFile(filePath)}`;
  },

  /*
   * Read raw files and return a pipe of TIFF data. This can then be pipelined
   * into our existing stream methodology using Sharp.
   * Uses the venerable dcraw! https://www.dechifro.org/dcraw/
   */
  rawToTiffPipe: (filePath) => {
    // -T == TIFF output
    // -w == camera white balance
    // -c == output to STDOUT
    const dcrawProcess = spawn('/usr/bin/dcraw', ['-T', '-w', '-c', filePath],
      { stdio: ['ignore', 'pipe', process.stderr] });
    // The `pipe` option above connects STDOUT to a pipe that can then be streamed.
    // This avoids the wasteful overhead of temp files or creating bloated
    // memory buffers to store the entire output.

    // We just want the stdout socket to pipeline from
    return dcrawProcess.stdout;
  },

  /*
   * Pull some EXIF data from supported files
   */
  getExifForFile: async (reqPath) => {
    const ret = {};

    const filePath = path.join(C.ALBUMS_ROOT, reqPath);
    //console.log('GET_EXIF_FOR_FILE', { filePath });
    if (!(utils.isJpeg(filePath) || utils.isHeif(filePath) || utils.isRaw(filePath))) {
      return ret;
    }

    const exif = await exifReader.load(filePath);
    for (const prop of C.EXIF_DESCRIPTION_PROPERTIES) {
      if (exif[prop]) {
        ret[prop] = exif[prop] ? exif[prop].description : null;
      }
    }
    return ret;
  },

  /*
   * Merge metadata into an object, usually from `album.yml` or `{image_name}.yml` files.
   */
  fetchAndMergeMeta: async (dest, path) => {
    const meta = await utils.getAlbumMeta(path);
    Object.entries(meta).forEach(([key, val]) => {
      dest[key] = val;
    });
    //console.log('META', { path, meta, dest });
    return dest;
  },

  /*
   * Fetch metadata from `album.yml` file in a given path.
   */
  getAlbumMeta: async (albumPath) => {
    const metaPath = path.join(C.ALBUMS_ROOT, albumPath, 'album.yml');

    let fileContents;
    try {
      // TODO: figure out bug when this is async
      fileContents = fs.readFileSync(metaPath);
    } catch {
      // no meta file
      return {};
    }
    const meta = yaml.load(fileContents);
    if (meta.apiPath) {
      throw new Error(`Metadata file at ${metaPath} cannot contain a property called 'apiPath'.`);
    }
    return meta;
  },

  /*
   * Return whether a given directory entry is a supported type of image.
   * TODO: do more than look at extension
   */
  isSupportedImageFile: (filePath) => {
    return utils.isJpeg(filePath) ||
      utils.isHeif(filePath) ||
      utils.isRaw(filePath) ||
      utils.isPng(filePath);
  },

  /*
   * Return whether a filename is for a JPEG file
   */
  isJpeg: (filePath) => {
    return !!filePath.match(/(jpeg|jpg)$/i);
  },

  /*
   * Return whether a filename is for a HEIC file
   */
  isHeif: (filePath) => {
    return !!filePath.match(/(heif|heic)$/i);
  },

  /*
   * Return whether a filename is for a GIF file
   */
  isGif: (filePath) => {
    return !!filePath.match(/(gif)$/i);
  },

  /*
   * Return whether a filename is for a PNG file
   */
  isPng: (filePath) => {
    return !!filePath.match(/(png)$/i);
  },

  /*
   * Return whether a filename is for a RAW file
   */
  isRaw: (filePath) => {
    return !!filePath.match(/(crw|cr2|dng|arw)$/i);
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
