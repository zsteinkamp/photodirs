'use strict';

const express = require('express');
const app = express();
const port = 3000;
const handlers = require('./handlers');

app.get('/api/albums', async (req, res) => {
  const [body, status] = await handlers.getAlbums();
  res.status(status).send(body);
});

app.get(/api\/album\/(.+)/, async (req, res) => {
  const [body, status] = await handlers.getOneAlbum(req.params[0]);
  res.status(status).send(body);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
