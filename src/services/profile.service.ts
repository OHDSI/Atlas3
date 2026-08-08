import { httpGet } from '@/services/http-client'
import { type ApiResult } from '@/types/api'
import { unwrap, parseOrThrow } from '@/services/api-error'
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
  return unwrap(async () => {
    const cohort = cohortId ?? 0
    const endpoint = `/${sourceKey}/person/${personId}?cohort=${cohort}`
    const data = await httpGet<unknown>(endpoint)
    return parseOrThrow(PersonProfileSchema, data, 'Invalid person profile response format')
  }, 'ProfileService')
}

export async function getCohortConceptSets(
  cohortDefinitionId: number
): Promise<ApiResult<CohortConceptSet[]>> {
  return unwrap(async () => {
    const def = await httpGet<{ expression: string | unknown }>(
      `/cohortdefinition/${cohortDefinitionId}`
    )
    const raw = typeof def.expression === 'string' ? safeParseJson(def.expression) : def.expression
    const parsed = CohortDefExpressionSchema.safeParse(raw)
    if (!parsed.success) return []
    return parsed.data.ConceptSets ?? []
  }, 'ProfileService')
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
