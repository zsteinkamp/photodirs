'use strict'

import { readFileSync } from 'fs'
import { load } from 'js-yaml'

import { LOGGER } from '../constants.js'
const logger = LOGGER

export async function fetchAndMergeMeta(dest, metaPath) {
  const meta = await getPathMeta(metaPath)
  Object.entries(meta).forEach(([key, val]) => {
    dest[key] = val
  })
  logger.debug('META', { metaPath, meta, dest })
  return dest
}
export async function getPathMeta(metaPath) {
  let fileContents
  try {
    // TODO: figure out bug when this is async
    fileContents = readFileSync(metaPath)
  } catch (e) {
    // no meta file
    return {}
  }
  const meta = load(fileContents)
  if (meta.apiPath) {
    throw new Error(
      `Metadata file at ${metaPath} cannot contain a property called 'apiPath'.`,
    )
  }
  return meta
}
