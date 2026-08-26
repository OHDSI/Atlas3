/**
 * Characterization Types
 *
 * A Characterization links one or more target cohorts to a set of feature
 * analyses (and optional strata) and produces prevalence / distribution
 * statistics per [strata, cohort] cell.
 *
 * Ported from Atlas 2.15
 * (`js/pages/characterizations/components/characterizations`).
 */
import { z } from 'zod'

import type { Tag } from './cohort.types'
import type { FeatureAnalysisType } from './feature-analysis.types'
import { FeatureAnalysisTypeSchema } from './feature-analysis.types'
import { StoredCriteriaGroupSchema } from '@/models/stored-criteria-group'
import type { CriteriaGroup, ConceptSet } from '@/models/circe-types'

// Re-export so consumers of Stratum can import CriteriaGroup and ConceptSet from one place.
export type { CriteriaGroup, ConceptSet }

// ============================================================================
// Linked entities
// ============================================================================

export interface LinkedCohort {
  id: number
  name: string
}

export const LinkedCohortSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .passthrough()

export interface LinkedFeatureAnalysis {
  id: number
  name?: string
  description?: string
  // `supports*` flags come from the backing FeatureAnalysis design and tell the
  // editor whether the toggle is even available; `include*` flags are the
  // user's choice for this particular characterization.
  supportsAnnual?: boolean
  supportsTemporal?: boolean
  includeAnnual?: boolean
  includeTemporal?: boolean
  statType?: 'PREVALENCE' | 'DISTRIBUTION'
}

export const LinkedFeatureAnalysisSchema = z
  .object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    supportsAnnual: z.boolean().optional(),
    supportsTemporal: z.boolean().optional(),
    includeAnnual: z.boolean().optional(),
    includeTemporal: z.boolean().optional(),
    statType: z.enum(['PREVALENCE', 'DISTRIBUTION']).optional(),
  })
  .passthrough()

// ============================================================================
// Strata & parameters
// ============================================================================

export interface Stratum {
  id: string
  name: string
  criteria?: CriteriaGroup
}

export const StratumSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    name: z.string(),
    criteria: StoredCriteriaGroupSchema,
  })
  .passthrough()

export interface CharacterizationParameter {
  name: string
  value: unknown
}

export const CharacterizationParameterSchema = z
  .object({
    name: z.string(),
    value: z.unknown(),
  })
  .passthrough()

// ============================================================================
// Shared user/tag/concept-set ref schemas
// ============================================================================

const UserRefSchema = z.union([
  z.string(),
  z
    .object({
      login: z.string(),
      name: z.string().optional(),
    })
    .passthrough(),
])

const TagSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    color: z.string().optional(),
  })
  .passthrough()

// ============================================================================
// CharacterizationDefinition
// ============================================================================

export interface CharacterizationDefinition {
  id?: number
  name: string
  description?: string
  cohorts: LinkedCohort[]
  featureAnalyses: LinkedFeatureAnalysis[]
  // Atlas spelling (`stratas`) preserved to match the WebAPI payload.
  stratas: Stratum[]
  strataConceptSets?: ConceptSet[]
  stratifiedBy?: string
  strataOnly?: boolean
  parameters?: CharacterizationParameter[]
  tags?: Tag[]
  createdBy?: { login: string; name?: string } | string
  createdDate?: number
  modifiedBy?: { login: string; name?: string } | string
  modifiedDate?: number
}

export const CharacterizationDefinitionSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    description: z.string().optional(),
    cohorts: z.array(LinkedCohortSchema),
    featureAnalyses: z.array(LinkedFeatureAnalysisSchema),
    stratas: z.array(StratumSchema),
    strataConceptSets: z.array(z.record(z.unknown())).optional(),
    stratifiedBy: z.string().optional(),
    strataOnly: z.boolean().optional(),
    parameters: z.array(CharacterizationParameterSchema).optional(),
    tags: z.array(TagSchema).optional(),
    createdBy: UserRefSchema.optional(),
    createdDate: z.number().optional(),
    modifiedBy: UserRefSchema.optional(),
    modifiedDate: z.number().optional(),
  })
  .passthrough()

