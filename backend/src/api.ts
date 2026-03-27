import { logger as _logger } from 'express-winston'
import express from 'express'

import { apiGet, photoGet, videoGet } from './handlers.js'
import { LOGGER, SIZE_PRESETS } from './constants.js'

const logger = LOGGER
const app = express()
const port = 3000

app.use(
  _logger({
    winstonInstance: logger,
    meta: false,
    expressFormat: true,
  }),
)

app.get(new RegExp('^/api/?$'), async (_req, res) => {
  const body = {
    albums: '/api/albums',
  }
  res.status(200).header({ 'cache-control': 'no-cache' }).send(body)
})

app.get(new RegExp('^/api/admin/?$'), async (_req, res) => {
  const body = {
    isAdmin: false,
  }
  res.status(200).header({ 'cache-control': 'no-cache' }).json(body)
})

app.get(new RegExp('^/api/albums(/.+)?'), async (req, res) => {
  try {
    const [status, body] = await apiGet(req.params[0] || '/')
    res.status(status).header({ 'cache-control': 'no-cache' }).send(body)
  } catch (e) {
    return res.status(500).send((e as Error).message)
  }
})

app.get(new RegExp('^/photo/(.+)'), async (req, res) => {
  try {
    const queryKeys = Object.keys(req.query)
    if (queryKeys.length === 1) {
      const queryPreset = SIZE_PRESETS[queryKeys[0]]
      if (queryPreset) {
        req.query.size = queryPreset.size
        req.query.crop = queryPreset.crop as unknown as string
      }
    }
    await photoGet(
      req.params[0],
      req.query.size as string | undefined,
      req.query.crop as string | undefined,
      res,
    )
  } catch (e) {
    return res.status(500).send((e as Error).message)
  }
})

app.get(new RegExp('^/video/(.+)'), async (req, res) => {
  try {
    await videoGet(req.params[0], res)
  } catch (e) {
    return res.status(500).send((e as Error).message)
  }
})

app.listen(port, () => {
  logger.info('API LISTENING', { port })
})
