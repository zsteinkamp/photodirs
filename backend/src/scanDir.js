'use strict'

import { readdir } from 'fs/promises'
import { join } from 'path'
import fastq from 'fastq'

import { LOGGER, ALBUMS_ROOT, MAC_FORBIDDEN_FILES_REGEX } from './constants.js'
import { getAlbumObj, getExtendedAlbumObj } from './util/albumObj.js'
import { promiseAllInBatches } from './util/batch.js'
import { getFileObj } from './util/fileObj.js'
import { isRaw, isVideo } from './util/fileTypes.js'
import { getSupportedFiles } from './util/file.js'
import { jpegFileForRaw, jpegFileForVideo, preResize } from './util/image.js'
import * as videoUtils from './util/video.js'

const logger = LOGGER

// Bring up a single-worker queue for video transcoding
const transcoder = async ({ filePath }) => {
  return await videoUtils.getCachedVideoPath(filePath)
}
const transcodingQueue = fastq.promise(transcoder, 1)

export const scanDirectory = async dirName => {
  logger.debug('SCAN_DIRECTORY:TOP', { dirName })

  // do a depth-first traversal so we can build the directory metadata from the bottom up
  let subdirs
  try {
    subdirs = (
      await readdir(join(ALBUMS_ROOT, dirName), {
        withFileTypes: true,
      })
    ).filter(
      dirEnt =>
        dirEnt.isDirectory() && !dirEnt.name.match(MAC_FORBIDDEN_FILES_REGEX),
    )

    // recurse into subdirs before continuing
    await promiseAllInBatches(
      subdirs,
      dirEnt => scanDirectory(join(dirName, dirEnt.name)),
      10,
    )

    // get the list of supported files in this directory
    const dirFiles = await getSupportedFiles(dirName)

    logger.debug('SCAN_DIRECTORY:MID', { dirName, dirFiles })

    // first write the file objs
    await promiseAllInBatches(dirFiles, fName => getFileObj(dirName, fName), 10)

    // now cache the 400x400 and 1000x1000 size
    await promiseAllInBatches(
      dirFiles,
      async fName => {
        let absFname = join('/albums', dirName, fName)
        if (isRaw(absFname)) {
          // convert raw file
          const jpegPath = await jpegFileForRaw(absFname)
          logger.debug('PRE-CONVERT RAW', { absFname, jpegPath })
          absFname = jpegPath
        } else if (isVideo(absFname)) {
          transcodingQueue.push({ filePath: absFname })
          const posterPath = await jpegFileForVideo(absFname)
          logger.debug('PRE-GENERATE VIDEO THUMBNAIL', {
            absFname,
            posterPath,
          })
          absFname = posterPath
        }
        // resize the file to common sizes
        await preResize(absFname)
      },
      10,
    )

    // write the standard album obj
    const albumObj = await getAlbumObj(dirName)

    // write the extended album obj
    await getExtendedAlbumObj(albumObj)
    logger.debug('CHECKED/WROTE METADATAS', { dirName })
  } catch (e) {
    if (e.code === 'PERM' || e.code === 'EACCES') {
      logger.info('Permission Denied', { error: e })
      return null
    } else if (e.code === 'ENOENT') {
      logger.info('Path not found', { dirName })
      return null
    } else {
      logger.error('readdir error5', {
        keys: Object.keys(e),
        code: e.code,
        errno: e.errno,
      })
      throw e
    }
  }
}
