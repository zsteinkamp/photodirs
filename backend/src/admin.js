'use strict'

import { logger as _logger } from 'express-winston'
import express from 'express'
import bodyParser from 'body-parser'
import path from 'path'

import { adminCall, SUCCESS as adminSUCCESS } from './handleAdmin.js'
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

// duh no kidding how to do JSON REST
app.use(bodyParser.json())

app.all(new RegExp('^/api/admin/albums(/.*)'), async (req, res) => {
  try {
    logger.info('API Request Received', { path: req.path })
    const reqBody = req.body
    const objectPath = req.params[0] //.replace(/^\/admin/, '')
    const [status, body] = await adminCall(objectPath, reqBody)
    //console.log(
    //  'OUT HERE', {
    //  objectPath,
    //  status,
    //  adminSUCCESS,
    //  is: status === adminSUCCESS }
    //)
    if (status === adminSUCCESS) {
      // ping watcher with the path
      const flushPath = path.dirname(objectPath)
      //console.log('IN HERE', { flushPath })
      await fetch('http://watcher:3000' + flushPath)
    }
    res.status(status).json(body)
  } catch (e) {
    return res.status(500).send(e.message)
  }
})

app.all('*', (req, res) => {
  res.status(404).json({ error: 404, msg: '404 not found' })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 500, err })
})

app.listen(port, () => {
  logger.info('ADMIN LISTENING', { port })
})
