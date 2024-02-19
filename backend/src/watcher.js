'use strict'

import { scanDirectory } from './scanDir.js'
import { LOGGER } from './constants.js'
const logger = LOGGER

const workQueue = []

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
  //console.debug(
  //  'Polling Queue len=' + workQueue.length + ' workToDo?=' + hasJobToDo(),
  //)
  if (hasJobToDo()) {
    const job = dequeueJob()
    logger.debug('Running Job:', job)
    await runJob(job)
    logger.debug('Completed Job:', job)
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
