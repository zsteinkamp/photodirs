'use strict'

export const ALBUMS_ROOT = '/albums'
export const API_BASE = '/api'
export const CACHE_ROOT = '/cache'
export const META_TITLE_PROPERTY = 'title'
export const META_DESCRIPTION_PROPERTY = 'description'
export const EXIF_TITLE_PROPERTY = 'ObjectName'
export const EXIF_DATE_PROPERTY = 'DateTimeOriginal'
export const EXIF_DESCRIPTION_PROPERTY = 'Caption-Abstract'
export const EXIF_VIDEO_TITLE_PROPERTY = 'Title'
export const EXIF_VIDEO_DESCRIPTION_PROPERTY = 'Description'
export const EXIF_VIDEO_DATE_PROPERTY = 'CreateDate'
export const EXIF_DETAIL_PROPERTIES = [
  'Make',
  'Model',
  'LensMake',
  'LensModel',
  'LensType',
  'FocalLength35efl',
  'ShutterSpeedValue',
  'ApertureValue',
  'ISO',
  'ExposureMode',
  'ExposureCompensation',
  'MeteringMode',
  'Flash',
  'GPSAltitude',
  'GPSImgDirection',
  'GPSLatitude',
  'GPSLongitude',
  'GPSSpeed',
  'GPSSpeedRef',
  'Orientation',
  'WhiteBalance',
]
import * as logger from './logger.js'
export const LOGGER = logger.default
export const MAC_FORBIDDEN_FILES_REGEX =
  /(\.fseventsd|\.DocumentRevisions-V100|\.TemporaryItems|\.Trashes)/
export const MAX_DIMENSION = 3000
export const MIN_DIMENSION = 16
export const PHOTO_URL_BASE = '/photo'
export const VIDEO_URL_BASE = '/video'
export const SIZE_PRESETS = {
  // default size
  null: { pregenerate: true, size: '1600x1600', crop: false },
  // define your shortcuts here
  tn: { pregenerate: true, size: '400x400', crop: true },
  xl: { size: '2400x2400', crop: false },
  orig: { size: 'orig' },
}
export const TYPE_ALBUM = 'album'
export const TYPE_PHOTO = 'photo'
export const TYPE_VIDEO = 'video'

export const WATCHER_PATH_CHECK_PORT = 3000
