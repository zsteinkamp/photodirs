'use strict'

import { logger as _logger } from 'express-winston'
import express from 'express'

import { adminGet } from './handleAdmin.js'
import { LOGGER, SIZE_PRESETS } from './constants.js'

const logger = LOGGER
const app = express()
const port = 3000

//more options here - https://github.com/bithavoc/express-winston#request-logging
//console.log('LOGGER=', logger)
app.use(
  _logger({
    winstonInstance: logger,
    meta: false,
    expressFormat: true,
  }),
)

// handles api root - indicates admin capability
app.get(new RegExp('^/api/admin/?$'), async (req, res) => {
  const body = {
    isAdmin: true,
  }
  res.status(200).header({ 'cache-control': 'no-cache' }).json(body)
})

app.get(new RegExp('^/api/admin(/.+)?'), async (req, res) => {
  try {
    //logger.info('API Request Received', { path: req.path })
    //res.status(200).send(req.path)
    const [status, body] = await adminGet(req)
    res.status(status).send(body)
  } catch (e) {
    return res.status(500).send(e.message)
  }
})

app.listen(port, () => {
  logger.info('ADMIN LISTENING', { port })
})
