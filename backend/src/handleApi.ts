import { dirname, basename } from 'path'

import { getAlbumObj, getExtendedAlbumObj } from './util/albumObj.js'
import { getFileObj } from './util/fileObj.js'

export const apiGetAlbum = async (
  albumPath: string,
): Promise<[number, Record<string, unknown>]> => {
  const albumObj = await getAlbumObj(albumPath)
  const extAlbumObj = await getExtendedAlbumObj(albumObj)
  return [200, extAlbumObj]
}

export const apiGetFile = async (
  reqPath: string,
): Promise<[number, Record<string, unknown>]> => {
  const fileObj = await getFileObj(dirname(reqPath), basename(reqPath))

  const albumObj = await getAlbumObj(fileObj.albumPath as string)
  fileObj.album = await getExtendedAlbumObj(albumObj)

  return [200, fileObj]
}
