import { z } from 'zod'

// WebAPI nullability is inconsistent across CDM versions: some
// records ship epoch-millis dates, others ship null and rely on
// startDay/endDay (offsets from the cohort start) for plotting.
// The schema accepts both shapes — `nullish()` matches null,
// undefined, or a missing key.
export const PersonRecordSchema = z.object({
  conceptId: z.number(),
  conceptName: z.string(),
  domain: z.string(),
  startDate: z.number().nullish(),
  endDate: z.number().nullish(),
  startDay: z.number(),
  endDay: z.number().nullish(),
})
export type PersonRecord = z.infer<typeof PersonRecordSchema>

export const PersonCohortSchema = z.object({
  cohortDefinitionId: z.number(),
  startDate: z.number().nullish(),
  endDate: z.number().nullish(),
})
export type PersonCohort = z.infer<typeof PersonCohortSchema>

export const ObservationPeriodSchema = z.object({
  startDate: z.number().nullish(),
  endDate: z.number().nullish(),
  startDays: z.number().nullish(),
  endDays: z.number().nullish(),
})
export type ObservationPeriod = z.infer<typeof ObservationPeriodSchema>

// monthOfBirth / dayOfBirth are absent on Eunomia (and a number of
// other CDM 5+ sources) — the WebAPI just omits the keys instead
// of returning null. `nullish()` handles all three cases.
export const PersonProfileSchema = z.object({
  gender: z.string(),
  yearOfBirth: z.number(),
  monthOfBirth: z.number().nullish(),
  dayOfBirth: z.number().nullish(),
  ageAtIndex: z.number().nullish(),
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
