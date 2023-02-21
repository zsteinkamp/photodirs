'use strict';

const chokidar = require('chokidar');
const express = require('express');
const app = express();
const port = 3000;

const handlers = require('./handlers');
const utils = require('./utils');
const C = require('./constants');

/*
 * Set up album directory watcher. Currently pre-generates jpegs from raw files.
 */
const chokidarDebounce = {};
chokidar.watch(C.ALBUMS_ROOT, { ignoreInitial: true }).on('all', (event, path) => {
  console.log('WATCH', { event, path });
  if (chokidarDebounce[path]) {
    clearTimeout(chokidarDebounce[path]);
  }
  chokidarDebounce[path] = setTimeout(async (event, path) => {
    if (event === 'add' || event === 'change') {
      if (utils.isRaw(path)) {
        // convert raw file
        const cachePath = await utils.jpegFileForRaw(path);
        console.log('PRE-CONVERT RAW', { path, cachePath });
      }
    }
    chokidarDebounce[path] = null;
  }, 1000, event, path); // last args are passed as args to callback
});

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
    console.error(e.message);
    return res.status(500).send(e.message);
  }
});

// handles photo requests
app.get(new RegExp('^/photo/(.+)'), async (req, res) => {
  try {
    // sends the response on its own
    handlers.photoGet(req.params[0], req.query.size, req.query.crop, res);
  } catch (e) {
    console.error(e.message);
    //return res.status(500).send(e.message);
  }
});

app.listen(port, () => {
  console.log(`photodirs listening on port ${port}`);
});
