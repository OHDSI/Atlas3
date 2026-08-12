import type { CohortExpression } from '@/components/cohort-editor/circe.types'
import type { CohortDefinition } from '@/models/cohort.types'

export type AtlasCohortDefinition = Omit<CohortDefinition, 'expression'> & {
  expression?: string | CohortExpression
}

export interface AtlasCohortDefinitionWrapper {
  id?: number
  name?: string
  description?: string
  tags?: Array<{ id?: number; name: string; color?: string }>
  expression: AtlasCohortDefinition | string
}

export type AtlasCohortDefinitionInput = AtlasCohortDefinition | AtlasCohortDefinitionWrapper

export function isAtlasCohortDefinitionWrapper(
  input: AtlasCohortDefinitionInput
): input is AtlasCohortDefinitionWrapper {
  return (
    'expression' in input &&
    (typeof input.expression === 'object' || typeof input.expression === 'string')
  )
}