FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm ci

CMD [ "npm", "start" ]
