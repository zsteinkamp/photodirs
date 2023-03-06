'use strict';

const fileTypes = module.exports = {
  /*
   * Returns the extension/type of the file we are going to output
   * Handy for some code here, such as `getSharpTransform`
   */
  getOutputTypeForFile: (filePath) => {
    if (fileTypes.isGif(filePath)) {
      return 'gif';
    } else if (fileTypes.isPng(filePath)) {
      return 'png';
    }
    return 'jpg';
  },

  /*
   * Return whether a given directory entry is a supported type of image.
   * TODO: do more than look at extension
   */
  isSupportedImageFile: (filePath) => {
    return fileTypes.isJpeg(filePath) ||
      fileTypes.isHeif(filePath) ||
      fileTypes.isRaw(filePath) ||
      fileTypes.isPng(filePath);
  },

  /*
   * Return whether a filename is for a JPEG file
   */
  isJpeg: (filePath) => {
    return !!filePath.match(/(jpeg|jpg)$/i);
  },

  /*
   * Return whether a filename is for a HEIC file
   */
  isHeif: (filePath) => {
    return !!filePath.match(/(heif|heic)$/i);
  },

  /*
   * Return whether a filename is for a GIF file
   */
  isGif: (filePath) => {
    return !!filePath.match(/(gif)$/i);
  },

  /*
   * Return whether a filename is for a PNG file
   */
  isPng: (filePath) => {
    return !!filePath.match(/(png)$/i);
  },

  /*
   * Return whether a filename is for a RAW file
   */
  isRaw: (filePath) => {
    return !!filePath.match(/(crw|cr2|dng|arw)$/i);
  }
};
