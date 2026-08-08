/**
 * Jobs Types and Zod Schemas
 *
 * Type definitions and runtime validation for job execution data from WebAPI.
 * Based on Atlas 2.x job execution format.
 */

import { z } from 'zod'

/**
 * Job execution status values from WebAPI
 */
export const JobStatusSchema = z.enum([
  'STARTED',
  'STARTING',
  'RUNNING',
  'PENDING',
  'COMPLETED',
  'COMPLETE',
  'FAILED',
  'STOPPED',
  'STOPPING',
  'ABANDONED',
  'UNKNOWN',
])

export type JobStatus = z.infer<typeof JobStatusSchema>

/**
 * Job type identifiers for different analysis types
 * Used for routing to source entities
 */
export const JobTypeSchema = z.enum([
  'generateCohort',
  'cohortAnalysisJob',
  'irAnalysis',
  'generateCohortCharacterization',
  'generatePathwayAnalysis',
  'negativeControlsAnalysisJob',
  'cohortInclusionReport',
  'prediction',
  'estimation',
  'cacheGeneration',
  'UNKNOWN',
])

export type JobType = z.infer<typeof JobTypeSchema>

/**
 * Job instance schema - contains job type info
 */
export const JobInstanceSchema = z
  .object({
    name: z.string().optional(),
    instanceId: z.number().optional(),
  })
  .passthrough()

/**
 * Job parameter schema - parameters passed to job execution
 * Note: Some numeric fields may come as strings from the API, so we accept both
 */
export const JobParameterSchema = z
  .object({
    cohort_definition_id: z.union([z.number(), z.string()]).optional(),
    source_id: z.union([z.number(), z.string()]).optional(),
    source_key: z.string().optional(),
    sourceKey: z.string().optional(),
    analysis_id: z.union([z.number(), z.string()]).optional(),
    jobName: z.string().optional(),
    jobAuthor: z.string().optional(),
  })
  .passthrough()

export type JobParameter = z.infer<typeof JobParameterSchema>

/**
 * Job execution info from WebAPI
 * Endpoint: GET /job/execution?comprehensivePage=true
 */
export const JobExecutionSchema = z
  .object({
    executionId: z.number(),
    status: JobStatusSchema.catch('UNKNOWN'),
    // startDate and endDate are Unix timestamps (milliseconds) or ISO strings
    startDate: z.union([z.number(), z.string()]).nullable().optional(),
    endDate: z.union([z.number(), z.string()]).nullable().optional(),
    exitStatus: z.string().nullable().optional(),
    jobInstance: JobInstanceSchema.optional(),
    jobParameters: JobParameterSchema.optional(),
    ownerType: z.string().nullable().optional(),
  })
  .passthrough()

export type JobExecution = z.infer<typeof JobExecutionSchema>

/**
 * Paginated job execution response from WebAPI
 * The API returns a Page object with content array
 */
export const JobExecutionPageSchema = z
  .object({
    content: z.array(JobExecutionSchema),
    pageable: z
      .object({
        pageNumber: z.number(),
        pageSize: z.number(),
      })
      .passthrough()
      .optional(),
    totalPages: z.number().optional(),
    totalElements: z.number().optional(),
    last: z.boolean().optional(),
    first: z.boolean().optional(),
    size: z.number().optional(),
    number: z.number().optional(),
    numberOfElements: z.number().optional(),
    empty: z.boolean().optional(),
  })
  .passthrough()

export type JobExecutionPage = z.infer<typeof JobExecutionPageSchema>

/**
 * Comprehensive job execution response from WebAPI
 * Can be either a plain array or a paginated response
 */
export const JobExecutionListSchema = z.union([z.array(JobExecutionSchema), JobExecutionPageSchema])

export type JobExecutionList = z.infer<typeof JobExecutionListSchema>

/**
 * Normalized job data for display in the UI
 */
