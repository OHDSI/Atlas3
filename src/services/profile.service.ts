import { httpGet } from '@/services/http-client'
import { logger } from '@/utils/logger'
import { type ApiResult, success, failure } from '@/types/api'
import {
  PersonProfileSchema,
  type PersonProfile,
  CohortDefExpressionSchema,
  type CohortConceptSet,
} from '@/models/profile.types'

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

export async function getCohortConceptSets(
  cohortDefinitionId: number
): Promise<ApiResult<CohortConceptSet[]>> {
  try {
    const def = await httpGet<{ expression: string | unknown }>(
      `/cohortdefinition/${cohortDefinitionId}`
    )
    const raw = typeof def.expression === 'string'
      ? safeParseJson(def.expression)
      : def.expression
    const parsed = CohortDefExpressionSchema.safeParse(raw)
    if (!parsed.success) return success([])
    return success(parsed.data.ConceptSets ?? [])
  } catch (err) {
    logger.error('ProfileService', 'Failed to fetch cohort concept sets', err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch cohort concept sets')
  }
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