// ============================================================================
// List endpoint (lighter shape — full design not returned)
// ============================================================================

export interface CharacterizationListItem {
  id: number
  name: string
  description?: string
  tags?: Tag[]
  cohorts?: LinkedCohort[]
  featureAnalyses?: LinkedFeatureAnalysis[]
  createdBy?: { login: string; name?: string } | string
  createdDate?: number
  modifiedDate?: number
}

export const CharacterizationListItemSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    tags: z.array(TagSchema).optional(),
    cohorts: z.array(LinkedCohortSchema).optional(),
    featureAnalyses: z.array(LinkedFeatureAnalysisSchema).optional(),
    createdBy: UserRefSchema.optional(),
    createdDate: z.number().optional(),
    modifiedDate: z.number().optional(),
  })
  .passthrough()

// ============================================================================
// Generation / execution
// ============================================================================

// Combined set from Atlas 2.15 `const.js` — `generationStatuses` covers
// PENDING/STARTED/RUNNING/COMPLETED/FAILED, and `executionStatuses` adds
// CANCELED (a.k.a. STOPPED), STARTING, and STOPPING.
export type GenerationStatus =
  | 'PENDING'
  | 'STARTING'
  | 'STARTED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'STOPPING'

export const GenerationStatusSchema = z.enum([
  'PENDING',
  'STARTING',
  'STARTED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'STOPPING',
])

export interface CharacterizationExecution {
  id: number
  ccGenerationId?: number
  hashCode?: string | number | null
  status: GenerationStatus
  startTime?: number
  endTime?: number | null
  duration?: number
  executionStatus?: GenerationStatus
  sourceKey: string
  designHash?: string
  cdmDatabaseSchema?: string
  exitMessage?: string
}

export const CharacterizationExecutionSchema = z
  .object({
    id: z.number(),
    ccGenerationId: z.number().optional(),
    hashCode: z.union([z.string(), z.number()]).nullable().optional(),
    status: GenerationStatusSchema,
    startTime: z.number().optional(),
    endTime: z.number().nullable().optional(),
    duration: z.number().optional(),
    executionStatus: GenerationStatusSchema.optional(),
    sourceKey: z.string(),
    designHash: z.string().optional(),
    cdmDatabaseSchema: z.string().optional(),
    exitMessage: z.string().optional(),
  })
  .passthrough()

// ============================================================================
// Result statistics
// ============================================================================

// Two-level keying [strataId][cohortId] -> value. Strings because the report
// service serialises numeric ids as JSON object keys.
const NestedNumberMapSchema = z.record(z.record(z.number()))

export interface PrevalenceStat {
  analysisId: number
  analysisName: string
  covariateId: number
  covariateName: string
  conceptId: number
  conceptName?: string
  domainId?: string
  faType?: FeatureAnalysisType
  cohorts: LinkedCohort[]
  count: Record<string, Record<string, number>>
  pct: Record<string, Record<string, number>>
  stdDiff?: number
}

export const PrevalenceStatSchema = z
  .object({
    analysisId: z.number(),
    analysisName: z.string(),
    covariateId: z.number(),
    covariateName: z.string(),
    conceptId: z.number(),
    conceptName: z.string().optional(),
    domainId: z.string().optional(),
    faType: FeatureAnalysisTypeSchema.optional(),
    cohorts: z.array(LinkedCohortSchema),
    count: NestedNumberMapSchema,
    pct: NestedNumberMapSchema,
    stdDiff: z.number().optional(),
  })
  .passthrough()

