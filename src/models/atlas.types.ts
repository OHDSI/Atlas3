import type { CohortExpression } from '@/components/cohort-editor/circe.types'
import type { CohortDefinition } from '@/models/cohort.types'

export type AtlasCohortDefinition = Omit<CohortDefinition, 'expression'> & {
  expression?: string | CohortExpression
}

export type AtlasCohortDefinitionInput = AtlasCohortDefinition | CohortExpression

export function isAtlasCohortDefinitionWrapper(
  value: AtlasCohortDefinitionInput
): value is AtlasCohortDefinition {
  return typeof value === 'object' && value !== null && 'name' in value && 'expression' in value
}