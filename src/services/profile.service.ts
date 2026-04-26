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
    if (msg.includes('404')) return failure(msg, 'NOT_FOUND')
    return failure(msg)
  }
}
