#!/bin/bash

if [ "production" == "$NODE_ENV" ]
then
  npm run start
else
  npm run watch:dev
fi
