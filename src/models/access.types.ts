import { z } from 'zod'

export const AccessTypeSchema = z.enum(['READ', 'WRITE'])
export type AccessType = z.infer<typeof AccessTypeSchema>

export const AccessEntityTypeSchema = z.enum([
  'COHORT_DEFINITION',
  'CONCEPT_SET',
  'COHORT_CHARACTERIZATION',
  'FE_ANALYSIS',
  'PATHWAY_ANALYSIS',
  'INCIDENCE_RATE',
  'REUSABLE',
  'SOURCE',
])

export type AccessEntityType = z.infer<typeof AccessEntityTypeSchema>