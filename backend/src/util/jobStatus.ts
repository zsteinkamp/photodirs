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

// Turn an absolute albums/cache path into a compact album-relative label.
export const label = (p: string): string =>
  p.replace(/^\/(albums|cache\/albums|cache)\//, '')

// Record a job around a unit of real work. Call this only after a cache-hit
// early-return, so the dashboard reflects actual ffmpeg/Sharp work and not the
// no-op freshness checks the periodic scan runs on every file.
export const track = async <T>(
  type: JobType,
  file: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const id = jobStart(type, label(file))
  try {
    const result = await fn()
    jobEnd(id, 'done')
    return result
  } catch (e: unknown) {
    jobEnd(id, 'failed', (e as Error).message)
    throw e
  }
}
