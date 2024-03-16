'use strict'

import fs from 'fs'
import { join } from 'path'
import yaml from 'js-yaml'
import { ExiftoolProcess } from 'node-exiftool'
import * as fileTypes from './util/fileTypes.js'
import * as C from './constants.js'

export const SUCCESS = 200

const updateAlbumYML = (path, payload) => {
  //console.log('UPDATE ALBUM YML', { path, payload })
  let lstat = null
  const albumYmlFname = join(C.ALBUMS_ROOT, path, 'album.yml')

  try {
    lstat = fs.lstatSync(albumYmlFname)
  } catch (e) {
    // no problemo
  }

  let albumYmlData = {}
  if (lstat) {
    // file exists, so read in the YAML
    //console.log('FIlE EXISTS ' + albumYmlFname)
    albumYmlData = yaml.load(fs.readFileSync(albumYmlFname, 'utf8'))
  }

  // override values from the YML with the payload
  Object.assign(albumYmlData, payload)

  // write out the metadata to the album.yml file
  fs.writeFile(albumYmlFname, yaml.dump(albumYmlData), err => {
    if (err) {
      console.log(err)
    }
  })
}

const updateMediaProperty = async (path, payload) => {
  const fsPath = join(C.ALBUMS_ROOT, path)
  //console.log('UPDATE MEDIA PROPERTY', { fsPath, payload })

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

export const adminCall = async (path, reqBody) => {
  let lstat = null

  try {
    //console.warn('HEREZZZ', { path, fspath: join(C.ALBUMS_ROOT, path) })
    lstat = fs.lstatSync(join(C.ALBUMS_ROOT, path))
  } catch (e) {
    console.warn('Unknown path', { path })
    return [404, { msg: 'Not Found', path }]
  }

  if (lstat.isDirectory()) {
    await updateAlbumYML(path, reqBody)
  } else {
    await updateMediaProperty(path, reqBody)
  }
  return [SUCCESS, { path, reqBody }]
}
