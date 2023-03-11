const fsp = require('fs/promises');
const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// static resources should just be served as they are
app.use(express.static(
  path.resolve(__dirname, '..', 'build'),
  { index: false, maxAge: '30d' }
));

const indexPath  = path.resolve(__dirname, '..', 'build', 'index.html');
app.get('/*', async (req, res, next) => {
  let htmlData;
  try {
    htmlData = await fsp.readFile(indexPath, 'utf8');
  } catch (err) {
    console.error('Error during file reading', err);
    return res.status(404).end()
  }

  const url = path.join('http://nginx:3333/api/albums', req.path)
  const resp = await fetch(url);
  let body;
  try {
    body = await resp.json();
  } catch (err) {
    console.error('Error during body reading or parsing', err);
    return res.status(404).end()
  }

  if (body.type === 'photo') {
    body.thumbnail = body.photoPath;
  }

  // inject meta tags
  htmlData = htmlData.replace(
      "<title>React App</title>",
      `<title>${body.title}</title>`
    )
    .replace('__META_OG_TITLE__', body.title)
    .replace('__META_OG_DESCRIPTION__', body.description)
    .replace('__META_DESCRIPTION__', body.description)
    .replace('__META_OG_IMAGE__', body.thumbnail)

  return res.send(htmlData);
});

app.listen(PORT, (error) => {
  if (error) {
    return console.log('Error during app startup', error);
  }
  console.log("listening on " + PORT + "...");
});

