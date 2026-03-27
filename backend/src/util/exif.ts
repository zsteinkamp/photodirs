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
export const getExifForFile = async (
  reqPath: string,
): Promise<Record<string, unknown>> => {
  const exifObj = await getExifObjForFile(reqPath)
  return getExifDetailProps(exifObj)
}

/*
 * Return an object filled with EXIF for a given file, or empty object.
 */
export const getExifObjForFile = async (
  reqPath: string,
): Promise<Record<string, unknown>> => {
  let ret: Record<string, unknown> = {}

  const filePath = join(ALBUMS_ROOT, reqPath)

  logger.debug('GET_EXIF_FOR_FILE', { filePath })
  if (!isSupportedImageFile(filePath)) {
    return ret
  }

  const ep = new ExiftoolProcess('/usr/bin/exiftool')
  await ep.open()
  const meta = await ep.readMetadata(filePath)
  await ep.close()

  // Sometimes we get an array back
  const data = meta.data as Record<string, unknown>[] | Record<string, unknown>
  ret = (Array.isArray(data) ? data[0] : data) || {}

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
export const getExifDetailProps = (
  exif: Record<string, unknown>,
): Record<string, unknown> => {
  const ret: Record<string, unknown> = {}
  for (const prop of EXIF_DETAIL_PROPERTIES) {
    if (exif[prop]) {
      ret[prop] = exif[prop]
    }
  }
  return ret
}

/*
 * Get exif date
 */
export const getExifDate = (exif: Record<string, unknown>): string | null => {
  let exifDate =
    (exif[EXIF_DATE_PROPERTY] as string) ||
    (exif[EXIF_VIDEO_DATE_PROPERTY] as string) ||
    null
  if (exifDate) {
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
export const getExifTitle = (exif: Record<string, unknown>): string | null => {
  return (
    (exif[META_TITLE_PROPERTY] as string) ||
    (exif[EXIF_TITLE_PROPERTY] as string) ||
    (exif[EXIF_VIDEO_TITLE_PROPERTY] as string) ||
    null
  )
}

/*
 * Get exif description
 */
export const getExifDescription = (
  exif: Record<string, unknown>,
): string | null => {
  return (
    (exif[META_DESCRIPTION_PROPERTY] as string) ||
    (exif[EXIF_DESCRIPTION_PROPERTY] as string) ||
    (exif[EXIF_VIDEO_DESCRIPTION_PROPERTY] as string) ||
    null
  )
}
