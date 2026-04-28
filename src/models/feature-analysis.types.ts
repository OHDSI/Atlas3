/**
 * Feature Analysis Types
 *
 * A Feature Analysis is a reusable analytic block used by Characterizations.
 * It comes in three flavors:
 *   - PRESET:        a saved FeatureExtraction `CovariateSetting` JSON blob
 *   - CRITERIA_SET:  a CohortBuilder-style criteria group plus its concept sets
 *   - CUSTOM_FE:     a raw SQL template
 *
 * Ported from Atlas 2.15 (`js/pages/characterizations/components/feature-analyses`).
 */
import { z } from 'zod'

import type { Tag } from './cohort.types'
import type { ConceptSetReference } from './concept-set.types'

// ============================================================================
// Discriminators
// ============================================================================

export type FeatureAnalysisType = 'PRESET' | 'CRITERIA_SET' | 'CUSTOM_FE'

export const FeatureAnalysisTypeSchema = z.enum(['PRESET', 'CRITERIA_SET', 'CUSTOM_FE'])

// Domain ids come from `/feature-analysis/domains` and are CDM-defined
// (Condition, Drug, Observation, ...). Kept as an open string to avoid a
// drift-prone enum.
export type FeatureAnalysisDomain = string

export const FeatureAnalysisDomainSchema = z.string()

export type FeatureAnalysisStatType = 'PREVALENCE' | 'DISTRIBUTION'

export const FeatureAnalysisStatTypeSchema = z.enum(['PREVALENCE', 'DISTRIBUTION'])

// ============================================================================
// Designs
// ============================================================================

// PRESET design shape — opaque FeatureExtraction settings JSON. The full
// schema lives in the OHDSI FeatureExtraction R package and is not enforced
// here; we just keep the bag of settings.
export type CovariateSetting = Record<string, unknown>

export const CovariateSettingSchema = z.record(z.unknown())

// Aggregate metadata returned by `/feature-analysis/aggregates` — used by the
// PRESET editor to pick which aggregate of a covariate to compute. Matches
// the OHDSI WebAPI `FeatureExtractionAggregate` DTO exactly: `id` is a
// numeric primary key, `expression`/`function`/`domain` describe the SQL
// fragment, and the `default` flag (mirrored as `isDefault`) marks the
// aggregate that's auto-selected for new analyses.
export interface FeatureAnalysisAggregate {
  id: number
  name: string
  description?: string
  domain?: string | null
  function?: string | null
  expression?: string
  default?: boolean
  isDefault?: boolean
  missingMeansZero?: boolean
  additionalColumns?: string[] | null
}

export const FeatureAnalysisAggregateSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    domain: z.string().nullable().optional(),
    function: z.string().nullable().optional(),
    expression: z.string().optional(),
    default: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    missingMeansZero: z.boolean().optional(),
    additionalColumns: z.array(z.string()).nullable().optional(),
  })
  .passthrough()

// ============================================================================
// User reference (createdBy / modifiedBy come back as either string login or
// a populated user object depending on endpoint version)
// ============================================================================

const UserRefSchema = z.union([
  z.string(),
  z
    .object({
      login: z.string(),
      name: z.string().optional(),
    })
    .strip(),
])

const TagSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    color: z.string().optional(),
  })
  .strip()

const ConceptSetReferenceSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    conceptCount: z.number().optional(),
    items: z.array(z.unknown()).optional(),
  })
  .strip()

// ============================================================================
// FeatureAnalysis
// ============================================================================

// `design` shape varies by `type`:
//   PRESET       -> CovariateSetting (JSON object)
//   CRITERIA_SET -> { conceptSets, criteria } (criteria stays `unknown` until
//                   StrataEditor lands; it will become CriteriaGroup)
//   CUSTOM_FE    -> SQL string
export interface FeatureAnalysisCriteriaSetDesign {
  conceptSets: ConceptSetReference[]
  criteria: unknown
}

export interface FeatureAnalysis {
  id?: number
  name: string
  description?: string
  type: FeatureAnalysisType
  domain?: FeatureAnalysisDomain
  statType?: FeatureAnalysisStatType
  design: CovariateSetting | FeatureAnalysisCriteriaSetDesign | string
  conceptSets?: ConceptSetReference[]
  createdBy?: { login: string; name?: string } | string
  createdDate?: number
  modifiedBy?: { login: string; name?: string } | string
  modifiedDate?: number
  tags?: Tag[]
}

export const FeatureAnalysisSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    description: z.string().optional(),
    type: FeatureAnalysisTypeSchema,
    domain: FeatureAnalysisDomainSchema.optional(),
    statType: FeatureAnalysisStatTypeSchema.optional(),
    design: z.union([
      z.record(z.unknown()),
      z
        .object({
          conceptSets: z.array(ConceptSetReferenceSchema),
          criteria: z.unknown(),
        })
        .strip(),
      z.string(),
    ]),
    conceptSets: z.array(ConceptSetReferenceSchema).optional(),
    createdBy: UserRefSchema.optional(),
    createdDate: z.number().optional(),
    modifiedBy: UserRefSchema.optional(),
    modifiedDate: z.number().optional(),
    tags: z.array(TagSchema).optional(),
  })
  .strip()

// ============================================================================
// List endpoint shape (lighter — design and conceptSets aren't returned)
// ============================================================================

export const FeatureAnalysisListItemSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    type: FeatureAnalysisTypeSchema,
    domain: FeatureAnalysisDomainSchema.optional(),
    statType: FeatureAnalysisStatTypeSchema.optional(),
    createdBy: UserRefSchema.optional(),
    createdDate: z.number().optional(),
    modifiedDate: z.number().optional(),
  })
  .strip()

export type FeatureAnalysisListItem = z.infer<typeof FeatureAnalysisListItemSchema>
