'use strict';

module.exports = {
  ALBUMS_ROOT: '/albums',
  API_BASE: '/api',
  CACHE_ROOT: '/cache',
  EXIF_TITLE_PROPERTY: 'ObjectName',
  EXIF_DESCRIPTION_PROPERTY: 'Caption-Abstract',
  EXIF_DETAIL_PROPERTIES: [
    'DateTimeOriginal',
    'Make',
    'Model',
    'LensMake',
    'LensModel',
    'LensID',
    'LensType',
    'FocalLength',
    'FocalLength35efl',
    'ShutterSpeedValue',
    'ApertureValue',
    'ISO',
    'ExposureMode',
    'ExposureProgram',
    'ExposureTime',
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
    'WhiteBalance'
  ],
  LOGGER: require('./logger'),
  MAC_FORBIDDEN_FILES_REGEX: /(\.fseventsd|\.DocumentRevisions-V100|.TemporaryItems)/,
  MAX_DIMENSION: 3000,
  MIN_DIMENSION: 16,
  PHOTO_URL_BASE: '/photo',
  VIDEO_URL_BASE: '/video',
  TYPE_ALBUM: 'album',
  TYPE_PHOTO: 'photo',
  TYPE_VIDEO: 'video'
};
