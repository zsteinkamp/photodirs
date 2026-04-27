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

const updateMediaOrientation = async (
  path: string,
  orientation: number,
): Promise<void> => {
  const fsPath = join(C.ALBUMS_ROOT, path)
  const ep = new ExiftoolProcess('/usr/bin/exiftool')
  await ep.open()
  await ep.writeMetadata(fsPath, { Orientation: orientation }, [
    'overwrite_original',
    'n',
  ])
  await ep.close()
}

interface LocationPayload {
  lat: number
  lon: number
  label?: string | null
}

const updateMediaLocation = async (
  path: string,
  location: LocationPayload | null,
): Promise<void> => {
  const fsPath = join(C.ALBUMS_ROOT, path)
  const ep = new ExiftoolProcess('/usr/bin/exiftool')
  await ep.open()
  if (location === null) {
    await ep.writeMetadata(
      fsPath,
      {
        GPSLatitude: '',
        GPSLatitudeRef: '',
        GPSLongitude: '',
        GPSLongitudeRef: '',
        'XMP-iptcCore:Location': '',
        [C.EXIF_LOCATION_LABEL_FALLBACK]: '',
      },
      ['overwrite_original'],
    )
  } else {
    const { lat, lon, label } = location
    await ep.writeMetadata(
      fsPath,
      {
        GPSLatitude: Math.abs(lat),
        GPSLatitudeRef: lat >= 0 ? 'N' : 'S',
        GPSLongitude: Math.abs(lon),
        GPSLongitudeRef: lon >= 0 ? 'E' : 'W',
        'XMP-iptcCore:Location': label ?? '',
      },
      ['overwrite_original'],
    )
  }
  await ep.close()
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
  } else if (typeof reqBody.orientation === 'number') {
    await updateMediaOrientation(path, reqBody.orientation)
  } else if ('location' in reqBody) {
    await updateMediaLocation(path, reqBody.location as LocationPayload | null)
  } else {
    await updateMediaProperty(path, reqBody)
  }
  return [SUCCESS, { path, reqBody }]
}
