'use strict'

import { join } from 'path'
import { ExiftoolProcess } from 'node-exiftool'

import {
  LOGGER,
  ALBUMS_ROOT,
  EXIF_DETAIL_PROPERTIES,
  EXIF_DATE_PROPERTY,
  EXIF_VIDEO_DATE_PROPERTY,
  META_TITLE_PROPERTY,
  EXIF_TITLE_PROPERTY,
  EXIF_VIDEO_TITLE_PROPERTY,
  META_DESCRIPTION_PROPERTY,
  EXIF_DESCRIPTION_PROPERTY,
  EXIF_VIDEO_DESCRIPTION_PROPERTY,
} from '../constants.js'
import { isSupportedImageFile } from './fileTypes.js'
import { fetchAndMergeMeta } from './meta.js'

const logger = LOGGER

/*
 * Convenience method to load the exif reader and return the Detail props.
 */
export const getExifForFile = async reqPath => {
  const exifObj = await exifUtils.getExifObjForFile(reqPath)
  return exifUtils.getExifDetailProps(exifObj)
}

/*
 * Return an object filled with EXIF for a given file, or empty object.
 */
export const getExifObjForFile = async reqPath => {
  let ret = {}

  const filePath = join(ALBUMS_ROOT, reqPath)

  logger.debug('GET_EXIF_FOR_FILE', { filePath })
  if (!isSupportedImageFile(filePath)) {
    return ret
  }

  const ep = new ExiftoolProcess('/usr/bin/exiftool')
  await ep.open()
  const meta = await ep.readMetadata(filePath) //, ['-File:all']);
  await ep.close()

  // Sometimes we get an array back
  ret = meta.data[0] || meta.data || {}

  if (meta.error) {
    logger.error('EXIFTOOL ERROR', { err: meta.error })
  }

  const fileYML = filePath + '.yml'
  ret = await fetchAndMergeMeta(ret, fileYML)

  return ret
}

/*
 * Given a full EXIF object, return the properties that will be shown in the exif panel.
 */
export const getExifDetailProps = exif => {
  const ret = {}
  for (const prop of EXIF_DETAIL_PROPERTIES) {
    if (exif[prop]) {
      ret[prop] = exif[prop]
    }
  }
  return ret
}

/*
 * Get exif title
 */
export const getExifDate = exif => {
  let exifDate =
    exif[EXIF_DATE_PROPERTY] || exif[EXIF_VIDEO_DATE_PROPERTY] || null
  if (exifDate) {
    // the EXIF library outputs the date in a funny format
    exifDate =
      exifDate.substr(0, 10).replaceAll(':', '-') +
      'T' +
      exifDate.substr(11, 8) +
      'Z'
  }
  return exifDate
}

/*
 * Get exif title
 */
export const getExifTitle = exif => {
  return (
    exif[META_TITLE_PROPERTY] ||
    exif[EXIF_TITLE_PROPERTY] ||
    exif[EXIF_VIDEO_TITLE_PROPERTY] ||
    null
  )
}

/*
 * Get exif description
 */
export const getExifDescription = exif => {
  return (
    exif[META_DESCRIPTION_PROPERTY] ||
    exif[EXIF_DESCRIPTION_PROPERTY] ||
    exif[EXIF_VIDEO_DESCRIPTION_PROPERTY] ||
    null
  )
}
