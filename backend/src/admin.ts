import { logger as _logger } from 'express-winston'
import express, { Request, Response, NextFunction } from 'express'
import bodyParser from 'body-parser'
import path from 'path'

import { adminCall, SUCCESS as adminSUCCESS } from './handleAdmin.js'
import { LOGGER } from './constants.js'

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

app.get(new RegExp('^/api/admin/?$'), async (_req, res) => {
  const body = {
    isAdmin: true,
  }
  res.status(200).header({ 'cache-control': 'no-cache' }).json(body)
})

app.use(bodyParser.json())

app.all(new RegExp('^/api/admin/albums(/.*)'), async (req, res) => {
  try {
    logger.info('API Request Received', { path: req.path })
    const reqBody = req.body
    const objectPath = req.params[0]
    const [status, body] = await adminCall(objectPath, reqBody)
    if (status === adminSUCCESS) {
      const flushPath = path.dirname(objectPath)
      await fetch('http://watcher:3000' + flushPath)
    }
    res.status(status).json(body)
  } catch (e) {
    return res.status(500).send((e as Error).message)
  }
})

app.all('*', (_req, res) => {
  res.status(404).json({ error: 404, msg: '404 not found' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: 500, err })
})

app.listen(port, () => {
  logger.info('ADMIN LISTENING', { port })
})
