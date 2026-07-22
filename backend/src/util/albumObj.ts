import { readdir, readFile, mkdir, writeFile } from 'fs/promises'
import { join, dirname, basename } from 'path'

import {
  ALBUMS_ROOT,
  API_BASE,
  CACHE_ROOT,
  LOGGER,
  MAC_FORBIDDEN_FILES_REGEX,
  MAX_PARALLEL_JOBS,
  PHOTO_URL_BASE,
  TYPE_ALBUM,
} from '../constants.js'
import { promiseAllInBatches } from './batch.js'
import { getFileObjMetadataFname } from './cache.js'
import { getExifObjForFile, getExifDate } from './exif.js'
import { getFileObj } from './fileObj.js'
import { isSupportedImageFile } from './fileTypes.js'
import {
  fileExists,
  isFileOlderThanAny,
  getSupportedFiles,
  getFileHash,
} from './file.js'
import { fetchAndMergeMeta } from './meta.js'

const logger = LOGGER

/*
 * Given a reqPath (i.e. the path root is the album root), return an array of
 * breadcrumb nodes, from the root to the current node.
 */
export const getBreadcrumbForPath = async (reqPath: string) => {
  const pushPaths: string[] = []
  let pathParts: string[]
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
      title: (albumObj.title as string) || token,
      path: albumObj.uriPath as string,
      apiPath: albumObj.apiPath as string,
    }
    return breadcrumbNode
  })
  const retArr = await Promise.all(breadcrumbPromises)
  return retArr
}

/*
 * returns the extended album object
 */
export const getExtendedAlbumObj = async (
  extAlbumObj: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  logger.debug('getExtendedAlbumObj', { path: extAlbumObj.path })
  const extAlbumFname = join(
    CACHE_ROOT,
    'albums',
    extAlbumObj.path as string,
    'album.extended.json',
  )
  if (await fileExists(extAlbumFname)) {
    let subdirs: import('fs').Dirent[]
    try {
      subdirs = (
        await readdir(join(ALBUMS_ROOT, extAlbumObj.path as string), {
          withFileTypes: true,
        })
      ).filter(
        dirEnt =>
          dirEnt.isDirectory() && !dirEnt.name.match(MAC_FORBIDDEN_FILES_REGEX),
      )
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException
      if (err.code === 'PERM' || err.code === 'EACCES') {
        logger.info('Permission Denied', { error: err })
      } else {
        logger.error('readdir error', e as Error)
        throw e
      }
      subdirs = []
    }
    const subdirAlbumJson = subdirs.map(elem =>
      join(
        CACHE_ROOT,
        'albums',
        extAlbumObj.path as string,
        elem.name,
        'album.json',
      ),
    )
    subdirAlbumJson.push(
      join(CACHE_ROOT, 'albums', extAlbumObj.path as string, 'album.json'),
    )

    if (!(await isFileOlderThanAny(extAlbumFname, subdirAlbumJson))) {
      logger.debug('RETURN CACHE', extAlbumFname)
      try {
        return JSON.parse(await readFile(extAlbumFname, { encoding: 'utf8' }))
      } catch (e) {
        logger.warn('Error parsing JSON, rebuilding', { extAlbumFname })
      }
    }
  }
  const dirs: import('fs').Dirent[] = []
  const files: import('fs').Dirent[] = []
  const albumPath = join(ALBUMS_ROOT, extAlbumObj.path as string)
  try {
    ;(await readdir(albumPath, { withFileTypes: true }))
      .filter(dirEnt => !dirEnt.name.match(MAC_FORBIDDEN_FILES_REGEX))
      .forEach(dirEnt => {
        logger.debug('GET_EXT_ALB_OBJ:SUBDIRS', { dirEnt })
        if (dirEnt.isDirectory()) {
          dirs.push(dirEnt)
        } else if (dirEnt.isFile()) {
          if (isSupportedImageFile(dirEnt.name)) {
            files.push(dirEnt)
          }
        }
      })
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'PERM' || err.code === 'EACCES') {
      logger.info('Permission Denied', { error: err })
    } else {
      logger.error('readdir error2', e as Error)
      throw e
    }
  }

  extAlbumObj.breadcrumb = await getBreadcrumbForPath(
    extAlbumObj.path as string,
  )

  const albumResult = await promiseAllInBatches(
    dirs,
    dir => getAlbumObj(join('/', extAlbumObj.path as string, dir.name)),
    MAX_PARALLEL_JOBS,
  )

  albumResult.sort((a, b) => {
    return (
      new Date(b.date as string).getTime() -
      new Date(a.date as string).getTime()
    )
  })
  extAlbumObj.albums = albumResult

  const fileResult = await promiseAllInBatches(
    files,
    file => getFileObj(extAlbumObj.path as string, file.name),
    MAX_PARALLEL_JOBS,
  )

  fileResult.sort((a, b) => {
    if (extAlbumObj.sort && extAlbumObj.sort === 'fname') {
      return (a.fileName as string).localeCompare(b.fileName as string)
    }
    // Oldest first. Parse to timestamps so a Date ctime fallback and ISO-string
    // exif dates compare consistently (a bare `<` mixes the two types).
    return (
      new Date(a.date as string).getTime() -
      new Date(b.date as string).getTime()
    )
  })
  extAlbumObj.files = fileResult

  await mkdir(dirname(extAlbumFname), { recursive: true, mode: 755 })
  await writeFile(extAlbumFname, JSON.stringify(extAlbumObj))
  logger.info('GET_EXTENDED_ALBUM_OBJ - Wrote cache file', { extAlbumFname })

  return extAlbumObj
}

