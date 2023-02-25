FROM node:18 AS dev

# node packages
WORKDIR /app
COPY package*.json ./
RUN npm ci

CMD [ "npm", "start" ]

## PRODUCTION BUILD BELOW
FROM dev AS prod
ENV NODE_ENV=production
RUN npm install -g serve
COPY ./src/ ./src/
COPY ./public/ ./public/
RUN npm run build

CMD [ "serve", "-s", "build" ]
