'use strict'

import fsp from 'fs/promises'
import path from 'path'

import * as C from '../constants.js'
const logger = C.LOGGER
import * as cacheUtils from './cache.js'
import * as fileUtils from './file.js'
import * as fileTypes from './fileTypes.js'
import * as exifUtils from './exif.js'
import * as metaUtils from './meta.js'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
dayjs.extend(utc)

/*
 * returns the standard File object
 */
export const getFileObj = async (albumPath, fileName) => {
  logger.debug('getFileObj', { albumPath, fileName })
  const fileObjMetaFname = cacheUtils.getFileObjMetadataFname(
    albumPath,
    fileName,
  )
  const filePath = path.join(C.ALBUMS_ROOT, albumPath, fileName)
  const fileStat = await fsp.stat(filePath)
  logger.debug('GET_FILE_OBJ:TOP', { fileObjMetaFname, filePath })
  const fileYML = filePath + '.yml'
  if (await fileUtils.fileExists(fileObjMetaFname)) {
    logger.debug('GET_FILE_OBJ:EXISTS', { fileObjMetaFname })
    const metaStat = await fsp.stat(fileObjMetaFname)

    let ymlStat = null
    if (await fileUtils.fileExists(fileYML)) {
      ymlStat = await fsp.stat(fileYML)
    }
    const useCache =
      metaStat.mtime >= fileStat.mtime &&
      (!ymlStat || metaStat.mtime >= ymlStat.mtime)
    logger.debug('GET_FILE_OBJ:STATS', {
      ms: metaStat.mtime,
      fs: fileStat.mtime,
      ys: ymlStat && ymlStat.mtime,
      useCache,
      fileName,
    })
    // check to see if the cached metadata file is not older than the album file it relates to
    if (useCache) {
      logger.debug('RETURN CACHE', { fileObjMetaFname })
      try {
        return JSON.parse(
          await fsp.readFile(fileObjMetaFname, { encoding: 'utf8' }),
        )
      } catch (e) {
        logger.warn('Error parsing JSON', { fileObjMetaFname })
        return {}
      }
    }
  }
  logger.debug('GET_FILE_OBJ:NOCACHE', {
    fileObjMetaFname,
    albumPath,
    fileName,
  })
  const uriAlbumPath = albumPath.split('/').map(encodeURIComponent).join('/')
  const uriFileName = encodeURIComponent(fileName)
  const reqPath = path.join('/', albumPath, fileName)

  // Get exif data
  const exifObj = await exifUtils.getExifObjForFile(reqPath)
  const fileTitle = exifUtils.getExifTitle(exifObj) || fileName
  const fileDescription = exifUtils.getExifDescription(exifObj) || ''
  const exifDate = exifUtils.getExifDate(exifObj)
  const fileExif = exifUtils.getExifDetailProps(exifObj)
  const isVideo = fileTypes.isVideo(fileName)

  // Get YML Meta if there
  const fileMeta = await metaUtils.fetchAndMergeMeta({}, fileYML)

  const dates = {
    exif: exifDate,
    ctime: fileStat.ctime,
    meta: fileMeta.date,
  }

  const fileObj = {
    type: isVideo ? C.TYPE_VIDEO : C.TYPE_PHOTO,
    title: fileTitle,
    date: dates.meta || dates.exif || dates.ctime,
    dates: dates,
    description: fileDescription,
    fileName: fileName,
    albumPath: albumPath,
    meta: fileMeta,
    path: reqPath,
    uriPath: path.join('/', uriAlbumPath, uriFileName),
    photoPath: path.join(C.PHOTO_URL_BASE, uriAlbumPath, uriFileName),
    apiPath: path.join(C.API_BASE, C.ALBUMS_ROOT, uriAlbumPath, uriFileName),
    exif: fileExif,
  }

  if (isVideo) {
    fileObj.videoPath = path.join(C.VIDEO_URL_BASE, uriAlbumPath, uriFileName)
  }

  // write out the file for next time
  await fsp.mkdir(path.dirname(fileObjMetaFname), {
    recursive: true,
    mode: 755,
  })
  await fsp.writeFile(fileObjMetaFname, JSON.stringify(fileObj))
  logger.info('GET_FILE_OBJ - Wrote cache file', { fileObjMetaFname })

  return fileObj
}
