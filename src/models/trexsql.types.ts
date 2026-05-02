/**
 * TrexSQL Cache Types and Zod Schemas
 *
 * Types for TrexSQL cache operations and patient counting.
 *
 * @packageDocumentation
 */

import { z } from 'zod'

// ============================================================================
// Cache Status Types
// ============================================================================

/**
 * Possible cache status values
 */
export const CacheStatusTypeSchema = z.enum(['ready', 'building', 'not_built', 'error', 'stale'])

export type CacheStatusType = z.infer<typeof CacheStatusTypeSchema>

/**
 * TrexSQL cache status for a specific data source
 */
export const TrexSQLCacheStatusSchema = z.object({
  /** Data source key identifier */
  sourceKey: z.string().min(1),

  /** Current cache status */
  status: CacheStatusTypeSchema,

  /** Total patient count in the cached dataset */
  totalPatientCount: z.number().int().nonnegative().nullable(),

  /** When the cache was last built (ISO 8601) */
  lastBuiltAt: z.string().datetime().nullable(),

  /** Approximate cache size in bytes */
  sizeBytes: z.number().int().nonnegative().nullable(),

  /** Error message if status is 'error' */
  errorMessage: z.string().nullable(),
})

export type TrexSQLCacheStatus = z.infer<typeof TrexSQLCacheStatusSchema>

// ============================================================================
// Patient Count Types
// ============================================================================

/**
 * Response from the patient count endpoint
 */
export const PatientCountResultSchema = z
  .object({
    /** Number of patients matching the cohort criteria */
    cohortPatientCount: z.number().int().nonnegative(),

    /** Total patients in the dataset */
    totalPatientCount: z.number().int().nonnegative(),

    /** Query execution time in milliseconds */
    executionTimeMs: z.number().int().nonnegative(),
  })
  .refine(data => data.cohortPatientCount <= data.totalPatientCount, {
    message: 'cohortPatientCount cannot exceed totalPatientCount',
  })

export type PatientCountResult = z.infer<typeof PatientCountResultSchema>

/**
 * Request body for patient count endpoint
 */
export const CountRequestSchema = z.object({
  /** Cohort expression in Atlas format */
  expression: z.record(z.unknown()),
})

export type CountRequest = z.infer<typeof CountRequestSchema>

// ============================================================================
// Build Cache Types
// ============================================================================

/**
 * Response from the build cache endpoint
 */
export const BuildCacheResponseSchema = z.object({
  /** Status message */
  message: z.string(),

  /** Estimated time to complete in seconds (if available) */
  estimatedTimeSeconds: z.number().int().nonnegative().nullable().optional(),
})

export type BuildCacheResponse = z.infer<typeof BuildCacheResponseSchema>

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Local UI state for the patient count display
 */
export interface PatientCountState {
  /** Currently selected data source key */
  selectedSourceKey: string | null

  /** Latest count result */
  result: PatientCountResult | null

  /** Whether a count request is in progress */
  isLoading: boolean

  /** Error from last count request */
  error: string | null

  /** Cache status for selected source */
  cacheStatus: TrexSQLCacheStatus | null
}

/**
 * Data source with cache status for UI display
 */
export interface DataSourceWithCacheStatus {
  /** Data source key */
  sourceKey: string

  /** Data source display name */
  sourceName: string

  /** Cache status for this source */
  cacheStatus: TrexSQLCacheStatus | null
}

// ============================================================================
// LocalStorage Keys
// ============================================================================

/**
 * LocalStorage key for persisting selected data source
 */
export const TREXSQL_SELECTED_SOURCE_KEY = 'atlas3:trexsql:selectedDataSource'
