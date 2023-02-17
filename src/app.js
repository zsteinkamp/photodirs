'use strict';

const express = require('express');
const app = express();
const port = 3000;
const handlers = require('./handlers');

// handles root, album, and file metadata requests
app.get(/api\/albums(\/.+)?/, async (req, res) => {
  const [body, status] = await handlers.apiGetForPath(req.params[0] || '/');
  res.status(status).send(body);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
