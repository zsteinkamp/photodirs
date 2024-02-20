'use strict'

import fs from 'fs'
import yaml from 'js-yaml'
import { ExiftoolProcess } from 'node-exiftool'
import * as fileTypes from './util/fileTypes.js'
import * as C from './constants.js'

const updateAlbumYML = (path, property, payload) => {
  console.log('UPDATE ALBUM YML', { path, property, payload })
  let lstat = null
  const albumYmlFname = path + '/album.yml'

  // try to see if the object referenced by pathStr exists
  try {
    lstat = fs.lstatSync(albumYmlFname)
  } catch (e) {
    // no problemo
  }

  let albumYmlData = {}
  if (lstat) {
    // file exists, so read in the YAML
    console.log('FIlE EXISTS ' + albumYmlFname)
    albumYmlData = yaml.load(fs.readFileSync(albumYmlFname, 'utf8'))
  }
  albumYmlData[property] = payload.val

  // write out the metadata to the album.yml file
  fs.writeFile(albumYmlFname, yaml.dump(albumYmlData), err => {
    if (err) {
      console.log(err)
    }
  })
}
const updateMediaProperty = async (path, property, payload) => {
  console.log('UPDATE MEDIA PROPERTY', { path, property, payload })
  const ep = new ExiftoolProcess('/usr/bin/exiftool')
  await ep.open()
  const isVideo = fileTypes.isVideo(path)
  const isTitle = property === 'title'
  const exifProperty = {
    video: {
      title: C.EXIF_VIDEO_TITLE_PROPERTY,
      description: C.EXIF_VIDEO_DESCRIPTION_PROPERTY,
    },
    photo: {
      title: C.EXIF_TITLE_PROPERTY,
      description: C.EXIF_DESCRIPTION_PROPERTY,
    },
  }[isVideo ? 'video' : 'photo'][property]
  await ep.writeMetadata(
    path,
    {
      [exifProperty]: payload.val,
    },
    ['overwrite_original'],
  )
  await ep.close()
}

export const adminCall = async (path, reqBody) => {
  const pathParts = path.split('/')
  const property = pathParts.pop()

  let lstat = null
  const pathStr = pathParts.join('/')

  // try to see if the object referenced by pathStr exists
  try {
    lstat = fs.lstatSync(pathStr)
  } catch (e) {
    console.warn('Unknoown path [' + pathStr + ']')
    return [404, { msg: 'Not Found', path: pathStr }]
  }

  if (lstat.isDirectory()) {
    await updateAlbumYML(pathStr, property, reqBody)
  } else {
    await updateMediaProperty(pathStr, property, reqBody)
  }
  return [200, { path, reqBody }]
}
