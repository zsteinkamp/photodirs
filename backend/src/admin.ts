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

const geocodeCache = new Map<string, unknown[]>()
app.get('/api/admin/geocode', async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (!q) {
    return res.status(400).json({ error: 'missing q' })
  }
  if (geocodeCache.has(q)) {
    return res.status(200).json({ results: geocodeCache.get(q) })
  }
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=' +
      encodeURIComponent(q)
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'photodirs/1.0 (zack@steinkamp.us)',
        'Accept-Language': 'en',
      },
    })
    if (!resp.ok) {
      return res
        .status(502)
        .json({ error: 'geocoder error', status: resp.status })
    }
    const data = (await resp.json()) as Array<{
      display_name: string
      lat: string
      lon: string
    }>
    const results = data.map(d => ({
      label: d.display_name,
      lat: parseFloat(d.lat),
      lon: parseFloat(d.lon),
    }))
    geocodeCache.set(q, results)
    return res.status(200).json({ results })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
})

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
