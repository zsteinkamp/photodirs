FROM node:18

# node packages
WORKDIR /app
COPY package*.json ./
RUN npm ci

CMD [ "npm", "start" ]
