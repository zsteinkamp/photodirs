FROM node:16

WORKDIR /app
COPY package*.json ./
RUN npm ci

CMD [ "npm", "start" ]
