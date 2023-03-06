'use strict';

const { createLogger, format, transports } = require('winston');
const { combine } = format;

const logger = createLogger({
  transports: [new transports.Console()],
  format: combine(
    format.simple()
  ),
  level: 'info',
  colorize: false
});

module.exports = logger;
