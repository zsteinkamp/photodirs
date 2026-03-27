import fsp from 'fs/promises'
import path from 'path'
import { Response } from 'express'

import * as C from './constants.js'
import { handleImage } from './handleImage.js'
import { handleVideo } from './handleVideo.js'
import { apiGetAlbum, apiGetFile } from './handleApi.js'
import * as fileUtils from './util/file.js'

export const apiGet = async (
  reqPath: string,
): Promise<[number, Record<string, unknown>]> => {
  const filePath = path.join(C.ALBUMS_ROOT, reqPath)
  if (!(await fileUtils.fileExists(filePath))) {
    return [404, { error: 'API: directory or file not found' }]
  }

  if ((await fsp.stat(filePath)).isDirectory()) {
    return apiGetAlbum(reqPath)
  }
  return apiGetFile(reqPath)
}

export const photoGet = async (
  reqPath: string,
  size: string | undefined,
  crop: string | boolean | undefined,
  res: Response,
): Promise<void> => {
  const filePath = path.join(C.ALBUMS_ROOT, reqPath)
  if (!(await fileUtils.fileExists(filePath))) {
    res.status(404).send({ error: 'PHOTO: directory or file not found' })
    return
  }

  handleImage(filePath, size, crop, res)
}

export const videoGet = async (
  reqPath: string,
  res: Response,
): Promise<void> => {
  const filePath = path.join(C.ALBUMS_ROOT, reqPath)
  if (!(await fileUtils.fileExists(filePath))) {
    res.status(404).send({ error: 'VIDEO: directory or file not found' })
    return
  }

  handleVideo(filePath, res)
}
