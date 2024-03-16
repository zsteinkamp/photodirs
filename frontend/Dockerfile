FROM node:18 AS dev

# node packages
WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci

CMD [ "npm", "start" ]

## PRODUCTION BUILD BELOW
FROM dev AS prod
ENV NODE_ENV=production
COPY . .
RUN npm run build

CMD [ "npm", "run", "server" ]
