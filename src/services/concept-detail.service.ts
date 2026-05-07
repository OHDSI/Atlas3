import { httpClient } from '@/services/http-client'
import { logger } from '@/utils/logger'
import {
  RelatedConceptsResponseSchema,
  type RelatedConcept,
} from '@/models/concept-detail.types'

function mapRelatedFromApi(
  api: ReturnType<typeof RelatedConceptsResponseSchema.parse>[number]
): RelatedConcept {
  return {
    conceptId: api.CONCEPT_ID,
    conceptName: api.CONCEPT_NAME,
    conceptCode: api.CONCEPT_CODE,
    domainId: api.DOMAIN_ID,
    vocabularyId: api.VOCABULARY_ID,
    conceptClassId: api.CONCEPT_CLASS_ID,
    standardConcept: api.STANDARD_CONCEPT,
    invalidReason: api.INVALID_REASON,
    validStartDate: api.VALID_START_DATE != null ? String(api.VALID_START_DATE) : undefined,
    validEndDate: api.VALID_END_DATE != null ? String(api.VALID_END_DATE) : undefined,
    relationships: api.RELATIONSHIPS.map((r) => ({
      relationshipName: r.RELATIONSHIP_NAME,
      relationshipDistance: r.RELATIONSHIP_DISTANCE,
    })),
  }
}

export async function getConceptRelated(
  sourceKey: string,
  conceptId: number
): Promise<RelatedConcept[]> {
  try {
    const data = await httpClient<unknown>(
      `/vocabulary/${sourceKey}/concept/${conceptId}/related`
    )
    const parsed = RelatedConceptsResponseSchema.safeParse(data)
    if (!parsed.success) {
      logger.error('ConceptDetail', 'getConceptRelated validation failed', parsed.error)
      return []
    }
    return parsed.data.map(mapRelatedFromApi)
  } catch (error) {
    logger.error('ConceptDetail', `getConceptRelated failed for ${sourceKey}/${conceptId}`, error)
    return []
  }
}

export async function getConceptAncestorAndDescendant(
  sourceKey: string,
  conceptId: number
): Promise<RelatedConcept[]> {
  try {
    const data = await httpClient<unknown>(
      `/vocabulary/${sourceKey}/concept/${conceptId}/ancestorAndDescendant`
    )
    const parsed = RelatedConceptsResponseSchema.safeParse(data)
    if (!parsed.success) {
      logger.error('ConceptDetail', 'getConceptAncestorAndDescendant validation failed', parsed.error)
      return []
    }
    return parsed.data.map(mapRelatedFromApi)
  } catch (error) {
    logger.error(
      'ConceptDetail',
      `getConceptAncestorAndDescendant failed for ${sourceKey}/${conceptId}`,
      error
    )
    return []
  }
}
