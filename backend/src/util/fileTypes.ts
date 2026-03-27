export function getOutputTypeForFile(filePath: string): string {
  if (isVideo(filePath)) {
    return 'mp4'
  } else if (isGif(filePath)) {
    return 'gif'
  } else if (isPng(filePath)) {
    return 'png'
  }
  return 'jpg'
}
export function isSupportedImageFile(filePath: string): boolean {
  return (
    isJpeg(filePath) ||
    isHeif(filePath) ||
    isRaw(filePath) ||
    isVideo(filePath) ||
    isPng(filePath)
  )
}
export function isJpeg(filePath: string): boolean {
  return !!filePath.match(/(jpeg|jpg)$/i)
}
export function isHeif(filePath: string): boolean {
  return !!filePath.match(/(heif|heic)$/i)
}
export function isGif(filePath: string): boolean {
  return !!filePath.match(/(gif)$/i)
}
export function isPng(filePath: string): boolean {
  return !!filePath.match(/(png)$/i)
}
export function isRaw(filePath: string): boolean {
  return !!filePath.match(/(crw|cr2|cr3|dng|arw)$/i)
}
export function isVideo(filePath: string): boolean {
  return !!filePath.match(/(avi|mov|mp4)$/i)
}
