'use strict'

import { logger as _logger } from 'express-winston'
import express from 'express'
const app = express()
const port = 3000

import { apiGet, photoGet, videoGet } from './handlers.js'
import { LOGGER, SIZE_PRESETS } from './constants.js'
const logger = LOGGER

//more options here - https://github.com/bithavoc/express-winston#request-logging
//console.log('LOGGER=', logger)
app.use(
  _logger({
    winstonInstance: logger,
    meta: false,
    expressFormat: true,
  }),
)

// handles api root (HATEOS)
app.get(new RegExp('^/api/?$'), async (req, res) => {
  const body = {
    albums: '/api/albums',
  }
  res.status(200).send(body)
})

// handles album, and file metadata requests
app.get(new RegExp('^/api/albums(/.+)?'), async (req, res) => {
  try {
    const [status, body] = await apiGet(req.params[0] || '/')
    res.status(status).send(body)
  } catch (e) {
    return res.status(500).send(e.message)
  }
})

// handles photo requests
app.get(new RegExp('^/photo/(.+)'), async (req, res) => {
  try {
    // support size/crop presets
    const queryKeys = Object.keys(req.query)
    if (queryKeys.length === 1) {
      const queryPreset = SIZE_PRESETS[queryKeys[0]]
      if (queryPreset) {
        // preset just slides into query params
        req.query.size = queryPreset.size
        req.query.crop = queryPreset.crop
      }
    }
    // sends the response on its own
    await photoGet(req.params[0], req.query.size, req.query.crop, res)
  } catch (e) {
    return res.status(500).send(e.message)
  }
})

// handles video requests
app.get(new RegExp('^/video/(.+)'), async (req, res) => {
  try {
    // sends the response on its own
    await videoGet(req.params[0], res)
  } catch (e) {
    return res.status(500).send(e.message)
  }
})

app.listen(port, () => {
  logger.info('API LISTENING', { port })
})
