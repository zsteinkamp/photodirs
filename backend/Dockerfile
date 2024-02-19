FROM node:18 AS dev

RUN apt-get update && apt-get install -y libraw-bin

##
# START HEIF/HEIC SUPPORT - custom libvips build
# mostly from https://github.com/jcupitt/docker-builds/blob/master/libvips-ubuntu20.04/Dockerfile
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get install -y \
      bc \
      build-essential \
      ffmpeg \
      glib-2.0-dev \
      jq \
      less \
      libexif-dev \
      libexpat-dev \
      libheif-dev \
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
FROM dev AS prod
ENV NODE_ENV=production
COPY ./src/ ./src/
# run the production api server (no watching)

CMD [ "npm", "run", "start:api" ]
