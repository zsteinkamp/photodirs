'use strict';

module.exports = {
  ALBUMS_ROOT: '/albums',
  API_BASE: '/api',
  CACHE_ROOT: '/cache',
  META_TITLE_PROPERTY: 'title',
  META_DESCRIPTION_PROPERTY: 'description',
  EXIF_TITLE_PROPERTY: 'ObjectName',
  EXIF_DESCRIPTION_PROPERTY: 'Caption-Abstract',
  EXIF_VIDEO_TITLE_PROPERTY: 'Title',
  EXIF_VIDEO_DESCRIPTION_PROPERTY: 'Description',
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
  SIZE_PRESETS: {
    // default size
    null: { pregenerate: true, size: '1600x1600', crop: false },
    // define your shortcuts here
    tn: { pregenerate: true, size: '400x400', crop: true },
    xl: { size: '2400x2400', crop: false },
    orig: { size: 'orig' }
  },
  TYPE_ALBUM: 'album',
  TYPE_PHOTO: 'photo',
  TYPE_VIDEO: 'video'
};
