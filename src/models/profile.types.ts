import { z } from 'zod'

export const PersonRecordSchema = z.object({
  conceptId: z.number(),
  conceptName: z.string(),
  domain: z.string(),
  startDate: z.number(),
  endDate: z.number().nullable(),
  startDay: z.number(),
  endDay: z.number().nullable(),
})
export type PersonRecord = z.infer<typeof PersonRecordSchema>

export const PersonCohortSchema = z.object({
  cohortDefinitionId: z.number(),
  startDate: z.number(),
  endDate: z.number().nullable(),
})
export type PersonCohort = z.infer<typeof PersonCohortSchema>

export const ObservationPeriodSchema = z.object({
  startDate: z.number(),
  endDate: z.number(),
  startDays: z.number(),
  endDays: z.number(),
})
export type ObservationPeriod = z.infer<typeof ObservationPeriodSchema>

export const PersonProfileSchema = z.object({
  gender: z.string(),
  yearOfBirth: z.number(),
  monthOfBirth: z.number().nullable(),
  dayOfBirth: z.number().nullable(),
  ageAtIndex: z.number(),
  recordCount: z.number(),
  records: z.array(PersonRecordSchema),
  cohorts: z.array(PersonCohortSchema),
  observationPeriods: z.array(ObservationPeriodSchema),
})
export type PersonProfile = z.infer<typeof PersonProfileSchema>

export const HIGHLIGHT_PALETTE = [
  '#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c',
] as const
export type HighlightColor = typeof HIGHLIGHT_PALETTE[number] | 'none'

export const DEFAULT_HIGHLIGHT_COLOR = '#888888'

export const OMOP_DOMAINS = [
  'Drug', 'Condition', 'Visit', 'Procedure', 'Observation', 'Measurement',
  'Device', 'Specimen', 'ConditionEra', 'DrugEra', 'DoseEra', 'Death',
] as const

export const CohortConceptSetSchema = z.object({
  id: z.number(),
  name: z.string(),
})
export type CohortConceptSet = z.infer<typeof CohortConceptSetSchema>

export const CohortDefExpressionSchema = z.object({
  ConceptSets: z.array(CohortConceptSetSchema).optional(),
})
export type CohortDefExpression = z.infer<typeof CohortDefExpressionSchema>
