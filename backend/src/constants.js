'use strict';

module.exports = {
  ALBUMS_ROOT: '/albums',
  API_BASE: '/api',
  CACHE_ROOT: '/cache',
  EXIF_TITLE_PROPERTY: 'Object Name',
  EXIF_DESCRIPTION_PROPERTY: 'Caption/Abstract',
  EXIF_DETAIL_PROPERTIES: [
    'Make',
    'Model',
    'Orientation',
    'DateTime',
    'ExposureTime',
    'ExposureProgram',
    'ISOSpeedRatings',
    'ShutterSpeedValue',
    'ApertureValue',
    'ExposureBiasValue',
    'MeteringMode',
    'Flash',
    'FocalLength',
    'ExposureMode',
    'WhiteBalance',
    'FocalLengthIn35mmFilm',
    'LensSpecification',
    'LensMake',
    'LensModel',
    'GPSLatitude',
    'GPSLongitude',
    'GPSAltitude',
    'GPSSpeed',
    'GPSSpeedRef',
    'GPSImgDirection'
  ],
  LOGGER: require('./logger'),
  MAC_FORBIDDEN_FILES_REGEX: /(\.DocumentRevisions-V100|.TemporaryItems)/,
  MAX_DIMENSION: 3000,
  MIN_DIMENSION: 16,
  PHOTO_URL_BASE: '/photo',
  VIDEO_URL_BASE: '/video',
  TYPE_ALBUM: 'album',
  TYPE_PHOTO: 'photo',
  TYPE_VIDEO: 'video'
};
