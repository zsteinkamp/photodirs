'use strict';

const express = require('express');
const app = express();
const port = 3000;
const handlers = require('./handlers');

// handles api root (HATEOS)
app.get(new RegExp('^/api/?$'), async (req, res) => {
  const body = {
    albums: '/api/albums'
  };
  res.status(200).send(body);
});

// handles album, and file metadata requests
app.get(new RegExp('^/api/albums(/.+)?'), async (req, res) => {
  const [status, body] = await handlers.apiGet(req.params[0] || '/');
  res.status(status).send(body);
});

// handles photo requests
app.get(new RegExp('^/photo/(.+)'), async (req, res) => {
  // sends the response on its own
  handlers.photoGet(req.params[0], req.query.size, req.query.crop, res);
});

app.listen(port, () => {
  console.log(`photodirs listening on port ${port}`);
});
