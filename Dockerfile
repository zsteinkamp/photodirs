FROM node:18

# system dependencies
RUN  echo 'deb http://download.opensuse.org/repositories/graphics:/darktable:/stable/Debian_11/ /' | tee /etc/apt/sources.list.d/graphics:darktable:stable.list
RUN  curl -fsSL https://download.opensuse.org/repositories/graphics:darktable:stable/Debian_11/Release.key | gpg --dearmor | tee /etc/apt/trusted.gpg.d/graphics_darktable_stable.gpg > /dev/null
RUN  apt update
RUN  apt install -y darktable

# node packages
WORKDIR /app
COPY package*.json ./
RUN npm ci

CMD [ "npm", "start" ]
