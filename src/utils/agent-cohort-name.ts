import type { CohortExpression } from '@/models/circe-types'

const FALLBACK_NAME = 'Untitled cohort'

export function defaultAgentCohortName(expression: CohortExpression | null | undefined): string {
  const first = expression?.PrimaryCriteria?.CriteriaList?.[0] as
    | Record<string, { CodesetId?: number | string | null } | null | undefined>
    | undefined
  const criterion = first ? Object.values(first)[0] : undefined
  const codesetId = criterion?.CodesetId
  if (codesetId == null) return FALLBACK_NAME
  const set = expression?.ConceptSets?.find(cs => String(cs.id) === String(codesetId))
  const name = set?.name?.trim()
  return name ? `${name} cohort` : FALLBACK_NAME
}
