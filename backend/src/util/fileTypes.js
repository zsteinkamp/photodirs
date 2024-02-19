'use strict'

export function getOutputTypeForFile(filePath) {
  if (isVideo(filePath)) {
    return 'mp4'
  } else if (isGif(filePath)) {
    return 'gif'
  } else if (isPng(filePath)) {
    return 'png'
  }
  return 'jpg'
}
export function isSupportedImageFile(filePath) {
  return (
    isJpeg(filePath) ||
    isHeif(filePath) ||
    isRaw(filePath) ||
    isVideo(filePath) ||
    isPng(filePath)
  )
}
export function isJpeg(filePath) {
  return !!filePath.match(/(jpeg|jpg)$/i)
}
export function isHeif(filePath) {
  return !!filePath.match(/(heif|heic)$/i)
}
export function isGif(filePath) {
  return !!filePath.match(/(gif)$/i)
}
export function isPng(filePath) {
  return !!filePath.match(/(png)$/i)
}
export function isRaw(filePath) {
  return !!filePath.match(/(crw|cr2|cr3|dng|arw)$/i)
}
export function isVideo(filePath) {
  return !!filePath.match(/(avi|mov|mp4)$/i)
}
