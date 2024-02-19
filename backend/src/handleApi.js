'use strict'

// requires
const path = require('path')

const albumObjUtils = require('./util/albumObj')
const fileObjUtils = require('./util/fileObj')

const apiGetAlbum = async (albumPath) => {
  const albumObj = await albumObjUtils.getAlbumObj(albumPath)
  const extAlbumObj = await albumObjUtils.getExtendedAlbumObj(albumObj)
  return [200, extAlbumObj]
}

const apiGetFile = async (reqPath) => {
  // get the fileObj (includes exif)
  const fileObj = await fileObjUtils.getFileObj(
    path.dirname(reqPath),
    path.basename(reqPath)
  )

  // add album to fileObj
  const albumObj = await albumObjUtils.getAlbumObj(fileObj.albumPath)
  fileObj.album = await albumObjUtils.getExtendedAlbumObj(albumObj)

  return [200, fileObj]
}

module.exports = {
  apiGetFile,
  apiGetAlbum,
}
