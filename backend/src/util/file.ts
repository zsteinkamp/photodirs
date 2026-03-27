import { stat, readdir, access } from 'fs/promises'
import glob from 'glob'
import { join } from 'path'

import { LOGGER, ALBUMS_ROOT } from '../constants.js'
import { isSupportedImageFile } from './fileTypes.js'

import * as fs from 'fs'
import * as crypto from 'crypto'

const logger = LOGGER

export async function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const fileStream = fs.createReadStream(filePath)

    fileStream.on('data', data => {
      hash.update(data)
    })

    fileStream.on('end', () => {
      resolve(hash.digest('hex'))
    })

    fileStream.on('error', err => {
      reject(`Error reading file: ${err.message}`)
    })
  })
}

export async function globPromise(pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, (err: Error | null, files: string[]) => {
      if (err) {
        reject(err)
      } else {
        resolve(files)
      }
    })
  })
}

export async function isFileOlderThanAny(
  testFile: string,
  compareArr: string[],
): Promise<boolean> {
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

export async function getSupportedFiles(dirName: string): Promise<string[]> {
  const albumDir = join(ALBUMS_ROOT, dirName)
  try {
    const dirFiles = (await readdir(albumDir, { withFileTypes: true }))
      .filter(dirEnt => dirEnt.isFile() && isSupportedImageFile(dirEnt.name))
      .map(dirEnt => dirEnt.name)
    logger.debug('getSupportedFiles', { dirName, dirFiles })
    return dirFiles
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'PERM' || err.code === 'EACCES') {
      logger.info('Permission Denied', { error: err })
      return []
    }
    logger.error('readdir error4', e as Error)
    throw e
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch (e) {
    return false
  }
}
