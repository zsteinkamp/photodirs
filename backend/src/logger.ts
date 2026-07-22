import { createLogger, format, transports } from 'winston'
const { combine } = format

// Error objects have non-enumerable `message`/`stack`, so winston's
// `format.simple()` (which JSON.stringifies the meta) serializes them to `{}`.
// This format walks the log meta and replaces any Error with a plain object so
// the real message and stack survive into the output.
const serializeErrors = format(info => {
  for (const key of Object.keys(info)) {
    const val = (info as Record<string, unknown>)[key]
    if (val instanceof Error) {
      ;(info as Record<string, unknown>)[key] = {
        message: val.message,
        stack: val.stack,
      }
    }
  }
  return info
})

const logger = createLogger({
  transports: [new transports.Console()],
  format: combine(serializeErrors(), format.simple()),
  level: 'info',
})

export default logger
