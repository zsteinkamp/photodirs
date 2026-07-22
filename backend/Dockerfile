FROM node:18 AS dev

RUN apt-get update && apt-get install -y libraw-bin

##
# START HEIF/HEIC SUPPORT - custom libvips build
# mostly from https://github.com/jcupitt/docker-builds/blob/master/libvips-ubuntu20.04/Dockerfile
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
      bc \
      build-essential \
      cmake \
      ffmpeg \
      glib-2.0-dev \
      jq \
      less \
      libde265-dev \
      libexif-dev \
      libexpat-dev \
      libimage-exiftool-perl \
      libjpeg62-turbo-dev \
      liblcms2-dev \
      liborc-dev \
      libpng-dev \
      librsvg2-dev \
      libtiff-dev \
      meson \
      ninja-build \
      python3-pip \
      software-properties-common \
      wget

WORKDIR /usr/local/src

# START libheif build from source
# The Debian bookworm `libheif-dev` package ships libheif 1.15.1, whose
# hardcoded auxiliary-image-reference security limit rejects HEIC files that
# carry multiple auxiliary images (e.g. iPhone depth/HDR-gain-map photos) with
# "Too many auxiliary image references". Build a current libheif so libvips
# (below) links against it. libde265 provides the HEVC decoder; we only decode
# HEIC (never encode), so no x265/aom encoder is needed.
ARG LIBHEIF_VERSION=1.20.2
RUN mkdir libheif \
        && cd libheif \
        && wget -q https://github.com/strukturag/libheif/releases/download/v${LIBHEIF_VERSION}/libheif-${LIBHEIF_VERSION}.tar.gz -O - | tar xfz - --strip-components 1 \
        && cmake -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF -DWITH_EXAMPLES=OFF --install-prefix /usr/local -B build . \
        && cmake --build build -j"$(nproc)" \
        && cmake --install build \
        && ldconfig
# Make the freshly built libheif discoverable by libvips' meson/pkg-config probe.
ENV PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
# END libheif

ARG VIPS_BRANCH=8.14
ARG VIPS_URL=https://github.com/libvips/libvips/tarball

RUN mkdir libvips-${VIPS_BRANCH} \
        && cd libvips-${VIPS_BRANCH} \
        && wget ${VIPS_URL}/${VIPS_BRANCH} -O - | tar xfz - --strip-components 1

# "--libdir lib" makes it put the library in /usr/local/lib
# we don't need GOI
RUN cd libvips-${VIPS_BRANCH} \
        && rm -rf build \
        && meson build --libdir lib -Dintrospection=false --buildtype release \
        && cd build \
        && ninja \
        && ninja test \
        && ninja install
# END
##

# node packages
WORKDIR /app/backend
COPY package*.json ./
RUN npm ci

## HACK to get sharp/VIPS to work for HEIF support
ENV LD_LIBRARY_PATH=/usr/local/lib
## END HACK

# ergonomics
RUN echo "alias ll='ls -la'" >> /root/.bashrc
RUN echo "alias ..='cd ..'" >> /root/.bashrc

# by default, start the dev api server (watches for changes and restarts itself)
CMD [ "npm", "run", "watch:api" ]

## PRODUCTION BUILD BELOW
FROM dev AS prod-base
COPY ./src/ ./src/
COPY ./tsconfig.json ./
RUN npm run build
ENV NODE_ENV=production

FROM prod-base AS api
CMD [ "npm", "run", "start:api:prod" ]

FROM prod-base AS watcher
CMD [ "npm", "run", "start:watcher:prod" ]

FROM prod-base AS admin
CMD [ "npm", "run", "start:admin:prod" ]
