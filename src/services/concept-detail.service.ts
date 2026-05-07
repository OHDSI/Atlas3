import { httpClient } from '@/services/http-client'
import { logger } from '@/utils/logger'
import {
  RelatedConceptsResponseSchema,
  DrilldownReportSchema,
  domainPath,
  type RelatedConcept,
  type DrilldownReport,
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

export async function getConceptDrilldown(
  sourceKey: string,
  domainId: string,
  conceptId: number
): Promise<DrilldownReport | null> {
  const path = domainPath(domainId)
  if (!path) return null

  try {
    const data = await httpClient<unknown>(`/cdmresults/${sourceKey}/${path}/${conceptId}`)
    const parsed = DrilldownReportSchema.safeParse(data)
    if (!parsed.success) {
      logger.error('ConceptDetail', 'getConceptDrilldown validation failed', parsed.error)
      return null
    }
    const d = parsed.data
    return {
      ageAtFirstOccurrence: d.AGE_AT_FIRST_OCCURRENCE.map((r) => ({
        category: r.CATEGORY,
        minValue: r.MIN_VALUE,
        p10Value: r.P10_VALUE,
        p25Value: r.P25_VALUE,
        medianValue: r.MEDIAN_VALUE,
        p75Value: r.P75_VALUE,
        p90Value: r.P90_VALUE,
        maxValue: r.MAX_VALUE,
      })),
      prevalenceByGenderAgeYear: d.PREVALENCE_BY_GENDER_AGE_YEAR.map((r) => ({
        trellisName: r.TRELLIS_NAME,
        seriesName: r.SERIES_NAME,
        calendarYear: r.X_CALENDAR_YEAR,
        prevalence1000pp: r.Y_PREVALENCE_1000PP,
      })),
      prevalenceByMonth: d.PREVALENCE_BY_MONTH.map((r) => ({
        calendarMonth: r.X_CALENDAR_MONTH,
        prevalence1000pp: r.Y_PREVALENCE_1000PP,
      })),
    }
  } catch (error) {
    logger.error(
      'ConceptDetail',
      `getConceptDrilldown failed for ${sourceKey}/${domainId}/${conceptId}`,
      error
    )
    return null
  }
}
