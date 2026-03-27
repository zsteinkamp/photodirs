import fs from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import { ExiftoolProcess } from 'node-exiftool'
import * as fileTypes from './util/fileTypes.js'
import * as C from './constants.js'

export const SUCCESS = 200

const updateAlbumYML = (
  path: string,
  payload: Record<string, unknown>,
): void => {
  let lstat: fs.Stats | null = null
  const albumYmlFname = join(C.ALBUMS_ROOT, path, 'album.yml')

  try {
    lstat = fs.lstatSync(albumYmlFname)
  } catch (e) {
    // no problemo
  }

  let albumYmlData: Record<string, unknown> = {}
  if (lstat) {
    albumYmlData = yaml.load(fs.readFileSync(albumYmlFname, 'utf8')) as Record<
      string,
      unknown
    >
  }

  Object.assign(albumYmlData, payload)

  fs.writeFile(albumYmlFname, yaml.dump(albumYmlData), err => {
    if (err) {
      console.log(err)
    }
  })
}

const updateMediaProperty = async (
  path: string,
  payload: Record<string, unknown>,
): Promise<void> => {
  const fsPath = join(C.ALBUMS_ROOT, path)

  const isVideo = fileTypes.isVideo(fsPath)
  const isTitle = !!(payload && payload.title)
  const payloadProperty = isTitle ? 'title' : 'description'

  const exifProperty = {
    video: {
      title: C.EXIF_VIDEO_TITLE_PROPERTY,
      description: C.EXIF_VIDEO_DESCRIPTION_PROPERTY,
    },
    photo: {
      title: C.EXIF_TITLE_PROPERTY,
      description: C.EXIF_DESCRIPTION_PROPERTY,
    },
  }[isVideo ? 'video' : 'photo'][payloadProperty]

  const ep = new ExiftoolProcess('/usr/bin/exiftool')
  await ep.open()
  await ep.writeMetadata(
    fsPath,
    {
      [exifProperty]: payload[payloadProperty],
    },
    ['overwrite_original'],
  )
  await ep.close()
}

export const adminCall = async (
  path: string,
  reqBody: Record<string, unknown>,
): Promise<[number, Record<string, unknown>]> => {
  let lstat: fs.Stats | null = null

  try {
    lstat = fs.lstatSync(join(C.ALBUMS_ROOT, path))
  } catch (e) {
    console.warn('Unknown path', { path })
    return [404, { msg: 'Not Found', path }]
  }

  if (lstat!.isDirectory()) {
    await updateAlbumYML(path, reqBody)
  } else {
    await updateMediaProperty(path, reqBody)
  }
  return [SUCCESS, { path, reqBody }]
}
