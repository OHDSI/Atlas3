/**
 * Jobs Service
 *
 * Service for job execution API calls.
 * Endpoint: GET /job/execution?comprehensivePage=true
 */

import { httpGet } from '@/services/http-client'
import { logger } from '@/utils/logger'
import { type ApiResult, success, failure } from '@/types/api'
import {
  JobExecutionListSchema,
  type Job,
  type JobExecution,
  type JobStatus,
  transformJobExecution,
} from '@/models/jobs.types'

/**
 * Bao cache-build job. Returned by `GET /WebAPI/trexsql/cache/jobs`.
 * Source: bao plugin tracks each cache build in `_cache_jobs.cache_generation_info`.
 */
interface CacheJobApi {
  databaseCode?: string
  sourceKey?: string
  status?: string
  startTime?: string | null
  endTime?: string | null
  totalTables?: number | null
  completedTables?: number | null
  error?: string | null
}

const CACHE_STATUS_MAP: Record<string, JobStatus> = {
  RUNNING: 'RUNNING',
  COMPLETE: 'COMPLETED',
  COMPLETED: 'COMPLETED',
  ERROR: 'FAILED',
  FAILED: 'FAILED',
  CANCELED: 'STOPPED',
  CANCELLED: 'STOPPED',
  STOPPED: 'STOPPED',
}

function parseTimestamp(s: string | null | undefined): Date | null {
  if (!s) return null
  // bao serializes LocalDateTime as a microseconds-since-epoch string for some
  // builds and as ISO-8601 for others — tolerate both.
  const trimmed = String(s).trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed)
    // Heuristic: > 1e15 → microseconds, > 1e12 → milliseconds, else seconds.
    if (n > 1e15) return new Date(Math.floor(n / 1000))
    if (n > 1e12) return new Date(n)
    return new Date(n * 1000)
  }
  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Convert a bao cache job into the unified `Job` shape used by the UI.
 * `executionId` is synthesized from a hash of the database-code so the table
 * has a stable per-cache-build identifier (cache jobs aren't in Spring Batch).
 */
function transformCacheJob(c: CacheJobApi): Job | null {
  const dbCode = c.databaseCode ?? c.sourceKey
  if (!dbCode) return null
  const startTime = parseTimestamp(c.startTime)
  const endTime = parseTimestamp(c.endTime)
  const status: JobStatus = CACHE_STATUS_MAP[String(c.status ?? '').toUpperCase()] ?? 'UNKNOWN'
  // Stable synthetic id from databaseCode + startTime. Use a small hash so the
  // numeric id stays compact for display.
  const idStr = `${dbCode}|${c.startTime ?? ''}`
  let h = 0
  for (let i = 0; i < idStr.length; i++) h = ((h << 5) - h + idStr.charCodeAt(i)) | 0
  const id = Math.abs(h)
  const total = c.totalTables ?? 0
  const completed = c.completedTables ?? 0
  const progressSuffix = total > 0 ? ` (${completed}/${total} tables)` : ''
  return {
    id,
    executionId: id,
    type: 'cacheGeneration',
    name: `Cache build — ${dbCode}${progressSuffix}`,
    status,
    author: '',
    startTime,
    endTime,
    duration: startTime && endTime ? endTime.getTime() - startTime.getTime() : null,
    entityId: null,
    sourceKey: c.sourceKey ?? dbCode,
    exitMessage: c.error ?? null,
  }
}

async function fetchCacheJobs(): Promise<Job[]> {
  try {
    const data = await httpGet<unknown>('/trexsql/cache/jobs')
    const list = (data && typeof data === 'object' && 'jobs' in data
      ? (data as { jobs?: unknown }).jobs
      : null) as CacheJobApi[] | null
    if (!Array.isArray(list)) return []
    return list.map(transformCacheJob).filter((j): j is Job => j !== null)
  } catch (err) {
    // Cache-job tracking is optional — never let a bao failure break the
    // rest of the jobs view.
    logger.debug('JobsService', 'Cache jobs fetch failed (non-fatal)', err)
    return []
  }
}

/**
 * Extract job executions from the response
 * Handles both array and paginated response formats
 */
function extractExecutions(data: unknown): JobExecution[] {
  // Check if it's a paginated response with 'content' array
  if (
    data &&
    typeof data === 'object' &&
    'content' in data &&
    Array.isArray((data as { content: unknown }).content)
  ) {
    return (data as { content: JobExecution[] }).content
  }
  // Otherwise treat as plain array
  if (Array.isArray(data)) {
    return data as JobExecution[]
  }
  return []
}

/**
 * Fetch all job executions from WebAPI
 * Endpoint: GET /job/execution?comprehensivePage=true
 *
 * @returns Promise with array of job executions
 */
export async function getJobs(): Promise<ApiResult<Job[]>> {
  try {
    // Pull Spring Batch executions and bao cache-build jobs in parallel.
    // Cache-build jobs run outside Spring Batch (in bao's own _cache_jobs
    // tracking) so they need a separate fetch + merge.
    const [batchData, cacheJobs] = await Promise.all([
      httpGet<unknown>('/job/execution?comprehensivePage=true'),
      fetchCacheJobs(),
    ])

    // Validate Spring Batch response with Zod
    const parsed = JobExecutionListSchema.safeParse(batchData)

    if (!parsed.success) {
      logger.error('JobsService', 'Job executions validation error', parsed.error)
      return failure('Invalid job executions response format')
    }

    // Extract executions from response (handles both array and paginated formats)
    const executions = extractExecutions(parsed.data)

    // Transform to normalized Job format and merge with cache jobs
    const jobs = [...executions.map(transformJobExecution), ...cacheJobs]

    // Sort by start time descending (most recent first)
    jobs.sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0
      if (!a.startTime) return 1
      if (!b.startTime) return -1
      return b.startTime.getTime() - a.startTime.getTime()
    })

    return success(jobs)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job executions'
    logger.error('JobsService', 'Failed to fetch job executions', error)
    return failure(message)
  }
}

/**
 * Export the service as a singleton object
 */
export const jobsService = {
  getJobs,
}
