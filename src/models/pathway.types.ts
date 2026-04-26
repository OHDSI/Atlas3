/**
 * Pathway Types
 * OHDSI Cohort Pathways analysis types with Zod validation
 */
import { z } from 'zod'
import { TagSchema } from '@/models/webapi.types'
import { userSchema } from '@/components/versions/schemas'

// Cohort reference used within a pathway design
export const PathwayCohortRefSchema = z.object({
  id: z.number(),
  name: z.string(),
})
export type PathwayCohortRef = z.infer<typeof PathwayCohortRefSchema>

// Core design parameters for a pathway analysis
export const PathwayDesignSchema = z.object({
  targetCohorts: z.array(PathwayCohortRefSchema),
  eventCohorts: z.array(PathwayCohortRefSchema),
  combinationWindow: z.number().int().min(1),
  minCellCount: z.number().int().min(1),
  maxDepth: z.number().int().min(1).max(10),
  allowRepeats: z.boolean(),
})
export type PathwayDesign = z.infer<typeof PathwayDesignSchema>

// Full pathway analysis definition
export const PathwaySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  design: PathwayDesignSchema,
  tags: z.array(TagSchema).default([]),
  createdBy: userSchema.optional(),
  createdDate: z.union([z.string(), z.number()]).optional(),
  modifiedBy: userSchema.optional(),
  modifiedDate: z.union([z.string(), z.number()]).optional(),
  hashCode: z.string().optional(),
})
export type Pathway = z.infer<typeof PathwaySchema>

// Summary view of a pathway (without full design, id required)
export const PathwaySummarySchema = PathwaySchema.omit({ design: true }).extend({
  id: z.number(),
})
export type PathwaySummary = z.infer<typeof PathwaySummarySchema>

// Individual event code from pathway results
export const PathwayEventCodeSchema = z.object({
  code: z.number(),
  name: z.string(),
  isCombo: z.boolean(),
})
export type PathwayEventCode = z.infer<typeof PathwayEventCodeSchema>

// A single path (sequence of events) and its person count
export const PathwayPathSchema = z.object({
  path: z.string(),
  personCount: z.number(),
})
export type PathwayPath = z.infer<typeof PathwayPathSchema>

// Pathway results grouped by target cohort
export const PathwayGroupSchema = z.object({
  targetCohortId: z.number(),
  targetCohortCount: z.number(),
  totalPathwaysCount: z.number(),
  pathways: z.array(PathwayPathSchema),
})
export type PathwayGroup = z.infer<typeof PathwayGroupSchema>

// Full results payload returned from WebAPI
export const PathwayResultsSchema = z.object({
  pathwayGroups: z.array(PathwayGroupSchema),
  eventCodes: z.array(PathwayEventCodeSchema),
})
export type PathwayResults = z.infer<typeof PathwayResultsSchema>

// Execution status enum
export const PathwayExecutionStatusSchema = z.enum([
  'STARTING', 'STARTED', 'COMPLETED', 'FAILED', 'CANCELED',
])
export type PathwayExecutionStatus = z.infer<typeof PathwayExecutionStatusSchema>

// A single generation execution record
export const PathwayExecutionSchema = z.object({
  id: z.number(),
  status: PathwayExecutionStatusSchema,
  sourceKey: z.string(),
  hashCode: z.string().optional(),
  executionDate: z.union([z.string(), z.number()]).optional(),
  duration: z.number().optional(),
})
export type PathwayExecution = z.infer<typeof PathwayExecutionSchema>

export const PathwayExecutionListSchema = z.array(PathwayExecutionSchema)

// Default values for new pathway designs
export const PATHWAY_DEFAULTS = {
  combinationWindow: 30,
  minCellCount: 5,
  maxDepth: 5,
  allowRepeats: false,
} as const

export const COMBINATION_WINDOW_OPTIONS = [1, 3, 5, 7, 10, 14, 30] as const
export const MIN_CELL_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const MAX_DEPTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const

export const STORAGE_KEY_PATHWAY_DRAFT = 'atlas3_pathway_draft'
export const PATHWAY_AUTO_SAVE_INTERVAL_MS = 30000
export const PATHWAY_GENERATION_POLL_MS = 5000
