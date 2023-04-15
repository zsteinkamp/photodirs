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
		jq \
		less \
    libimage-exiftool-perl \
		ninja-build \
		python3-pip \
		software-properties-common \
		wget

# we need meson for libvips build
RUN pip3 install meson

# stuff we need to build our own libvips ... this is a pretty random selection
# of dependencies, you'll want to adjust these
RUN apt-get install -y \
	glib-2.0-dev \
	libexpat-dev \
	librsvg2-dev \
	libpng-dev \
	libjpeg62-turbo-dev \
	libtiff-dev \
	libexif-dev \
	liblcms2-dev \
	libheif-dev \
	liborc-dev

WORKDIR /usr/local/src

# build the head of the stable 8.13 branch
ARG VIPS_BRANCH=8.13
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
WORKDIR /app
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
