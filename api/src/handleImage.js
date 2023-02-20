'use strict';

// requires
const fs = require('fs');
const sharp = require('sharp');
const utils = require('./utils');

const C = require('./constants');

module.exports = async (filePath, size, crop, res) => {
  // Initialize these here up top
  let width = 1600;
  let height = 1600;

  if (typeof size === 'string') {
    if (size === 'orig') {
      // Return original file ... express takes care of Content-Type!
      return res.sendFile(filePath);
    }

    // User provided size ... has to match
    const matches = size.match(/^(?<width>\d+)x(?<height>\d+)$/);
    if (matches) {
      width = Math.max(Math.min(parseInt(matches.groups.width), C.MAX_DIMENSION), C.MIN_DIMENSION);
      height = Math.max(Math.min(parseInt(matches.groups.height), C.MAX_DIMENSION), C.MIN_DIMENSION);
    }
  }

  // Crop is given as a boolean query string param, e.g. `?crop`
  crop = (typeof crop !== 'undefined');

  const resizeOptions = {
    width: width,
    height: height,
    fit: crop ? sharp.fit.cover : sharp.fit.inside
  };

  if (utils.isRaw(filePath)) {
    // RAW handling -- convert to JPEG, cache, and return JPEG filename.
    // Will return JPEG filename immediately if already cached.
    filePath = await utils.jpegFileForRaw(filePath);
  }

  // getCachedImagePath is also responsible for resizing the image and caching it
  const cachedImagePath = await utils.getCachedImagePath(filePath, resizeOptions);

  const readStream = fs.createReadStream(cachedImagePath);
  const transform = utils.getSharpTransform(cachedImagePath, resizeOptions);

  // Set the correct Content-Type header
  res.type(`image/${utils.getOutputTypeForFile(cachedImagePath)}`);
  // Stream the image through the transformer and out to the response.
  return readStream.pipe(transform).pipe(res);
};