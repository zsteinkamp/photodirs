#!/bin/bash

if [ "production" == "$NODE_ENV" ]
then
  exec npm run start
else
  exec npm run watch:dev
fi
