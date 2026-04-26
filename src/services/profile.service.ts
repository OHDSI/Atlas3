import { httpGet } from '@/services/http-client'
import { logger } from '@/utils/logger'
import { type ApiResult, success, failure } from '@/types/api'
import { PersonProfileSchema, type PersonProfile } from '@/models/profile.types'

export async function getPerson(
  sourceKey: string,
  personId: number,
  cohortId?: number
): Promise<ApiResult<PersonProfile>> {
  const cohort = cohortId ?? 0
  const endpoint = `/${sourceKey}/person/${personId}?cohort=${cohort}`
  try {
    const data = await httpGet<unknown>(endpoint)
    const parsed = PersonProfileSchema.safeParse(data)
    if (!parsed.success) {
      logger.error('ProfileService', 'Person profile schema validation failed', parsed.error)
      return failure('Invalid person profile response format')
    }
    return success(parsed.data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch person profile'
    logger.error('ProfileService', 'Failed to fetch person profile', err)
    if (msg.startsWith('HTTP 404:')) return failure(msg, 'NOT_FOUND')
    return failure(msg)
  }
}

export interface CohortConceptSet {
  id: number
  name: string
}

type CohortDefExpression = { ConceptSets?: Array<{ id: number; name: string }> }

export async function getCohortConceptSets(
  cohortDefinitionId: number
): Promise<ApiResult<CohortConceptSet[]>> {
  try {
    const def = await httpGet<{ expression: string | CohortDefExpression }>(
      `/cohortdefinition/${cohortDefinitionId}`
    )
    const expr = (typeof def.expression === 'string'
      ? safeParseJson(def.expression)
      : def.expression) as CohortDefExpression | null
    const sets =
      (expr && typeof expr === 'object' && 'ConceptSets' in expr ? expr.ConceptSets : []) ?? []
    return success(sets.map((s) => ({ id: s.id, name: s.name })))
  } catch (err) {
    logger.error('ProfileService', 'Failed to fetch cohort concept sets', err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch cohort concept sets')
  }
}

function safeParseJson(s: string): unknown {
  try { return JSON.parse(s) } catch { return null }
}
