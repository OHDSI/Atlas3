/**
 * Feature Analysis Types
 *
 * A Feature Analysis is a reusable analytic block used by Characterizations.
 * Modeled after the actual WebAPI wire contract rather than a generic shape:
 *   - org.ohdsi.webapi.feanalysis.dto.FeAnalysisDTO / FeAnalysisShortDTO /
 *     FeAnalysisWithConceptSetDTO, deserialized by FeAnalysisDeserializer
 *     (WebAPI repo, src/main/java/org/ohdsi/webapi/feanalysis/).
 *   - org.ohdsi.analysis.cohortcharacterization.design.FeatureAnalysis /
 *     FeatureAnalysisWithCriteria (org.ohdsi:standardized-analysis-specs:1.5.0)
 *   - SkeletonCohortCharacterization's FeatureAnalysisWithPrevalenceImpl /
 *     FeatureAnalysisWithDistributionImpl / FeatureAnalysisWithStringImpl,
 *     which is what actually consumes this JSON to build SQL.
 *
 * `design`'s shape is fully determined by `type` (+ `statType` for
 * CRITERIA_SET) at the wire level - never a generic blob:
 *   PRESET / CUSTOM_FE            -> design: string
 *   CRITERIA_SET + PREVALENCE     -> design: FeatureAnalysisCriteriaGroupItem[]
 *   CRITERIA_SET + DISTRIBUTION   -> design: FeatureAnalysisDistributionItem[]
 * Prevalence and Distribution items never mix (confirmed by
 * SkeletonCohortCharacterization's DistributionFeatureDeserializer, which
 * only ever dispatches to Windowed/Demographic - never CriteriaGroup). That is
 * why this file models each flavor as its own named type instead of unioning
 * fields inside one `FeatureAnalysis` shape.
 */
import { z } from 'zod'

import type { Tag } from './cohort.types'
import {
  ConceptSetSchema,
  CriteriaGroupSchema,
  WindowedCriteriaSchema,
  DemographicCriteriaSchema,
  type ConceptSet,
  type CriteriaGroup,
  type WindowedCriteria,
  type DemographicCriteria,
} from './circe-types'

// ============================================================================
// Enums (mirror org.ohdsi.analysis.cohortcharacterization.design / org.ohdsi.analysis,
// standardized-analysis-specs:1.5.0 - verified via `javap` against the jar,
// which ships without a sources artifact)
// ============================================================================

export type FeatureAnalysisType = 'PRESET' | 'CRITERIA_SET' | 'CUSTOM_FE'
export const FeatureAnalysisTypeSchema = z.enum(['PRESET', 'CRITERIA_SET', 'CUSTOM_FE'])

// StandardFeatureAnalysisDomain has no "ANY" member; the legacy UI's
// "ANY_DOMAIN" is a client-side sentinel for aggregate filtering, not a
// value the server ever sends/accepts here.
export type FeatureAnalysisDomain =
  | 'CONDITION'
  | 'CONDITION_ERA'
  | 'DEMOGRAPHICS'
  | 'DEVICE'
  | 'DRUG'
  | 'DRUG_ERA'
  | 'MEASUREMENT'
  | 'OBSERVATION'
  | 'PROCEDURE'
  | 'VISIT'

export const FeatureAnalysisDomainSchema = z.enum([
  'CONDITION',
  'CONDITION_ERA',
  'DEMOGRAPHICS',
  'DEVICE',
  'DRUG',
  'DRUG_ERA',
  'MEASUREMENT',
  'OBSERVATION',
  'PROCEDURE',
  'VISIT',
])

export type FeatureAnalysisStatType = 'PREVALENCE' | 'DISTRIBUTION'
export const FeatureAnalysisStatTypeSchema = z.enum(['PREVALENCE', 'DISTRIBUTION'])

export type AggregateFunction = 'COUNT' | 'AVG' | 'MIN' | 'MAX' | 'SUM'
export const AggregateFunctionSchema = z.enum(['COUNT', 'AVG', 'MIN', 'MAX', 'SUM'])

export type TableJoin = 'INNER_JOIN' | 'LEFT_JOIN' | 'RIGHT_JOIN' | 'CROSS_JOIN'
export const TableJoinSchema = z.enum(['INNER_JOIN', 'LEFT_JOIN', 'RIGHT_JOIN', 'CROSS_JOIN'])

// ============================================================================
// Aggregate metadata (FeAnalysisAggregateDTO / FeatureAnalysisAggregate)
// ============================================================================

export interface FeatureAnalysisAggregate {
  id: number
  name: string
  domain?: FeatureAnalysisDomain | null
  function?: AggregateFunction | null
  expression?: string | null
  joinTable?: string | null
  joinType?: TableJoin | null
  joinCondition?: string | null
  isDefault?: boolean
  missingMeansZero?: boolean
  additionalColumns?: string[] | null
}

export const FeatureAnalysisAggregateSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    domain: FeatureAnalysisDomainSchema.nullable().optional(),
    function: AggregateFunctionSchema.nullable().optional(),
    expression: z.string().nullable().optional(),
    joinTable: z.string().nullable().optional(),
    joinType: TableJoinSchema.nullable().optional(),
    joinCondition: z.string().nullable().optional(),
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
// CRITERIA_SET design items (BaseFeAnalysisCriteriaDTO + subtypes, discriminated
// on the wire by `criteriaType`)
// ============================================================================

export interface FeatureAnalysisCriteriaGroupItem {
  id?: number
  name: string
  criteriaType: 'CriteriaGroup'
  aggregate?: FeatureAnalysisAggregate
  expression: CriteriaGroup
}

