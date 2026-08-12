import type { CohortDefinition } from '@/models/cohort.types'

export type RawCohortDefinition = Omit<CohortDefinition, 'expression'> & {
  expression: string
}