// src/models/concept-detail.types.ts
import { z } from 'zod'

export const ConceptRelationshipSchema = z.object({
  RELATIONSHIP_NAME: z.string(),
  RELATIONSHIP_DISTANCE: z.number(),
})

export const RelatedConceptApiSchema = z.object({
  CONCEPT_ID: z.number(),
  CONCEPT_NAME: z.string(),
  CONCEPT_CODE: z.string(),
  DOMAIN_ID: z.string(),
  VOCABULARY_ID: z.string(),
  CONCEPT_CLASS_ID: z.string(),
  STANDARD_CONCEPT: z.string().nullable(),
  INVALID_REASON: z.string().nullable(),
  VALID_START_DATE: z.union([z.string(), z.number()]).optional(),
  VALID_END_DATE: z.union([z.string(), z.number()]).optional(),
  RELATIONSHIPS: z.array(ConceptRelationshipSchema).default([]),
})

export const RelatedConceptsResponseSchema = z.array(RelatedConceptApiSchema)

export interface ConceptRelationship {
  relationshipName: string
  relationshipDistance: number
}

export interface RelatedConcept {
  conceptId: number
  conceptName: string
  conceptCode: string
  domainId: string
  vocabularyId: string
  conceptClassId: string
  standardConcept: string | null
  invalidReason: string | null
  validStartDate?: string
  validEndDate?: string
  relationships: ConceptRelationship[]
}

export interface ConceptRecordCount {
  recordCount: number
  descendantRecordCount: number
  personCount: number
  descendantPersonCount: number
}

export type DrilldownDomain =
  | 'condition'
  | 'drug'
  | 'procedure'
  | 'measurement'
  | 'observation'
  | 'device'

const BoxPlotRowSchema = z
  .object({
    category: z.string().optional(),
    minValue: z.number().nullable().optional(),
    p10Value: z.number().nullable().optional(),
    p25Value: z.number().nullable().optional(),
    medianValue: z.number().nullable().optional(),
    p75Value: z.number().nullable().optional(),
    p90Value: z.number().nullable().optional(),
    maxValue: z.number().nullable().optional(),
  })
  .passthrough()

const PrevalenceByMonthRowSchema = z
  .object({
    xCalendarMonth: z.number(),
    yPrevalence1000Pp: z.number(),
  })
  .passthrough()

const PrevalenceByGenderAgeYearRowSchema = z
  .object({
    trellisName: z.string().optional(),
    seriesName: z.string().optional(),
    xCalendarYear: z.number().optional(),
    yPrevalence1000Pp: z.number().optional(),
  })
  .passthrough()

export const DrilldownReportSchema = z
  .object({
    ageAtFirstOccurrence: z.array(BoxPlotRowSchema).optional(),
    ageAtFirstDiagnosis: z.array(BoxPlotRowSchema).optional(),
    ageAtFirstExposure: z.array(BoxPlotRowSchema).optional(),
    prevalenceByGenderAgeYear: z.array(PrevalenceByGenderAgeYearRowSchema).optional(),
    prevalenceByMonth: z.array(PrevalenceByMonthRowSchema).optional(),
  })
  .passthrough()

export interface BoxPlotRow {
  category?: string
  minValue?: number | null
  p10Value?: number | null
  p25Value?: number | null
  medianValue?: number | null
  p75Value?: number | null
  p90Value?: number | null
  maxValue?: number | null
}

export interface DrilldownReport {
  ageAtFirstOccurrence: BoxPlotRow[]
  prevalenceByGenderAgeYear: Array<{
    trellisName?: string
    seriesName?: string
    calendarYear?: number
    prevalence1000pp?: number
  }>
  prevalenceByMonth: Array<{
    calendarMonth: number
    prevalence1000pp: number
  }>
}

export const DRILLDOWN_DOMAINS: ReadonlySet<DrilldownDomain> = new Set([
  'condition',
  'drug',
  'procedure',
  'measurement',
  'observation',
  'device',
])

export function domainPath(domainId: string): DrilldownDomain | null {
  const lowered = domainId.toLowerCase() as DrilldownDomain
  return DRILLDOWN_DOMAINS.has(lowered) ? lowered : null
}