export const FeatureAnalysisCriteriaGroupItemSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    criteriaType: z.literal('CriteriaGroup'),
    aggregate: FeatureAnalysisAggregateSchema.optional(),
    expression: CriteriaGroupSchema,
  })
  .passthrough()

export interface FeatureAnalysisWindowedCriteriaItem {
  id?: number
  name: string
  criteriaType: 'WindowedCriteria'
  aggregate?: FeatureAnalysisAggregate
  expression: WindowedCriteria
}

export const FeatureAnalysisWindowedCriteriaItemSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    criteriaType: z.literal('WindowedCriteria'),
    aggregate: FeatureAnalysisAggregateSchema.optional(),
    expression: WindowedCriteriaSchema,
  })
  .passthrough()

export interface FeatureAnalysisDemographicCriteriaItem {
  id?: number
  name: string
  criteriaType: 'DemographicCriteria'
  aggregate?: FeatureAnalysisAggregate
  expression: DemographicCriteria
}

export const FeatureAnalysisDemographicCriteriaItemSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    criteriaType: z.literal('DemographicCriteria'),
    aggregate: FeatureAnalysisAggregateSchema.optional(),
    expression: DemographicCriteriaSchema,
  })
  .passthrough()

// Distribution items are always Windowed or Demographic - never CriteriaGroup
// (DistributionFeatureDeserializer in SkeletonCohortCharacterization only
// dispatches to those two).
export type FeatureAnalysisDistributionItem =
  | FeatureAnalysisWindowedCriteriaItem
  | FeatureAnalysisDemographicCriteriaItem

export const FeatureAnalysisDistributionItemSchema = z.union([
  FeatureAnalysisWindowedCriteriaItemSchema,
  FeatureAnalysisDemographicCriteriaItemSchema,
])

// ============================================================================
// FeatureAnalysis - one named shape per design flavor, matching the three
// SkeletonCohortCharacterization Impl classes 1:1 (FeatureAnalysisWithStringImpl
// covers both PRESET and CUSTOM_FE - the server uses the same impl for both).
// ============================================================================

interface FeatureAnalysisCommon {
  id?: number
  name: string
  description?: string
  domain?: FeatureAnalysisDomain
  // Echoed back by the server on every response (FeAnalysisShortDTO); ignored
  // if sent back on update (FeAnalysisServiceImpl.updateAnalysis never reads
  // them), so treat as read-only.
  supportsAnnual?: boolean
  supportsTemporal?: boolean
  createdBy?: { login: string; name?: string } | string
  createdDate?: number
  modifiedBy?: { login: string; name?: string } | string
  modifiedDate?: number
  tags?: Tag[]
}

export interface StringDesignFeatureAnalysis extends FeatureAnalysisCommon {
  type: 'PRESET' | 'CUSTOM_FE'
  design: string
}

export interface PrevalenceFeatureAnalysis extends FeatureAnalysisCommon {
  type: 'CRITERIA_SET'
  statType: 'PREVALENCE'
  design: FeatureAnalysisCriteriaGroupItem[]
  conceptSets: ConceptSet[]
}

export interface DistributionFeatureAnalysis extends FeatureAnalysisCommon {
  type: 'CRITERIA_SET'
  statType: 'DISTRIBUTION'
  design: FeatureAnalysisDistributionItem[]
  conceptSets: ConceptSet[]
}

export type FeatureAnalysis =
  | StringDesignFeatureAnalysis
  | PrevalenceFeatureAnalysis
  | DistributionFeatureAnalysis

const FeatureAnalysisCommonSchemaShape = {
  id: z.number().optional(),
  name: z.string(),
  description: z.string().optional(),
  domain: FeatureAnalysisDomainSchema.optional(),
  supportsAnnual: z.boolean().optional(),
  supportsTemporal: z.boolean().optional(),
  createdBy: UserRefSchema.optional(),
  createdDate: z.number().optional(),
  modifiedBy: UserRefSchema.optional(),
  modifiedDate: z.number().optional(),
  tags: z.array(TagSchema).optional(),
}

export const StringDesignFeatureAnalysisSchema = z
  .object({
    ...FeatureAnalysisCommonSchemaShape,
    type: z.enum(['PRESET', 'CUSTOM_FE']),
    design: z.string(),
  })
  .passthrough()

export const PrevalenceFeatureAnalysisSchema = z
  .object({
    ...FeatureAnalysisCommonSchemaShape,
    type: z.literal('CRITERIA_SET'),
    statType: z.literal('PREVALENCE'),
    design: z.array(FeatureAnalysisCriteriaGroupItemSchema),
    conceptSets: z.array(ConceptSetSchema),
  })
  .passthrough()

export const DistributionFeatureAnalysisSchema = z
  .object({
    ...FeatureAnalysisCommonSchemaShape,
    type: z.literal('CRITERIA_SET'),
    statType: z.literal('DISTRIBUTION'),
    design: z.array(FeatureAnalysisDistributionItemSchema),
    conceptSets: z.array(ConceptSetSchema),
  })
  .passthrough()

// Plain z.union (not discriminatedUnion): PREVALENCE and DISTRIBUTION share
// `type: 'CRITERIA_SET'`, so a single discriminant key can't tell all three
// branches apart. Same convention already used for circe's `Criteria` union
// in circe-types.ts.
export const FeatureAnalysisSchema = z.union([
  StringDesignFeatureAnalysisSchema,
  PrevalenceFeatureAnalysisSchema,
  DistributionFeatureAnalysisSchema,
])

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
    supportsAnnual: z.boolean().optional(),
    supportsTemporal: z.boolean().optional(),
    createdBy: UserRefSchema.optional(),
    createdDate: z.number().optional(),
    modifiedDate: z.number().optional(),
  })
  .passthrough()

export type FeatureAnalysisListItem = z.infer<typeof FeatureAnalysisListItemSchema>