/*
 * returns the standard album object
 */
export const getAlbumObj = async (
  dirName: string,
): Promise<Record<string, unknown>> => {
  logger.debug('getAlbumObj', { dirName })
  const stdAlbumFname = join(CACHE_ROOT, 'albums', dirName, 'album.json')
  if (await fileExists(stdAlbumFname)) {
    const supportedFilesBare = await getSupportedFiles(dirName)
    const fileObjFnames = supportedFilesBare.map(fName =>
      getFileObjMetadataFname(dirName, fName),
    )
    fileObjFnames.push(join(ALBUMS_ROOT, dirName, 'album.yml'))
    // Invalidate against immediate subalbum caches so recursive thumbnail
    // and counts refresh when descendants change.
    for (const sub of await getDirEntries(join(ALBUMS_ROOT, dirName))) {
      if (sub.isDirectory()) {
        fileObjFnames.push(
          join(CACHE_ROOT, 'albums', dirName, sub.name, 'album.json'),
        )
      }
    }
    logger.debug('GET_ALBUM_OBJ', { fileObjFnames })

    if (!(await isFileOlderThanAny(stdAlbumFname, fileObjFnames))) {
      logger.debug('RETURN CACHE', stdAlbumFname)
      try {
        return JSON.parse(await readFile(stdAlbumFname, { encoding: 'utf8' }))
      } catch (e) {
        logger.warn('Error parsing JSON, rebuilding', { stdAlbumFname })
      }
    }
  }

  const uriPath = dirName.split('/').map(encodeURIComponent).join('/')
  const albumTitle = basename(dirName)
    .replace(/^\//, '')
    .replace(/_/g, ' ')
    .replace(/^\d{4}-\d{2}-\d{2}/, '')
    .trim()

  let albumObj: Record<string, unknown> = {
    type: TYPE_ALBUM,
    title: albumTitle,
    path: join('/', dirName),
    uriPath: join('/', uriPath),
    apiPath: join(API_BASE, ALBUMS_ROOT, uriPath),
    description: null,
  }

  const metaPath = join(ALBUMS_ROOT, dirName, 'album.yml')
  albumObj = await fetchAndMergeMeta(albumObj, metaPath)

  if (!albumObj.date) {
    const matches = dirName.match(/(\d{4}-\d{2}-\d{2})/)
    if (matches) {
      try {
        albumObj.date = new Date(matches[0]).toISOString()
      } catch (e) {
        logger.warn('INVALID DATE', { matched: matches[0], dirName })
      }
    }
    if (!albumObj.date) {
      let leastDate: Date | null = null
      const supportedFiles = await getSupportedFiles(dirName)
      const exifArr = await promiseAllInBatches(
        supportedFiles,
        fName => getExifObjForFile(join(dirName, fName)),
        MAX_PARALLEL_JOBS,
      )
      logger.debug('GET_ALBUM_OBJ', { dirName, exifArr })
      for (const exif of exifArr) {
        const exifDate = new Date(getExifDate(exif) as string)
        if (exifDate && !isNaN(exifDate.getTime())) {
          logger.debug('GET_ALBUM_OBJ:EXIF', { dt: exifDate })
          if (!leastDate || exifDate < leastDate) {
            leastDate = exifDate
          }
        }
      }
      if (leastDate) {
        albumObj.date = leastDate.toISOString()
      }
    }
  }

  if (!albumObj.date) {
    albumObj.date = new Date().toISOString()
  }

  const dirEntries = await getDirEntries(join(ALBUMS_ROOT, dirName))

  // Track the thumbnail's on-disk path so we can attach a content hash, letting
  // the frontend cache-bust the album cover when its source bytes change.
  let thumbDiskPath: string | null = null
  if (albumObj.thumbnail) {
    const thumbName = albumObj.thumbnail as string
    thumbDiskPath = join(ALBUMS_ROOT, dirName, thumbName)
    albumObj.thumbnail = join(
      PHOTO_URL_BASE,
      uriPath,
      encodeURIComponent(thumbName),
    )
  } else {
    const thumbPath = await getAlbumDefaultThumbnailPath(dirName, dirEntries)
    if (thumbPath) {
      thumbDiskPath = join(ALBUMS_ROOT, dirName, ...thumbPath)
      albumObj.thumbnail = join(
        PHOTO_URL_BASE,
        uriPath,
        ...thumbPath.map(encodeURIComponent),
      )
    }
  }
  if (thumbDiskPath) {
    try {
      albumObj.thumbnailHash = (await getFileHash(thumbDiskPath)).substring(
        0,
        7,
      )
    } catch (e) {
      logger.warn('Could not hash album thumbnail', { thumbDiskPath, error: e })
    }
  }

  if (!albumObj.description) {
    const subdirCount = dirEntries.filter(d => d.isDirectory()).length
    const fileCount = dirEntries.filter(
      d => d.isFile() && isSupportedImageFile(d.name),
    ).length
    const parts: string[] = []
    if (subdirCount > 0) {
      parts.push(`${subdirCount} Album${subdirCount === 1 ? '' : 's'}`)
    }
    if (fileCount > 0) {
      parts.push(`${fileCount} Photo${fileCount === 1 ? '' : 's'}`)
    }
    if (parts.length > 0) {
      albumObj.description = parts.join(' / ')
    }
  }

  await mkdir(dirname(stdAlbumFname), { recursive: true, mode: 755 })
  await writeFile(stdAlbumFname, JSON.stringify(albumObj))
  logger.info('GET_ALBUM_OBJ - Wrote cache file', { stdAlbumFname })

  return albumObj
}

/*
 * Read the entries of a directory, filtering out Mac forbidden files.
 * Returns an empty array on permission errors.
 */
const getDirEntries = async (
  dirPath: string,
): Promise<import('fs').Dirent[]> => {
  try {
    return (await readdir(dirPath, { withFileTypes: true })).filter(
      d => !d.name.match(MAC_FORBIDDEN_FILES_REGEX),
    )
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'PERM' || err.code === 'EACCES') {
      logger.info('Permission Denied', { error: err })
      return []
    }
    if (err.code === 'ENOENT') {
      return []
    }
    logger.error('readdir error3', e as Error)
    throw e
  }
}

/*
 * Returns the default thumbnail for an album as an array of unencoded path
 * segments relative to the album directory. Picks the first supported image
 * in the directory; if none exist, recursively descends into subdirectories
 * (alphabetical descending, so date-prefixed dirs surface newest first).
 */
export const getAlbumDefaultThumbnailPath = async (
  reqPath: string,
  entries?: import('fs').Dirent[],
): Promise<string[] | null> => {
  const dirEntries =
    entries ?? (await getDirEntries(join(ALBUMS_ROOT, reqPath)))

  const imgFile = dirEntries.find(
    d => d.isFile() && isSupportedImageFile(d.name),
  )
  if (imgFile) return [imgFile.name]

  const subdirs = dirEntries
    .filter(d => d.isDirectory())
    .sort((a, b) => (a.name > b.name ? -1 : 1))
  for (const subdir of subdirs) {
    const subPath = await getAlbumDefaultThumbnailPath(
      join(reqPath, subdir.name),
    )
    if (subPath) return [subdir.name, ...subPath]
  }
  return null
}
