# photodirs

A photo album service with the following design goals:

* Publicly accessible (no authentication requried)
* Directories are automatically mapped to albums
* Directories can be arbitrarily deep
* Filesystem changes (e.g. new photos or directories) are immediately reflected
in app output
* Directories can have an optional YAML metadata file to override title
(directory name is default), provide a description, specify an album image,
    disable display, control photo sort order, optional file includelist, etc.
* HEIC and RAW files (CRW, CR2, etc) are converted to JPEG when served.
* Converted/scaled images are cached locally. (expiration / size limit?)
* Support for video (transcoding?)
* Flexible URL-based resizing and cropping options for photo download

## REST API

### GET /api/album
Return the list of photo albums.
```
[
  { 
    "title": "Hawaii Vacation 2023",
    "path": "/api/album/2023-03-01_hawaii",
    "description": "Some cool photos",
    "thumbnail": "/photo/2023-03-01_hawaii/CRW_1234.CR2"
  },
  ...
]
```

### GET /api/album/:dirname
Returns metadata for a specific album.
```
{
  "title": "Hawaii Vacation 2023",
  "description": "Some cool photos",
  "thumb": "/photo/2023-03-01_hawaii/CRW_1234.CR2"
  "subdirs": [
    "waterfall",
    "beach"
  ],
  "images": [
    "/photo/2023-03-01_hawaii/CRW_1000.CR2",
    "/photo/2023-03-01_hawaii/IMG_1234.jpg",
    "/photo/2023-03-01_hawaii/IMG_1235.heic"
  ]
}
```

Optionally append `?deep=1` to the URL to recurse subdirectories when building the `images`
array.

### GET /api/photo/:dirname/:filename
Returns metadata for a given photo. Metadata can come from the EXIF data
embedded in the photo, and XMP sidecar file, or a YAML file with the same name
as the photo, just with a `.yml` extension (e.g. `IMG_1024.jpg.yml`).

```
{
  ... TODO ...
}
```

### GET /photo/:dirname/:filename?:options
Returns a file, with options honored.

Options can include:
* `maxwidth=N` - specify a maximum width
* `maxheight=N` - specify a maximum height
* `mode=(fit|crop)` - if both `maxwidth` and `maxheight` are given, specifies
whether to fit the scaled image into the given box dimensions (i.e. may return
  an image that is smaller than the specified box) or fensure the box is
completely filled (may crop some of the image).

Examples:
* `/photo/2023-03-01_hawaii/CRW_1000.CR2` Will return a JPEG image with
dimensions the same as the original.
* `/photo/2023-03-01_hawaii/CRW_1000.CR2?maxwidth=1000&maxheight=1000&mode=crop`
Will always return a 1000x1000px JPEG image, cropping the long side if it is not
square.
* `/photo/2023-03-01_hawaii/CRW_1000.CR2?maxwidth=1000&maxheight=1000&mode=fit`
Will return JPEG image whose long side is 1000px.

To cut down on abuse/DOS possibilities, the `maxwidth` and `maxheight` parameters are
rounded up to the nearest 200px when actually generating the images, and an
ceiling of 4000px is enforced. Ensure you account for this when displaying the
images to your users!

## Utilizes
* Sharp - JPEG resizing
* Darktable - RAW/HEIC conversion
* Node.js
* node-tdd-base - The most primitive framework for a nice Node.js dev experience

## Requirements

## Running the App
```
docker compose run app
```

## Developing
```
docker compose run dev
```

## Installing NPM Modules

To install a new NPM module, first stop your dev container. To do this, run (in another terminal window):
```
docker compose down
```
Then you can run the npm command this way:
```
docker compose run dev npm install --save my-cool-module
```
NPM will do its thing inside the container, and afterward you will see that the `package.json` and `package-lock.json` files have been updated.

Now rebuild the container:
```
docker compose build
```
And then bring up the dev container again:
```
docker compose run dev
```
