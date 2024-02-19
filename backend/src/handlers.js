'use strict'

// requires
const fsp = require('fs/promises')
const path = require('path')

const C = require('./constants')
const handleImage = require('./handleImage')
const handleVideo = require('./handleVideo')
const { apiGetAlbum, apiGetFile } = require('./handleApi')
const fileUtils = require('./util/file')

module.exports = {
  // Handles both album and file metadata requests
  apiGet: async (reqPath) => {
    const filePath = path.join(C.ALBUMS_ROOT, reqPath)
    if (!(await fileUtils.fileExists(filePath))) {
      return [404, { error: 'API: directory or file not found' }]
    }

    if ((await fsp.stat(filePath)).isDirectory()) {
      return apiGetAlbum(reqPath)
    }
    return apiGetFile(reqPath)
  },
  // For delivering resized/cropped images
  photoGet: async (reqPath, size, crop, res) => {
    const filePath = path.join(C.ALBUMS_ROOT, reqPath)
    if (!(await fileUtils.fileExists(filePath))) {
      return res
        .status(404)
        .send({ error: 'PHOTO: directory or file not found' })
    }

    // File exists so convert/resize/send it
    handleImage(filePath, size, crop, res)
  },
  // For delivering video
  videoGet: async (reqPath, res) => {
    const filePath = path.join(C.ALBUMS_ROOT, reqPath)
    if (!(await fileUtils.fileExists(filePath))) {
      return res
        .status(404)
        .send({ error: 'VIDEO: directory or file not found' })
    }

    // File exists so send it
    handleVideo(filePath, res)
  },
}
