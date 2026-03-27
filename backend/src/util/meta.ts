import { readFileSync } from 'fs'
import { load } from 'js-yaml'

import { LOGGER } from '../constants.js'
const logger = LOGGER

export async function fetchAndMergeMeta(
  dest: Record<string, unknown>,
  metaPath: string,
): Promise<Record<string, unknown>> {
  const meta = await getPathMeta(metaPath)
  Object.entries(meta).forEach(([key, val]) => {
    dest[key] = val
  })
  logger.debug('META', { metaPath, meta, dest })
  return dest
}

export async function getPathMeta(
  metaPath: string,
): Promise<Record<string, unknown>> {
  let fileContents: Buffer
  try {
    // TODO: figure out bug when this is async
    fileContents = readFileSync(metaPath)
  } catch (e) {
    // no meta file
    return {}
  }
  const meta = load(fileContents.toString()) as Record<string, unknown>
  if (meta.apiPath) {
    throw new Error(
      `Metadata file at ${metaPath} cannot contain a property called 'apiPath'.`,
    )
  }
  return meta
}
