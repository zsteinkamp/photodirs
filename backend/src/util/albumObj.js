'use strict'

import { readdir, readFile, mkdir, writeFile } from 'fs/promises'
import { join, dirname, basename } from 'path'

import {
  LOGGER,
  CACHE_ROOT,
  ALBUMS_ROOT,
  MAC_FORBIDDEN_FILES_REGEX,
  TYPE_ALBUM,
  API_BASE,
  PHOTO_URL_BASE,
} from '../constants.js'
import { promiseAllInBatches } from './batch.js'
import { getFileObjMetadataFname } from './cache.js'
import { getExifObjForFile, getExifDate } from './exif.js'
import { getFileObj } from './fileObj.js'
import { isSupportedImageFile } from './fileTypes.js'
import { fileExists, isFileOlderThanAny, getSupportedFiles } from './file.js'
import { fetchAndMergeMeta } from './meta.js'

const logger = LOGGER

/*
 * Given a reqPath (i.e. the path root is the album root), return an array of
 * breadcrumb nodes, from the root to the current node.  Nodes have a title
 * and path.
 */
export const getBreadcrumbForPath = async reqPath => {
  const pushPaths = []
  let pathParts = []
  if (reqPath === '/') {
    pathParts = ['']
  } else {
    pathParts = reqPath.split('/')
  }
  const breadcrumbPromises = pathParts.map(async token => {
    pushPaths.push(token)
    const currPath = pushPaths.join('/')
    const albumObj = await getAlbumObj(currPath)
    const breadcrumbNode = {
      title: albumObj.title || token,
      path: albumObj.uriPath,
      apiPath: albumObj.apiPath,
    }
    return breadcrumbNode
  })
  const retArr = await Promise.all(breadcrumbPromises)
  return retArr
}

/*
 * returns the extended album object
 */
export const getExtendedAlbumObj = async extAlbumObj => {
  logger.debug('getExtendedAlbumObj', { path: extAlbumObj.path })
  const extAlbumFname = join(
    CACHE_ROOT,
    'albums',
    extAlbumObj.path,
    'album.extended.json',
  )
  if (await fileExists(extAlbumFname)) {
    let subdirs
    try {
      subdirs = (
        await readdir(join(ALBUMS_ROOT, extAlbumObj.path), {
          withFileTypes: true,
        })
      ).filter(
        dirEnt =>
          dirEnt.isDirectory() && !dirEnt.name.match(MAC_FORBIDDEN_FILES_REGEX),
      )
    } catch (e) {
      if (e.code === 'PERM' || e.code === 'EACCES') {
        logger.info('Permission Denied', { error: e })
      } else {
        logger.error('readdir error', e)
        throw e
      }
    }
    const subdirAlbumJson = subdirs.map(elem =>
      join(CACHE_ROOT, 'albums', extAlbumObj.path, elem.name, 'album.json'),
    )
    // make sure to check the local `album.json` too
    subdirAlbumJson.push(
      join(CACHE_ROOT, 'albums', extAlbumObj.path, 'album.json'),
    )

    // return cached if our metadata file is not older than the directory
    // it's in and not older than any album.json files in subdirectories
    if (!(await isFileOlderThanAny(extAlbumFname, subdirAlbumJson))) {
      logger.debug('RETURN CACHE', extAlbumFname)
      return JSON.parse(await readFile(extAlbumFname, { encoding: 'utf8' }))
    }
  }
  const dirs = []
  const files = []
  const albumPath = join(ALBUMS_ROOT, extAlbumObj.path)
  try {
    ;(await readdir(albumPath, { withFileTypes: true }))
      .filter(dirEnt => !dirEnt.name.match(MAC_FORBIDDEN_FILES_REGEX))
      .forEach(async dirEnt => {
        logger.debug('GET_EXT_ALB_OBJ:SUBDIRS', { dirEnt })
        if (dirEnt.isDirectory()) {
          dirs.push(dirEnt)
          //// ensure the directory isn't empty
          //const supportedFiles = await fileUtils.getSupportedFiles(path.join(extAlbumObj.path, dirEnt.name));
          //logger.debug('GET_EXT_ALB_OBJ:SUPPORTED_FILES', { path: extAlbumObj.path, supportedFiles });
          //if (supportedFiles.length > 0) {
          //  dirs.push(dirEnt);
          //}
        } else if (dirEnt.isFile()) {
          if (isSupportedImageFile(dirEnt.name)) {
            files.push(dirEnt)
          }
        }
      })
  } catch (e) {
    if (e.code === 'PERM' || e.code === 'EACCES') {
      logger.info('Permission Denied', { error: e })
    } else {
      logger.error('readdir error2', e)
      throw e
    }
  }

  extAlbumObj.breadcrumb = await getBreadcrumbForPath(extAlbumObj.path)

  // TODO: Pagination / caching this metadata
  const albumResult = await promiseAllInBatches(
    dirs,
    dir => getAlbumObj(join('/', extAlbumObj.path, dir.name)),
    10,
  )

  // Sort albums in descending date order
  albumResult.sort((a, b) => {
    // b-a for descending order
    return new Date(b.date) - new Date(a.date)
  })
  extAlbumObj.albums = albumResult

  // TODO: metadata caching and/or pagination
  const fileResult = await promiseAllInBatches(
    files,
    file => getFileObj(extAlbumObj.path, file.name),
    10,
  )
  //
  fileResult.sort((a, b) => {
    return a.date < b.date ? -1 : 1
  })
  extAlbumObj.files = fileResult

  // write out the file for next time
  await mkdir(dirname(extAlbumFname), { recursive: true, mode: 755 })
  await writeFile(extAlbumFname, JSON.stringify(extAlbumObj))
  logger.info('GET_EXTENDED_ALBUM_OBJ - Wrote cache file', { extAlbumFname })

  return extAlbumObj
}

