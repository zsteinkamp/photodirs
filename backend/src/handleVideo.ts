import { Response } from 'express'
import { LOGGER } from './constants.js'
import { getOutputTypeForFile } from './util/fileTypes.js'
import { getCachedVideoPath } from './util/video.js'

const logger = LOGGER

export const handleVideo = async (
  filePath: string,
  res: Response,
): Promise<void> => {
  const cachedVideoPath = await getCachedVideoPath(filePath)

  if (!cachedVideoPath) {
    res.status(500).send()
    return
  }

  logger.info('HANDLE VIDEO', { filePath, cachedVideoPath })

  res.type(`video/${getOutputTypeForFile(cachedVideoPath)}`)
  res.set('Cache-control', 'public, max-age=86400')
  res.sendFile(cachedVideoPath)
}
