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

export const DrilldownReportSchema = z.object({
  AGE_AT_FIRST_OCCURRENCE: z
    .array(
      z.object({
        CATEGORY: z.string(),
        MIN_VALUE: z.number(),
        P10_VALUE: z.number(),
        P25_VALUE: z.number(),
        MEDIAN_VALUE: z.number(),
        P75_VALUE: z.number(),
        P90_VALUE: z.number(),
        MAX_VALUE: z.number(),
      })
    )
    .default([]),
  PREVALENCE_BY_GENDER_AGE_YEAR: z
    .array(
      z.object({
        TRELLIS_NAME: z.string(),
        SERIES_NAME: z.string(),
        X_CALENDAR_YEAR: z.number(),
        Y_PREVALENCE_1000PP: z.number(),
      })
    )
    .default([]),
  PREVALENCE_BY_MONTH: z
    .array(
      z.object({
        X_CALENDAR_MONTH: z.number(),
        Y_PREVALENCE_1000PP: z.number(),
      })
    )
    .default([]),
}).passthrough()

export interface DrilldownReport {
  ageAtFirstOccurrence: Array<{
    category: string
    minValue: number
    p10Value: number
    p25Value: number
    medianValue: number
    p75Value: number
    p90Value: number
    maxValue: number
  }>
  prevalenceByGenderAgeYear: Array<{
    trellisName: string
    seriesName: string
    calendarYear: number
    prevalence1000pp: number
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