export interface DistributionStat {
  analysisId: number
  analysisName: string
  covariateId: number
  covariateName: string
  conceptId: number
  conceptName?: string
  domainId?: string
  faType?: FeatureAnalysisType
  cohorts: LinkedCohort[]
  avg: Record<string, Record<string, number>>
  stdDev: Record<string, Record<string, number>>
  min: Record<string, Record<string, number>>
  p10: Record<string, Record<string, number>>
  p25: Record<string, Record<string, number>>
  median: Record<string, Record<string, number>>
  p75: Record<string, Record<string, number>>
  p90: Record<string, Record<string, number>>
  max: Record<string, Record<string, number>>
}

export const DistributionStatSchema = z
  .object({
    analysisId: z.number(),
    analysisName: z.string(),
    covariateId: z.number(),
    covariateName: z.string(),
    conceptId: z.number(),
    conceptName: z.string().optional(),
    domainId: z.string().optional(),
    faType: FeatureAnalysisTypeSchema.optional(),
    cohorts: z.array(LinkedCohortSchema),
    avg: NestedNumberMapSchema,
    stdDev: NestedNumberMapSchema,
    min: NestedNumberMapSchema,
    p10: NestedNumberMapSchema,
    p25: NestedNumberMapSchema,
    median: NestedNumberMapSchema,
    p75: NestedNumberMapSchema,
    p90: NestedNumberMapSchema,
    max: NestedNumberMapSchema,
  })
  .passthrough()

export interface ComparativeDistributionStat extends DistributionStat {
  stdDiff: number
}

export const ComparativeDistributionStatSchema = DistributionStatSchema.extend({
  stdDiff: z.number(),
})

export interface TemporalDataPoint {
  timeId: number
  year?: number
  count: number
  pct: number
}

export const TemporalDataPointSchema = z
  .object({
    timeId: z.number(),
    year: z.number().optional(),
    count: z.number(),
    pct: z.number(),
  })
  .passthrough()

export interface Table1Config {
  groupByAnalysis: boolean
  pinTopK: { enabled: boolean; k: number }
  binaryFormat: 'count-pct' | 'pct' | 'count' | 'count-of-total'
  continuousFormat: 'mean-sd' | 'median-iqr'
  showCounts: boolean
  showPercent: boolean
  showStdDiff: boolean
  showStdDiffCI: boolean
  strataAsCols: boolean
}

export const DEFAULT_TABLE1_CONFIG: Table1Config = {
  groupByAnalysis: true,
  pinTopK: { enabled: false, k: 10 },
  binaryFormat: 'count-pct',
  continuousFormat: 'mean-sd',
  showCounts: true,
  showPercent: true,
  showStdDiff: true,
  showStdDiffCI: false,
  strataAsCols: false,
}

export interface Table1CohortColumn {
  cohortKey: string
  cohortId: number
  cohortName: string
  strataKey?: string
  strataLabel?: string
}

export interface Table1BinaryCell {
  count: number
  pct: number
}

export interface Table1ContinuousCell {
  primary: number
  secondary: number
}

export type Table1Row =
  | { kind: 'group'; analysisId: number; label: string }
  | {
      kind: 'binary'
      analysisId: number
      analysisName: string
      covariateId: number
      conceptId: number
      label: string
      cells: Record<string, Table1BinaryCell | null>
      stdDiff?: number
      stdDiffCI?: { lower: number; upper: number }
      _source: PrevalenceStat
    }
  | {
      kind: 'continuous'
      analysisId: number
      analysisName: string
      covariateId: number
      conceptId: number
      label: string
      stat: 'mean-sd' | 'median-iqr'
      cells: Record<string, Table1ContinuousCell | null>
      _source: DistributionStat
    }

export interface Table1Filters {
  threshold: number
  selectedAnalysisIds: number[]
  selectedDomains: string[]
  selectedCohortId: number | null
}

export const DEFAULT_TABLE1_FILTERS: Table1Filters = {
  threshold: 0,
  selectedAnalysisIds: [],
  selectedDomains: [],
  selectedCohortId: null,
}
