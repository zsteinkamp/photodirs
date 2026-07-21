import { join } from 'path'
import { ExiftoolProcess } from 'node-exiftool'

import {
  LOGGER,
  ALBUMS_ROOT,
  EXIF_DETAIL_PROPERTIES,
  EXIF_DATE_PROPERTY,
  EXIF_VIDEO_DATE_PROPERTY,
  EXIF_VIDEO_CREATION_DATE_PROPERTY,
  META_TITLE_PROPERTY,
  EXIF_TITLE_PROPERTY,
  EXIF_VIDEO_TITLE_PROPERTY,
  META_DESCRIPTION_PROPERTY,
  EXIF_DESCRIPTION_PROPERTY,
  EXIF_VIDEO_DESCRIPTION_PROPERTY,
  EXIF_LOCATION_LABEL_PROPERTY,
  EXIF_LOCATION_LABEL_FALLBACK,
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
  // Photos store DateTimeOriginal as local wall-clock (no timezone). Videos have
  // no DateTimeOriginal: their CreateDate is UTC, which would shift them by the
  // capture timezone offset relative to photos and scramble the interleaved
  // order. CreationDate carries the local wall-clock (with offset), so prefer it
  // for videos. We keep only the wall-clock portion (dropping any offset) so
  // photos and videos are compared on the same footing.
  const exifDate =
    (exif[EXIF_DATE_PROPERTY] as string) ||
    (exif[EXIF_VIDEO_CREATION_DATE_PROPERTY] as string) ||
    (exif[EXIF_VIDEO_DATE_PROPERTY] as string) ||
    null
  if (!exifDate) {
    return null
  }
  return (
    exifDate.substr(0, 10).replaceAll(':', '-') +
    'T' +
    exifDate.substr(11, 8) +
    'Z'
  )
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

/*
 * Get normalized location from EXIF as { lat, lon, label } or null.
 * Parses default DMS strings like "37 deg 32' 5.13\" N" combined with
 * GPSLatitudeRef / GPSLongitudeRef.
 */
export interface Location {
  lat: number
  lon: number
  label: string | null
}
const parseDms = (raw: unknown): { value: number; sign: string } | null => {
  if (raw == null) return null
  if (typeof raw === 'number') return { value: Math.abs(raw), sign: '' }
  const s = String(raw).trim()
  const m = s.match(/^(-?[\d.]+)\s*deg\s+([\d.]+)'\s+([\d.]+)"?\s*([NSEW]?)$/i)
  if (!m) {
    const f = parseFloat(s)
    return isFinite(f) ? { value: Math.abs(f), sign: '' } : null
  }
  const deg = parseFloat(m[1])
  const min = parseFloat(m[2])
  const sec = parseFloat(m[3])
  const value = Math.abs(deg) + min / 60 + sec / 3600
  return { value, sign: m[4].toUpperCase() }
}
const refSign = (ref: unknown, embedded: string): -1 | 1 => {
  const r = String(ref ?? '')
    .toUpperCase()
    .charAt(0)
  const e = embedded.toUpperCase()
  if (r === 'S' || r === 'W' || e === 'S' || e === 'W') return -1
  return 1
}
export const getExifLocation = (
  exif: Record<string, unknown>,
): Location | null => {
  const lat = parseDms(exif['GPSLatitude'])
  const lon = parseDms(exif['GPSLongitude'])
  if (!lat || !lon) return null
  const latVal = lat.value * refSign(exif['GPSLatitudeRef'], lat.sign)
  const lonVal = lon.value * refSign(exif['GPSLongitudeRef'], lon.sign)
  if (!isFinite(latVal) || !isFinite(lonVal)) return null
  const label =
    (exif[EXIF_LOCATION_LABEL_PROPERTY] as string) ||
    (exif[EXIF_LOCATION_LABEL_FALLBACK] as string) ||
    null
  return { lat: latVal, lon: lonVal, label }
}
