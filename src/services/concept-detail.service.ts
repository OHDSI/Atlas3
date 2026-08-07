import { httpClient } from '@/services/http-client'
import {
  RelatedConceptsResponseSchema,
  domainPath,
  type RelatedConcept,
} from '@/models/concept-detail.types'
import type { DrilldownReport, WebAPIDrilldownRaw } from '@/models/report.types'
import { mapDrilldownReport } from '@/services/report-mapper'

// `cause` is declared here rather than passed to Error's constructor: the
// project targets ES2020, whose Error has no cause option.
export class ConceptDetailServiceError extends Error {
  readonly cause: unknown

  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'ConceptDetailServiceError'
    this.cause = cause
  }
}

interface RequestContext {
  endpoint: string
  sourceKey: string
  conceptId: number
}

function serviceError(context: RequestContext, reason: string, cause: unknown) {
  return new ConceptDetailServiceError(
    `${context.endpoint} ${reason} for ${context.sourceKey}/${context.conceptId}`,
    cause
  )
}

async function fetchAndParse<T>(
  path: string,
  context: RequestContext,
  parse: (data: unknown) => T
): Promise<T> {
  let data: unknown
  try {
    data = await httpClient<unknown>(path)
  } catch (cause) {
    throw serviceError(context, 'request failed', cause)
  }
  try {
    return parse(data)
  } catch (cause) {
    throw serviceError(context, 'response validation failed', cause)
  }
}

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

function parseRelatedConcepts(data: unknown): RelatedConcept[] {
  const parsed = RelatedConceptsResponseSchema.safeParse(data)
  if (!parsed.success) throw parsed.error
  return parsed.data.map(mapRelatedFromApi)
}

export async function getConceptRelated(
  sourceKey: string,
  conceptId: number
): Promise<RelatedConcept[]> {
  return fetchAndParse(
    `/vocabulary/${sourceKey}/concept/${conceptId}/related`,
    { endpoint: 'getConceptRelated', sourceKey, conceptId },
    parseRelatedConcepts
  )
}

export async function getConceptAncestorAndDescendant(
  sourceKey: string,
  conceptId: number
): Promise<RelatedConcept[]> {
  return fetchAndParse(
    `/vocabulary/${sourceKey}/concept/${conceptId}/ancestorAndDescendant`,
    { endpoint: 'getConceptAncestorAndDescendant', sourceKey, conceptId },
    parseRelatedConcepts
  )
}

// null means the domain has no drilldown report at all — the only "no data"
// answer this function gives; every failure throws.
export async function getConceptDrilldown(
  sourceKey: string,
  domainId: string,
  conceptId: number,
  conceptName = '',
): Promise<DrilldownReport | null> {
  const path = domainPath(domainId)
  if (!path) return null

  return fetchAndParse(
    `/cdmresults/${sourceKey}/${path}/${conceptId}`,
    { endpoint: 'getConceptDrilldown', sourceKey, conceptId },
    (data) => {
      if (!data || typeof data !== 'object') {
        throw new Error(`expected an object, received ${data === null ? 'null' : typeof data}`)
      }
      return mapDrilldownReport(data as WebAPIDrilldownRaw, conceptId, conceptName, '', path)
    }
  )
}
