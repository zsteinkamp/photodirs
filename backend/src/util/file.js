'use strict'

import { stat, readdir, access } from 'fs/promises'
import glob from 'glob'
import { join } from 'path'

import { LOGGER, ALBUMS_ROOT } from '../constants.js'
import { isSupportedImageFile } from './fileTypes.js'

import * as fs from 'fs'
import * as crypto from 'crypto'

const logger = LOGGER

export async function getFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256') // You can use 'md5', 'sha1', etc.
    const fileStream = fs.createReadStream(filePath)

    fileStream.on('data', data => {
      hash.update(data)
    })

    fileStream.on('end', () => {
      resolve(hash.digest('hex')) // Resolve the promise with the hash
    })

    fileStream.on('error', err => {
      reject(`Error reading file: ${err.message}`) // Reject the promise on error
    })
  })
}

export async function globPromise(pattern) {
  return new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if (err) {
        reject(err)
      } else {
        resolve(files)
      }
    })
  })
}
export async function isFileOlderThanAny(testFile, compareArr) {
  if (await fileExists(testFile)) {
    const testFileMtime = (await stat(testFile)).mtime
    for (const compareFile of compareArr) {
      if (await fileExists(compareFile)) {
        if (testFileMtime < (await stat(compareFile)).mtime) {
          return true
        }
      }
    }
  }
  return false
}
export async function getSupportedFiles(dirName) {
  const albumDir = join(ALBUMS_ROOT, dirName)
  try {
    const dirFiles = (await readdir(albumDir, { withFileTypes: true }))
      .filter(dirEnt => dirEnt.isFile() && isSupportedImageFile(dirEnt.name))
      .map(dirEnt => dirEnt.name)
    logger.debug('getSupportedFiles', { dirName, dirFiles })
    return dirFiles
  } catch (e) {
    if (e.code === 'PERM' || e.code === 'EACCES') {
      logger.info('Permission Denied', { error: e })
      return []
    }
    logger.error('readdir error4', e)
    throw e
  }
}
export async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch (e) {
    return false
  }
}