/*
 * returns the standard album object
 */
export const getAlbumObj = async dirName => {
  logger.debug('getAlbumObj', { dirName })
  const stdAlbumFname = join(CACHE_ROOT, 'albums', dirName, 'album.json')
  if (await fileExists(stdAlbumFname)) {
    // get the path in the `/cache` directory of the supported file metadatas
    const supportedFilesBare = await getSupportedFiles(dirName)
    const fileObjFnames = supportedFilesBare.map(fName =>
      getFileObjMetadataFname(dirName, fName),
    )
    // make sure we also compare with the album.yml file in the album dir
    fileObjFnames.push(join(ALBUMS_ROOT, dirName, 'album.yml'))
    logger.debug('GET_ALBUM_OBJ', { fileObjFnames })

    // return the cached version only if the album metadata is not older than `.` or any supported file metadatas in that directory
    if (!(await isFileOlderThanAny(stdAlbumFname, fileObjFnames))) {
      logger.debug('RETURN CACHE', stdAlbumFname)
      return JSON.parse(await readFile(stdAlbumFname, { encoding: 'utf8' }))
    }
  }

  // TODO: other methods of inferring date? - dir mtime, oldest file, newest file
  const uriPath = dirName.split('/').map(encodeURIComponent).join('/')
  const albumTitle = basename(dirName)
    .replace(/^\//, '')
    .replace(/_/g, ' ')
    .replace(/^\d{4}-\d{2}-\d{2}/, '')
    .trim()

  let albumObj = {
    type: TYPE_ALBUM,
    title: albumTitle,
    path: join('/', dirName),
    uriPath: join('/', uriPath),
    apiPath: join(API_BASE, ALBUMS_ROOT, uriPath),
    description: null,
  }

  // Merge meta with album object
  const metaPath = join(ALBUMS_ROOT, dirName, 'album.yml')
  albumObj = await fetchAndMergeMeta(albumObj, metaPath)

  // now divine the date if it was not set in the album.yml file
  if (!albumObj.date) {
    // let's try to come up with a date
    // 1) If the directory name has a date
    const matches = dirName.match(/(\d{4}-\d{2}-\d{2})/)
    if (matches) {
      try {
        albumObj.date = new Date(matches[0]).toISOString()
      } catch (e) {
        logger.warn('INVALID DATE', { matched: matches[0], dirName })
      }
    }
    if (!albumObj.date) {
      // 2) Next get the exif data for files inside and use the oldest
      let leastDate = null
      const supportedFiles = await getSupportedFiles(dirName)
      const exifArr = await promiseAllInBatches(
        supportedFiles,
        fName => getExifObjForFile(join(dirName, fName)),
        10,
      )
      logger.debug('GET_ALBUM_OBJ', { dirName, exifArr })
      for (const exif of exifArr) {
        const exifDate = new Date(getExifDate(exif))
        if (exifDate) {
          logger.debug('GET_ALBUM_OBJ:EXIF', { dt: exifDate })
          if (!leastDate || exifDate < leastDate) {
            leastDate = exifDate
          }
        }
      }
      if (leastDate) {
        // 3) it got set to something
        albumObj.date = leastDate.toISOString()
      }
    }
  }

  if (!albumObj.date) {
    // gotta put something, so put today
    albumObj.date = new Date().toISOString()
  }

  if (albumObj.thumbnail) {
    // fixup with directory name
    albumObj.thumbnail = join(
      PHOTO_URL_BASE,
      uriPath,
      encodeURIComponent(albumObj.thumbnail),
    )
  } else {
    const thumbFname = await getAlbumDefaultThumbnailFilename(dirName)
    if (thumbFname) {
      albumObj.thumbnail = join(
        PHOTO_URL_BASE,
        uriPath,
        encodeURIComponent(thumbFname),
      )
    }
  }

  // write out the file for next time
  await mkdir(dirname(stdAlbumFname), { recursive: true, mode: 755 })
  await writeFile(stdAlbumFname, JSON.stringify(albumObj))
  logger.info('GET_ALBUM_OBJ - Wrote cache file', { stdAlbumFname })

  return albumObj
}

/*
 * Fancy algorithm to get the default thumbnail for an album
 */
export const getAlbumDefaultThumbnailFilename = async reqPath => {
  const albumPath = join(ALBUMS_ROOT, reqPath)
  let thumbEntry

  try {
    thumbEntry = (await readdir(albumPath, { withFileTypes: true }))
      .filter(dirEnt => !dirEnt.name.match(MAC_FORBIDDEN_FILES_REGEX))
      .find(dirEnt => isSupportedImageFile(dirEnt.name))
  } catch (e) {
    if (e.code === 'PERM' || e.code === 'EACCES') {
      logger.info('Permission Denied', { error: e })
    } else {
      logger.error('readdir error3', e)
      throw e
    }
  }
  if (thumbEntry) {
    return thumbEntry.name
  }
  return null
}
