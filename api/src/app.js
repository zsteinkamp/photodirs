'use strict';

const express = require('express');
const app = express();
const port = 3000;

const handlers = require('./handlers');
const watcher = require('./watcher');

// kick off the watcher
watcher.start();

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
