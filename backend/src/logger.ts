import { createLogger, format, transports } from 'winston'
const { combine } = format

const logger = createLogger({
  transports: [new transports.Console()],
  format: combine(format.simple()),
  level: 'info',
})

export default logger