export interface Job {
  id: number
  executionId: number
  type: JobType
  name: string
  status: JobStatus
  author: string
  startTime: Date | null
  endTime: Date | null
  duration: number | null
  entityId: number | null
  sourceKey: string | null
  exitMessage: string | null
}

/**
 * Job filter options for the UI
 */
export type JobStatusFilter = 'all' | 'running' | 'completed' | 'failed'

/**
 * Display configuration for job status
 */
export interface JobStatusDisplay {
  label: string
  color: string
  icon: string
}

/**
 * Job status display mapping
 */
export const JOB_STATUS_DISPLAY: Record<JobStatus, JobStatusDisplay> = {
  STARTED: { label: 'Running', color: 'blue', icon: 'mdi-play-circle' },
  STARTING: { label: 'Starting', color: 'orange', icon: 'mdi-timer-sand' },
  RUNNING: { label: 'Running', color: 'blue', icon: 'mdi-play-circle' },
  PENDING: { label: 'Starting', color: 'orange', icon: 'mdi-timer-sand' },
  COMPLETED: { label: 'Completed', color: 'green', icon: 'mdi-check-circle' },
  COMPLETE: { label: 'Completed', color: 'green', icon: 'mdi-check-circle' },
  FAILED: { label: 'Failed', color: 'red', icon: 'mdi-alert-circle' },
  STOPPED: { label: 'Canceled', color: 'grey', icon: 'mdi-stop-circle' },
  STOPPING: { label: 'Stopping', color: 'orange', icon: 'mdi-stop-circle-outline' },
  ABANDONED: { label: 'Abandoned', color: 'grey', icon: 'mdi-close-circle' },
  UNKNOWN: { label: 'Unknown', color: 'grey', icon: 'mdi-help-circle' },
}

/**
 * Job type display labels
 */
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  generateCohort: 'Cohort Generation',
  cohortAnalysisJob: 'Cohort Analysis',
  irAnalysis: 'Incidence Rate Analysis',
  generateCohortCharacterization: 'Cohort Characterization',
  generatePathwayAnalysis: 'Pathway Analysis',
  negativeControlsAnalysisJob: 'Negative Controls',
  cohortInclusionReport: 'Inclusion Report',
  prediction: 'Prediction',
  estimation: 'Estimation',
  cacheGeneration: 'Cache Build',
  UNKNOWN: 'Unknown',
}

/**
 * Job type icons
 */
export const JOB_TYPE_ICONS: Record<JobType, string> = {
  generateCohort: 'mdi-account-group',
  cohortAnalysisJob: 'mdi-chart-bar',
  irAnalysis: 'mdi-chart-timeline-variant',
  generateCohortCharacterization: 'mdi-account-search',
  generatePathwayAnalysis: 'mdi-map-marker-path',
  negativeControlsAnalysisJob: 'mdi-shield-check',
  cohortInclusionReport: 'mdi-file-document',
  prediction: 'mdi-crystal-ball',
  estimation: 'mdi-calculator',
  cacheGeneration: 'mdi-database-arrow-down',
  UNKNOWN: 'mdi-help-circle',
}

/**
 * Parse job name to extract job type
 */
export function parseJobType(name: string | null | undefined): JobType {
  if (!name) return 'UNKNOWN'

  const lowerName = name.toLowerCase()

  if (lowerName.includes('cachegeneration') || lowerName.includes('cache build')) {
    return 'cacheGeneration'
  }
  // Before the generateCohort check: "generateCohortCharacterization" contains
  // "generatecohort" and would otherwise be reported as a plain cohort build.
  if (lowerName.includes('characterization')) {
    return 'generateCohortCharacterization'
  }
  if (lowerName.includes('cohort generation') || lowerName.includes('generatecohort')) {
    return 'generateCohort'
  }
  if (lowerName.includes('cohort analysis') || lowerName.includes('heracles')) {
    return 'cohortAnalysisJob'
  }
  if (
    lowerName.includes('incidence rate') ||
    lowerName.includes('ir analysis') ||
    lowerName.includes('iranalysis')
  ) {
    return 'irAnalysis'
  }
  if (lowerName.includes('pathway')) {
    return 'generatePathwayAnalysis'
  }
  if (lowerName.includes('negative control')) {
    return 'negativeControlsAnalysisJob'
  }
  if (lowerName.includes('inclusion')) {
    return 'cohortInclusionReport'
  }
  if (lowerName.includes('prediction')) {
    return 'prediction'
  }
  if (lowerName.includes('estimation')) {
    return 'estimation'
  }

  return 'UNKNOWN'
}

