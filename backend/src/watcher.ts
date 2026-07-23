import { logger as _logger } from 'express-winston'
import express from 'express'

import { scanDirectory, getQueueCounts } from './scanDir.js'
import * as jobStatus from './util/jobStatus.js'
import { STATUS_HTML } from './statusPage.js'
import { LOGGER, WATCHER_PATH_CHECK_PORT, STATUS_PORT } from './constants.js'

const logger = LOGGER

interface WatcherJob {
  path: string
  runAt?: number
  runAtEnd?: () => Promise<void>
}

//
// Set up Express server for path notifier HTTP endpoint
//
const app = express()
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
    path: req.path,
  })
  return res.status(200).send('OK')
})
app.listen(WATCHER_PATH_CHECK_PORT, () => {
  logger.info('WATCHER PATH NOTIFY LISTENING', {
    port: WATCHER_PATH_CHECK_PORT,
  })
})

//
// Work Queue and associated methods
//
const workQueue: WatcherJob[] = []

const topqueueJob = (job: WatcherJob) => {
  return workQueue.unshift(job)
}
const enqueueJob = (job: WatcherJob) => {
  return workQueue.push(job)
}

const dequeueJob = (): WatcherJob | undefined => {
  return workQueue.shift()
}

const enqueuePeriodicScan = async () => {
  enqueueJob({
    runAt: Date.now() + 60 * 1000,
    path: '/',
    runAtEnd: enqueuePeriodicScan,
  })
}

//
// Read-only status dashboard (queue counts + active/recent jobs). Served on its
// own port so it can be reached on the LAN without being placed behind nginx /
// the public reverse proxy.
//
const statusApp = express()
statusApp.get('/status.json', (_req, res) => {
  res.header({ 'cache-control': 'no-store' }).json({
    now: Date.now(),
    scanQueue: workQueue.length,
    queues: getQueueCounts(),
    active: jobStatus.getActiveJobs(),
    recent: jobStatus.getRecentJobs(),
  })
})
statusApp.get('/', (_req, res) => {
  res.type('html').send(STATUS_HTML)
})
statusApp.listen(STATUS_PORT, () => {
  logger.info('WATCHER STATUS LISTENING', { port: STATUS_PORT })
})

const hasJobToDo = (): boolean => {
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

const runJob = async (job: WatcherJob) => {
  // Never let a scan failure become an unhandled rejection — that crashes the
  // whole watcher process and stops all future polling.
  scanDirectory(job.path).catch((err: unknown) =>
    logger.error('SCAN_DIRECTORY_FAILED', { path: job.path, err }),
  )
  if (job.runAtEnd) {
    await job.runAtEnd()
  }
}

setInterval(async () => {
  logger.debug(
    'Polling Queue len=' + workQueue.length + ' workToDo?=' + hasJobToDo(),
  )
  if (hasJobToDo()) {
    const job = dequeueJob()!
    logger.debug('Running Job:', job)
    await runJob(job)
    logger.debug('Completed Job:', job)
  }
}, 1000)

//
// Kick it all off!
//
;(async () => {
  enqueueJob({
    path: '/',
    runAtEnd: enqueuePeriodicScan,
  })
})()
