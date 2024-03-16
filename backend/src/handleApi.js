'use strict'

import { dirname, basename } from 'path'

import { getAlbumObj, getExtendedAlbumObj } from './util/albumObj.js'
import { getFileObj } from './util/fileObj.js'

export const apiGetAlbum = async albumPath => {
  const albumObj = await getAlbumObj(albumPath)
  const extAlbumObj = await getExtendedAlbumObj(albumObj)
  return [200, extAlbumObj]
}

export const apiGetFile = async reqPath => {
  // get the fileObj (includes exif)
  const fileObj = await getFileObj(dirname(reqPath), basename(reqPath))

  // add album to fileObj
  const albumObj = await getAlbumObj(fileObj.albumPath)
  fileObj.album = await getExtendedAlbumObj(albumObj)

  return [200, fileObj]
}
