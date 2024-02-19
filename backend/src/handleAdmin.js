'use strict'

import fs from 'fs'
import yaml from 'js-yaml'

const updateAlbumYML = (path, property, payload) => {
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

  console.log('UPDATE ALBUM YML', { path, property, payload })
}
const updateMediaProperty = (path, property, payload) => {
  console.log('UPDATE MEDIA PROPERTY', { path, property, payload })
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
