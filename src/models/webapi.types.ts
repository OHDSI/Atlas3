/**
 * WebAPI Types
 * OHDSI WebAPI request/response types with Zod validation
 */
import { z } from 'zod'

// Tag schema for cohort organization
export const TagSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  color: z.string().optional(),
})

export type Tag = z.infer<typeof TagSchema>

export interface Daimon {
  sourceDaimonId: number
  daimonType: string
  tableQualifier: string
  priority: number
}

export interface CDMSource {
  sourceId: number
  sourceKey: string
  sourceName: string
  sourceDialect: string
  daimons: Daimon[]
}

export const DaimonSchema = z.object({
  sourceDaimonId: z.number(),
  daimonType: z.string(),
  tableQualifier: z.string(),
  priority: z.number(),
})

export const CDMSourceSchema = z.object({
  sourceId: z.number(),
  sourceKey: z.string(),
  sourceName: z.string(),
  sourceDialect: z.string(),
  daimons: z.array(DaimonSchema),
})

export const CDMSourceListSchema = z.array(CDMSourceSchema)

export type CDMSourceList = z.infer<typeof CDMSourceListSchema>

export interface GenerationJob {
  id: number
  cohortDefinitionId: number
  sourceKey: string
  status: GenerationStatus
  startTime?: string
  endTime?: string
  personCount?: number
  recordCount?: number
  failMessage?: string
}

export type GenerationStatus = 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED'

export const GenerationJobSchema = z.object({
  id: z.number(),
  cohortDefinitionId: z.number(),
  sourceKey: z.string(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETE', 'FAILED']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  personCount: z.number().optional(),
  recordCount: z.number().optional(),
  failMessage: z.string().optional(),
})

export type GenerationJobResponse = z.infer<typeof GenerationJobSchema>

// WebAPI cohort generation info ID (composite key)
export const CohortGenerationIdSchema = z.object({
  cohortDefinitionId: z.number(),
  sourceId: z.number(),
})

// Map raw WebAPI Spring Batch status values onto the narrower internal
// GenerationStatus. The /cohortdefinition/{id}/info endpoint returns the
// underlying job-execution status (STARTING/STARTED/COMPLETED/...) — those
// must be normalized before the rest of the UI sees them, otherwise polling
// silently dies because the status never matches the four-value enum.
const RAW_STATUS_TO_GENERATION_STATUS: Record<string, GenerationStatus> = {
  PENDING: 'PENDING',
  STARTING: 'PENDING',
  STARTED: 'RUNNING',
  RUNNING: 'RUNNING',
  STOPPING: 'RUNNING',
  COMPLETE: 'COMPLETE',
  COMPLETED: 'COMPLETE',
  FAILED: 'FAILED',
  STOPPED: 'FAILED',
  ABANDONED: 'FAILED',
}

const generationStatusFromRaw = z
  .string()
  .transform(s => RAW_STATUS_TO_GENERATION_STATUS[s] ?? 'PENDING')

// WebAPI cohort definition generation info response
//
// `createdBy` arrives as either null (legacy) or a `{id, login, name}` object
// from current WebAPI builds — the union below tolerates both. We only care
// about the status/counts here, so `passthrough()` lets future fields land
// without re-tightening the schema.
export const CohortGenerationInfoSchema = z
  .object({
    id: CohortGenerationIdSchema,
    startTime: z.number().nullable().optional(),
    executionDuration: z.number().nullable().optional(),
    status: generationStatusFromRaw,
    isValid: z.boolean().optional(),
    isCanceled: z.boolean().optional(),
    failMessage: z.string().nullable().optional(),
    personCount: z.number().nullable().optional(),
    recordCount: z.number().nullable().optional(),
    createdBy: z
      .union([z.string(), z.record(z.unknown())])
      .nullable()
      .optional(),
  })
  .passthrough()

export type CohortGenerationInfo = z.infer<typeof CohortGenerationInfoSchema>

// The /info endpoint returns an array of generation info
export const CohortGenerationInfoListSchema = z.array(CohortGenerationInfoSchema)

export type CohortGenerationInfoList = z.infer<typeof CohortGenerationInfoListSchema>

// Legacy CohortInfo schema (kept for backwards compatibility)
export const CohortInfoSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  createdBy: z.string().optional(),
  createdDate: z.string().optional(),
  modifiedBy: z.string().optional(),
  modifiedDate: z.string().optional(),
  // Generation info fields (returned from /cohortdefinition/{id}/info when generated)
  sourceKey: z.string().optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETE', 'FAILED']).optional(),
  personCount: z.number().optional(),
  failMessage: z.string().optional(),
})

export type CohortInfo = z.infer<typeof CohortInfoSchema>

// Cohort Definition Summary (for list view)
// Based on actual WebAPI response structure
export const CohortDefinitionSummarySchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    description: z.string().nullable().optional(),
    createdBy: z.unknown().optional(), // May be string, object, or missing
    createdDate: z.union([z.number(), z.string()]).optional(), // Can be timestamp or ISO string
    modifiedBy: z.unknown().optional(), // May be string, object, or missing
    modifiedDate: z.union([z.number(), z.string()]).optional(), // Can be timestamp or ISO string
    hasWriteAccess: z.boolean().optional(),
    hasReadAccess: z.boolean().optional(),
    tags: z.array(TagSchema).optional(),
  })
  .passthrough() // Allow additional fields from WebAPI

export type CohortDefinitionSummary = z.infer<typeof CohortDefinitionSummarySchema>

export const CohortDefinitionListSchema = z.array(CohortDefinitionSummarySchema)

export type CohortDefinitionList = z.infer<typeof CohortDefinitionListSchema>

/**
 * UI state for generation panel
 */
export interface GenerationPanelState {
  isOpen: boolean
  cohortId: number | null
  pollingActive: boolean
  lastRefresh?: Date
}

/**
 * Derived state for individual data source tiles
 */
export interface DataSourceTileState {
  source: CDMSource
  tileStatus: TileStatus
  job?: GenerationJob
  patientCount?: number
  errorMessage?: string
}

/**
 * UI status for data source tiles
 */
export type TileStatus = 'idle' | 'generating' | 'complete' | 'failed'