/**
 * Check if a job status represents a running/active state
 */
export function isJobRunning(status: JobStatus): boolean {
  return ['STARTED', 'STARTING', 'RUNNING', 'PENDING', 'STOPPING'].includes(status)
}

/**
 * Check if a job status represents a completed state
 */
export function isJobCompleted(status: JobStatus): boolean {
  return ['COMPLETED', 'COMPLETE'].includes(status)
}

/**
 * Check if a job status represents a failed state
 */
export function isJobFailed(status: JobStatus): boolean {
  return ['FAILED', 'ABANDONED'].includes(status)
}

/**
 * Get the route for a job's source entity
 */
export function getJobEntityRoute(job: Job): string | null {
  if (!job.entityId) return null

  switch (job.type) {
    case 'generateCohort':
    case 'cohortInclusionReport':
      return `/cohorts/${job.entityId}`
    case 'cohortAnalysisJob':
      return `/cohorts/${job.entityId}?tab=reports`
    case 'irAnalysis':
      return `/ir/${job.entityId}`
    case 'generateCohortCharacterization':
      return `/characterizations/${job.entityId}`
    case 'generatePathwayAnalysis':
      return `/pathways/${job.entityId}`
    case 'prediction':
      return `/prediction/${job.entityId}`
    case 'estimation':
      return `/estimation/${job.entityId}`
    default:
      return null
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(durationMs: number | null): string {
  if (durationMs === null || durationMs < 0) return '-'

  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

/**
 * Parse a date value that can be a Unix timestamp (number) or ISO string
 */
function parseDate(value: number | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null
  // If it's a number, treat it as Unix timestamp in milliseconds
  if (typeof value === 'number') {
    return new Date(value)
  }
  // Otherwise, parse as ISO string
  return new Date(value)
}

/**
 * Transform raw WebAPI job execution to normalized Job format
 */
export function transformJobExecution(execution: JobExecution): Job {
  // Get job type from jobInstance.name (e.g., "generateCohort", "irAnalysis")
  const jobType = parseJobType(execution.jobInstance?.name)

  // Extract entity ID from job parameters (can be number or string)
  let entityId: number | null = null
  if (execution.jobParameters) {
    const rawId =
      execution.jobParameters.cohort_definition_id ?? execution.jobParameters.analysis_id ?? null
    if (rawId !== null && rawId !== undefined) {
      entityId = typeof rawId === 'number' ? rawId : parseInt(rawId, 10)
      if (isNaN(entityId)) entityId = null
    }
  }

  // Extract source key from job parameters
  const sourceKey =
    execution.jobParameters?.source_key ?? execution.jobParameters?.sourceKey ?? null

  // Get job name from parameters
  const name = execution.jobParameters?.jobName ?? execution.jobInstance?.name ?? 'Unknown Job'

  // Extract author from job parameters
  const author = execution.jobParameters?.jobAuthor ?? ''

  // Parse start and end dates (can be timestamps or ISO strings)
  const startTime = parseDate(execution.startDate)
  const endTime = parseDate(execution.endDate)

  // Calculate duration if we have both start and end dates
  let duration: number | null = null
  if (startTime && endTime) {
    duration = endTime.getTime() - startTime.getTime()
  }

  return {
    id: execution.executionId,
    executionId: execution.executionId,
    type: jobType,
    name,
    status: execution.status,
    author,
    startTime,
    endTime,
    duration,
    entityId,
    sourceKey,
    exitMessage: execution.exitStatus ?? null,
  }
}
