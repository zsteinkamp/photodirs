//
// In-memory registry of media-processing jobs, powering the watcher's
// read-only status dashboard. Every heavy queue worker (transcode, poster,
// raw, resize) records a start and an end here; we keep the currently-running
// jobs plus a bounded ring buffer of recently-finished ones. Purely in-memory:
// it resets on watcher restart, which is fine for a live status view.
//

export type JobType = 'transcode' | 'poster' | 'raw' | 'resize'
export type JobStatus = 'done' | 'failed'

export interface ActiveJob {
  id: number
  type: JobType
  file: string
  startedAt: number
}

export interface RecentJob {
  type: JobType
  file: string
  status: JobStatus
  startedAt: number
  endedAt: number
  error?: string
}

const RECENT_MAX = 100

const active = new Map<number, ActiveJob>()
const recent: RecentJob[] = []
let nextId = 1

export const jobStart = (type: JobType, file: string): number => {
  const id = nextId++
  active.set(id, { id, type, file, startedAt: Date.now() })
  return id
}

export const jobEnd = (id: number, status: JobStatus, error?: string): void => {
  const job = active.get(id)
  if (!job) {
    return
  }
  active.delete(id)
  // Newest first; cap the buffer.
  recent.unshift({
    type: job.type,
    file: job.file,
    status,
    startedAt: job.startedAt,
    endedAt: Date.now(),
    error,
  })
  if (recent.length > RECENT_MAX) {
    recent.length = RECENT_MAX
  }
}

export const getActiveJobs = (): ActiveJob[] =>
  [...active.values()].sort((a, b) => a.startedAt - b.startedAt)

export const getRecentJobs = (): RecentJob[] => recent
