# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Photodirs

Filesystem-first photo/video gallery. Your directory structure is your album structure. Supports HEIC, RAW, and most video formats with auto-resizing and auto-transcoding. Metadata stored in standard EXIF and `album.yml` files.

## Development Commands

All builds and npm commands run inside the dev containers (not on the host). Use `make devshell` to get a shell, or `docker compose exec` to run commands.

```bash
make dev          # Start dev containers (hot-reload)
make devlogs      # Tail dev logs
make devshell     # Shell into watcher container
make devdown      # Stop dev containers
make              # Interactive config + start production containers
```

Dev mounts `../test-album` at `/albums` by default. Override per machine by creating `dev/.env` with `ALBUMS_PATH=/host/path/to/photos` (see `dev/.env.example`). `dev/.env` is gitignored.

Backend (inside container):
```bash
npm test        # Mocha tests
npm run lint    # ESLint
```

Frontend (inside container):
```bash
npm start       # React dev server
npm run build   # Production build
npm test        # React tests
```

## Architecture

Five Docker services behind an NGINX reverse proxy:

- **API** (`backend/src/api.js`) - Read-only public API. Serves album metadata, resized images (via Sharp), and video streams. Albums mounted read-only.
- **Watcher** (`backend/src/watcher.js`) - Monitors `/albums` directory on 60s intervals. Pre-converts RAW to JPEG, pre-resizes images, transcodes videos to MP4, caches metadata as JSON in `/cache`.
- **Admin** (`backend/src/admin.js`) - Authenticated mutations: edit album/file metadata, update EXIF. Has read-write access to `/albums`.
- **Frontend** (`frontend/`) - React 18 browsing UI. Fetches from API, groups files by date, supports keyboard navigation and swipe.
- **NGINX** - Routes `/api/*` and `/photo/*` to API, serves `/video/*` directly from cache, `/` to frontend.

## Key Backend Patterns

- **Metadata precedence:** EXIF -> XMP sidecar -> YAML file (`filename.yml` or `album.yml`)
- **Image processing:** Sharp with custom-built libvips (for HEIF/HEIC). Pre-sizes at 200px increments up to 1600px.
- **Request handlers:** `handleApi.js` (album/file metadata), `handleImage.js` (resize/crop), `handleVideo.js` (video serving), `handleAdmin.js` (admin mutations)
- **Utility modules:** `backend/src/util/` - `fileObj.js` (file metadata), `albumObj.js` (album metadata), `image.js` (conversions), `video.js` (transcoding), `exif.js` (EXIF reading), `cache.js` (cache paths)
- **Work queue:** Batched processing with configurable `MAX_PARALLEL_JOBS`

## Key Frontend Patterns

- JavaScript + partial TypeScript (`.tsx` for date components)
- `Browse.js` is the primary view component, renders `AlbumList` or `FileList`
- `AdminContext.js` provides admin mode state; `IsAdmin.js` wraps admin-only UI
- CSS uses `rem` units scaled by viewport for responsive design
- `getDateBins.ts` groups files by date for timeline display

## API Endpoints

- `GET /api/albums/:path` - Album listing with HATEOAS links
- `GET /photo/:path?size=HxW&crop` - Resized/cropped image
- `GET /video/:path` - Transcoded MP4 video
- `POST /api/admin/albums/...` - Admin mutations (via admin container)

## Docker Build

Custom multi-stage Dockerfile builds libvips 8.14 from source for HEIF support. CI builds 5 images for linux/amd64 and linux/arm64 via GitHub Actions, pushes to GHCR.
