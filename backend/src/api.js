'use strict';

const expressWinston = require('express-winston');
const express = require('express');
const app = express();
const port = 3000;

const handlers = require('./handlers');

const C = require('./constants');
const logger = C.LOGGER;

//more options here - https://github.com/bithavoc/express-winston#request-logging
app.use(expressWinston.logger({
  winstonInstance: logger,
  meta: false,
  expressFormat: true
}));

// handles api root (HATEOS)
app.get(new RegExp('^/api/?$'), async (req, res) => {
  const body = {
    albums: '/api/albums'
  };
  res.status(200).send(body);
});

// handles album, and file metadata requests
app.get(new RegExp('^/api/albums(/.+)?'), async (req, res) => {
  try {
    const [status, body] = await handlers.apiGet(req.params[0] || '/');
    res.status(status).send(body);
  } catch (e) {
    return res.status(500).send(e.message);
  }
});

// handles photo requests
app.get(new RegExp('^/photo/(.+)'), async (req, res) => {
  try {
    // support size/crop presets
    const queryKeys = Object.keys(req.query);
    if (queryKeys.length === 1) {
      const queryPreset = C.SIZE_PRESETS[queryKeys[0]];
      // preset just slides into query params
      req.query.size = queryPreset.size;
      req.query.crop = queryPreset.crop;
    }
    // sends the response on its own
    await handlers.photoGet(req.params[0], req.query.size, req.query.crop, res);
  } catch (e) {
    return res.status(500).send(e.message);
  }
});

// handles video requests
app.get(new RegExp('^/video/(.+)'), async (req, res) => {
  try {
    // sends the response on its own
    await handlers.videoGet(req.params[0], res);
  } catch (e) {
    return res.status(500).send(e.message);
  }
});

app.listen(port, () => {
  logger.info('API LISTENING', { port });
});
