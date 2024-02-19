'use strict'

import { scanDirectory } from './scanDir.js'
import { LOGGER } from './constants.js'
const logger = LOGGER

import { logger as _logger } from 'express-winston'
import express from 'express'
const app = express()
const port = 3000
app.use(
  _logger({
    winstonInstance: logger,
    meta: false,
    expressFormat: true,
  }),
)
app.get(new RegExp('^/'), async (req, res) => {
  logger.info('WATCHER PATH NOTIFY GOT', { path: req.path })
  topqueueJob({
    // runAt: now
    path: req.path,
  })
  return res.status(200).send('OK')
})
app.listen(port, () => {
  logger.info('WATCHER PATH NOTIFY LISTENING', { port })
})

const workQueue = []

const topqueueJob = job => {
  return workQueue.unshift(job)
}
const enqueueJob = job => {
  return workQueue.push(job)
}

const dequeueJob = () => {
  return workQueue.shift()
}

const enqueuePeriodicScan = () => {
  enqueueJob({
    runAt: Date.now() + 60 * 1000, // 60 seconds
    path: '/',
    runAtEnd: enqueuePeriodicScan,
  })
}

const hasJobToDo = () => {
  if (workQueue.length === 0) {
    return false
  }
  const head = workQueue[0]
  if (!head.runAt) {
    return true
  }
  if (head.runAt <= Date.now()) {
    return true
  }
  return false
}

const runJob = async job => {
  scanDirectory(job.path)
  if (job.runAtEnd) {
    await job.runAtEnd()
  }
}

setInterval(async () => {
  logger.debug(
    'Polling Queue len=' + workQueue.length + ' workToDo?=' + hasJobToDo(),
  )
  if (hasJobToDo()) {
    const job = dequeueJob()
    logger.info('Running Job:', job)
    await runJob(job)
    logger.info('Completed Job:', job)
  }
}, 1000)

/*
 * Kick it all off!
 */
;(async () => {
  enqueueJob({
    // runAt: now
    path: '/',
    runAtEnd: enqueuePeriodicScan,
  })
})()
