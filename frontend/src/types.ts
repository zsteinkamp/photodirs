export interface BreadcrumbItem {
  title: string
  path: string
  apiPath: string
}

export interface PhotoLocation {
  lat: number
  lon: number
  label: string | null
}

export interface AlbumFile {
  type: 'photo' | 'video'
  name: string
  apiPath: string
  path: string
  photoPath: string
  uriPath: string
  albumPath: string
  fileName: string
  title: string
  hash?: string
  videoPath?: string
  description?: string
  date?: string
  location?: PhotoLocation | null
}

export interface AlbumSummary {
  type: 'album'
  title: string
  date?: string
  apiPath: string
  path: string
  uriPath: string
  description?: string | string[]
  thumbnail?: string
  thumbnailHash?: string
}

export interface AlbumData {
  type: 'album'
  title: string
  description?: string
  date?: string
  path: string
  apiPath: string
  uriPath: string
  thumbnail?: string
  thumbnailHash?: string
  sortAlbums?: string
  albums: AlbumSummary[]
  files: AlbumFile[]
  breadcrumb: BreadcrumbItem[]
}

export interface MediaData {
  type: 'photo' | 'video'
  title: string
  description?: string
  date?: string
  path: string
  photoPath: string
  videoPath?: string
  exif?: Record<string, string>
  album: {
    uriPath: string
    files: AlbumFile[]
    title: string
  }
  breadcrumb: BreadcrumbItem[]
}

export type ApiData = AlbumData | MediaData
