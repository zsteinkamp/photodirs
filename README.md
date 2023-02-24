# photodirs

A photo cropping/resizing service with a basic browsing interface. Use it to serve images on your site/blog as well as to host image galleries.

Photodirs was made with the following design goals:

* A basic browsing interface
* Flexible URL-based resizing and cropping options for photos
* Ergonomic photo URLs (i.e. no UUIDs anywhere)
* Publicly accessible (no authentication requried)
* Your directory structure is your album structure
* Directories can be nested arbitrarily deep
* New files or directories are immediately available, and popular resizing is triggered by file create
* Directories can have an optional YAML metadata file to override title
(directory name is default), provide a description, specify an album image,
    disable display, control photo sort order, optional file includelist, or anything else you would like to include
* Support for EXIF/XMP metadata as well as a simple YAML sidecar format
* HEIC and RAW files (DNG, CRW, CR2, etc) are converted to JPEG when served
* Converted/scaled images are cached locally

TODO
* Support for video (transcoding?)

## Running photodirs

Photodirs requires Docker Compose to run.

You will need to edit the `/albums` volume in the `docker-compose.yml` file to point to your album root. See the last line here:

```
  api:
    build: ./api
    environment:
      TERM: xterm
    volumes:
      - ./api:/app
      - api_node_modules:/app/node_modules
      - cache:/cache
      - /PATH/TO/YOUR/ALBUMS:/albums
```

To start the service, run:

```
docker compose up
```

This will start the necessary backend services and an nginx proxy listening on port 3333.

## Fetching Photos

### GET /:path-to-image?:options
Returns a file, with options honored. Images can even be in the root directory.

Options can include:
* `size=( HxW | orig )` - specify a maximum image size as Height x Width. By default, images are resized to fit in a 1600px square box.
* `crop` - fill the box of the specified size, cropping the image

Examples:
* `/2023-03-01_hawaii/CRW_1000.CR2?size=orig` Will return a JPEG image with
dimensions the same as the original.
* `/2023-03-01_hawaii/CRW_1000.CR2?size=200x200&crop`
Will always return a 200x200px JPEG image, cropping the long side if it is not
square.
* `/2023-03-01_hawaii/CRW_1000.CR2?size=1000x1000`
Will return JPEG image whose long side is 1000px, i.e. will fit inside of the specified `size` box without cropping.


## REST API

### GET /api/albums
### GET /api/albums/:album-path
Return photo albums and any supported files in the given path. Note the HATEOS-friendly `apiPath` property.
```
{
  "type": "album",
  "title": "My Awesome Photo Gallery",
  "description": "My cool collection of photos",
  "thumb": "/photo/2023-03-01_hawaii/CRW_1234.CR2"
  "albums": [
    { 
      "type": "album",
      "title": "Hawaii Vacation 2023",
      "date": "2023-03-01T00:00:00.000Z",
      "apiPath": "/api/album/2023-03-01_hawaii",
      "path": "/2023-03-01_hawaii",
      "description": "Some cool photos",
      "thumbnail": "/photo/2023-03-01_hawaii/CRW_1234.CR2"
    },
    ...
  ],
  "files": [
    {
      type: "photo"
      name: "greydangle.jpg"
      apiPath: "/api/albums/2023-02-03_foggo_dangles/greydangle.jpg"
      path: "/2023-02-03_foggo_dangles/greydangle.jpg"
      photoPath: "/photo/2023-02-03_foggo_dangles/greydangle.jpg"
    }, 
    ...
  ]
}
```

### GET /api/photo/:album/:file
Returns metadata for a given photo. Metadata can come from the EXIF data
embedded in the photo, an XMP sidecar file, or a YAML file with the same name
as the photo, just with a `.yml` extension (e.g. `IMG_1024.jpg.yml`).

```
{
  "type": "photo",
  "name": "IMG_7809.JPG",
  "path": "/2023-02-10_yahoo_with%20ben/IMG_7809.JPG",
  "photoPath": "/photo/2023-02-10_yahoo_with%20ben/IMG_7809.JPG",
  "apiPath": "/api/albums/2023-02-10_yahoo_with%20ben/IMG_7809.JPG",
  "album": {
    "type": "album",
    "title": "2023-02-10_yahoo_with ben",
    "date": "2023-02-19T18:48:13.452Z",
    "path": "/2023-02-10_yahoo_with%20ben",
    "apiPath": "/api/albums/2023-02-10_yahoo_with%20ben",
    "description": "Food! Bars! Bazzd!",
    "thumbnail": null
  },
  "exif": {
    "Make": "Apple",
    "Model": "iPhone 12 Pro",
    "Orientation": "top-left",
    "DateTime": "2023:02:09 13:47:02",
    "ExposureTime": "1/173",
    "ExposureProgram": "Normal program",
    "ISOSpeedRatings": 25,
    "ShutterSpeedValue": "1/173",
    "ApertureValue": "2.40",
    "ExposureBiasValue": "0",
    "MeteringMode": "Pattern",
    "Flash": "Flash did not fire, compulsory flash mode",
    "FocalLength": "1.54 mm",
    "ExposureMode": "Auto exposure",
    "WhiteBalance": "Auto white balance",
    "FocalLengthIn35mmFilm": 14,
    "LensSpecification": "1.5399999618512084-6 mm f/2.4",
    "LensMake": "Apple",
    "LensModel": "iPhone 12 Pro back triple camera 1.54mm f/2.4",
    "GPSLatitude": 37.41822777777777,
    "GPSLongitude": 122.02579444444444,
    "GPSAltitude": "32.95594792224006 m",
    "GPSSpeed": "0",
    "GPSSpeedRef": "Kilometers per hour",
    "GPSImgDirection": "126.96919263456091"
  }
}
```

## Utilizes / Props
* [Sharp](https://sharp.pixelplumbing.com/) - JPEG conversion and resizing
* [dcraw](https://www.dechifro.org/dcraw/) - Convert RAW to TIFF for ingestion by Sharp to make a JPEG
* [node-tdd-base](https://github.com/zsteinkamp/node-tdd-base) - The most primitive framework for a nice Node.js dev experience

## Requirements
The ability to run x86_64 Docker images.

## Running the App
```
NODE_ENV=production docker compose up
```

## Caching
Converting large RAW or HEIF images is slow, as is resizing large JPEGs. Photodirs caches converted/resized images in 200 pixel increments, up to 3000px. This protects against a bad actor filling your cache disk by requesting every possible image size.

You can still request any image size, and Photodirs will use the cached image that is equal to or greater than the size you are requesting to fulfill your request, resizing it on-the-fly to your specification. The `Cache-control: public` header is sent with images, so that intermediate web caches, CDNs, and browsers will cache the final output.

## Developing
```
docker compose up
```
The source files are mounted read/write in the frontend and API containers and the services are run in "watch" mode, so any edits you make to the source files are immediately reflected in the UI or API.

## TODO
Random dumping ground / rough sort of pending features or ideas. Put yours here too!

* Improve watcher for handle renames and deletes better.
* Video support
* Production mode (i.e. build static UI, run without watchers or livereload
  websocket)
