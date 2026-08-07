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
  transformJobExecution,
} from '@/models/jobs.types'

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
    const batchData = await httpGet<unknown>('/job/execution?comprehensivePage=true')

    // Validate Spring Batch response with Zod
    const parsed = JobExecutionListSchema.safeParse(batchData)

    if (!parsed.success) {
      logger.error('JobsService', 'Job executions validation error', parsed.error)
      return failure('Invalid job executions response format')
    }

    // Extract executions from response (handles both array and paginated formats)
    const executions = extractExecutions(parsed.data)

    const jobs = executions.map(transformJobExecution)

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
