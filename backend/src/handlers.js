'use strict'

import fsp from 'fs/promises'
import path from 'path'

import * as C from './constants.js'
import handleImage from './handleImage.js'
import { handleVideo } from './handleVideo.js'
import { apiGetAlbum, apiGetFile } from './handleApi.js'
import * as fileUtils from './util/file.js'

// Handles both album and file metadata requests
export const apiGet = async reqPath => {
  const filePath = path.join(C.ALBUMS_ROOT, reqPath)
  if (!(await fileUtils.fileExists(filePath))) {
    return [404, { error: 'API: directory or file not found' }]
  }

  if ((await fsp.stat(filePath)).isDirectory()) {
    return apiGetAlbum(reqPath)
  }
  return apiGetFile(reqPath)
}

// For delivering resized/cropped images
export const photoGet = async (reqPath, size, crop, res) => {
  const filePath = path.join(C.ALBUMS_ROOT, reqPath)
  if (!(await fileUtils.fileExists(filePath))) {
    return res.status(404).send({ error: 'PHOTO: directory or file not found' })
  }

  // File exists so convert/resize/send it
  handleImage(filePath, size, crop, res)
}

// For delivering video
export const videoGet = async (reqPath, res) => {
  const filePath = path.join(C.ALBUMS_ROOT, reqPath)
  if (!(await fileUtils.fileExists(filePath))) {
    return res.status(404).send({ error: 'VIDEO: directory or file not found' })
  }

  // File exists so send it
  handleVideo(filePath, res)
}
