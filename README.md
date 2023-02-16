# photodirs

A photo, and photo album service with the following design goals:

* Publicly accessible (no authentication requried)
* Directories are automatically mapped to albums
* Filesystem changes (e.g. new photos or directories) are immediately reflected
in app output
* Directories can have an optional YAML metadata file to override title
(directory name is default), provide a description, specify an album image,
    disable display, control photo sort order, optional file includelist, etc.
* Support for RAW files (CRW, CR2, etc)
* Support for video (transcoding?)
* Flexible URL-based resizing and cropping options for photo download

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
