/**
 * Concept Search Service
 * Business logic for searching and retrieving medical concepts
 */
import {
  ConceptSearchResponseSchema,
  ComparisonResultSchema,
  type Concept,
  type ComparisonResultItem,
  type ConceptSetExpression,
} from '@/models/concept-set.types'
import { mapConceptFromAPI, mapComparisonItemFromAPI } from '@/utils/api-mappers'
import { logger } from '@/utils/logger'
import { httpClient, httpPostRead } from '@/services/http-client'

type ConceptRecordCountResponse = Array<Record<string, number[]>>

export type RecommendedConceptsResult =
  | { available: true; concepts: Concept[] }
  | { available: false; concepts: [] }

// httpClient throws `Error('HTTP {status}: {statusText}')` — parse the code
// out so we can distinguish 501 (feature unavailable) from real failures.
function extractHttpStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null
  const match = /^HTTP (\d{3})\b/.exec(error.message)
  if (!match || !match[1]) return null
  return parseInt(match[1], 10)
}

export async function searchConcepts(
  sourceKey: string,
  query: string,
  options?: {
    page?: number
    pageSize?: number
    domain?: string
  }
): Promise<{ concepts: Concept[]; total: number }> {
  if (!query || query.length < 1) {
    return { concepts: [], total: 0 }
  }

  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    throw new Error('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  // Use POST /vocabulary/{sourceKey}/search with a JSON body. Current WebAPI
  // builds silently return [] for the GET form (`?query=...`), which made
  // every concept picker look broken.
  const endpoint = `/vocabulary/${sourceKey}/search`
  const body: Record<string, unknown> = { QUERY: query.trim() }
  if (options?.domain) {
    body.DOMAIN_ID = [options.domain]
  }
  const data = await httpPostRead<unknown>(endpoint, body)
  const parsed = ConceptSearchResponseSchema.safeParse(data)

  if (!parsed.success) {
    logger.error('ConceptSearch', 'Concept search validation error', parsed.error)
    throw new Error('Invalid concept search response format')
  }

  const concepts = parsed.data.map(mapConceptFromAPI)
  return { concepts, total: concepts.length }
}

export async function getConceptById(
  sourceKey: string,
  conceptId: number
): Promise<Concept | null> {
  try {
    const endpoint = `/vocabulary/${sourceKey}/concept/${conceptId}`
    const data = await httpClient<unknown>(endpoint)
    const parsed = ConceptSearchResponseSchema.element.safeParse(data)

    if (!parsed.success) {
      logger.error('ConceptSearch', 'Concept detail validation error', parsed.error)
      return null
    }

    return mapConceptFromAPI(parsed.data)
  } catch (error) {
    logger.error('ConceptSearch', `Failed to fetch concept ${conceptId}`, error)
    return null
  }
}

/**
 * Resolve a batch of concept IDs to full Concept records in a single request.
 * Uses the WebAPI batch endpoint `POST /vocabulary/{sourceKey}/lookup/identifiers`
 * (the same one `resolveConceptSetExpression` uses for its second hop). This is
 * far cheaper than N individual `getConceptById` GETs when resolving pasted IDs.
 *
 * The endpoint only returns rows for IDs it can resolve, so callers should diff
 * the returned `conceptId`s against the requested list to find unresolved IDs.
 */
export async function getConceptsByIds(
  sourceKey: string,
  conceptIds: number[],
  signal?: AbortSignal,
): Promise<Concept[]> {
  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    throw new Error('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  if (conceptIds.length === 0) return []

  const raw = await httpPostRead<unknown>(
    `/vocabulary/${sourceKey}/lookup/identifiers`,
    conceptIds,
    { signal },
  )

  const parsed = ConceptSearchResponseSchema.safeParse(raw)
  if (!parsed.success) {
    logger.error('ConceptSearch', 'lookup/identifiers validation error', parsed.error)
    throw new Error('Invalid concept identifier lookup response format')
  }

  return parsed.data.map(mapConceptFromAPI)
}

/**
 * Resolve a batch of source codes to Concept records in a single request.
 * Uses the WebAPI endpoint `POST /vocabulary/{sourceKey}/lookup/sourcecodes`
 * with a JSON array of source-code strings. Only resolvable codes are returned,
 * so callers should diff the returned `conceptCode`s against the requested list
 * to find unresolved codes.
 */
export async function getConceptsBySourceCodes(
  sourceKey: string,
  sourceCodes: string[],
  signal?: AbortSignal,
): Promise<Concept[]> {
  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    throw new Error('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  if (sourceCodes.length === 0) return []

  const raw = await httpPostRead<unknown>(
    `/vocabulary/${sourceKey}/lookup/sourcecodes`,
    sourceCodes,
    { signal },
  )

  const parsed = ConceptSearchResponseSchema.safeParse(raw)
  if (!parsed.success) {
    logger.error('ConceptSearch', 'lookup/sourcecodes validation error', parsed.error)
    throw new Error('Invalid source code lookup response format')
  }

  return parsed.data.map(mapConceptFromAPI)
}

/**
 * Resolve the *source* codes that map to a set of standard concept IDs.
 * Uses `POST /vocabulary/{sourceKey}/lookup/mapped` with a JSON array of concept
 * identifiers — the resolved/included standard concept IDs. Returns the mapped
 * source Concept records (non-standard codes such as ICD10CM, ICD9CM, source
 * SNOMED). Mirrors getConceptsByIds, which uses lookup/identifiers.
 */
export async function getMappedSourceCodes(
  sourceKey: string,
  conceptIds: number[],
  signal?: AbortSignal,
): Promise<Concept[]> {
  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    throw new Error('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  if (conceptIds.length === 0) return []

  const raw = await httpPostRead<unknown>(
    `/vocabulary/${sourceKey}/lookup/mapped`,
    conceptIds,
    { signal },
  )

  const parsed = ConceptSearchResponseSchema.safeParse(raw)
  if (!parsed.success) {
    logger.error('ConceptSearch', 'lookup/mapped validation error', parsed.error)
    throw new Error('Invalid mapped source code lookup response format')
  }

  return parsed.data.map(mapConceptFromAPI)
}

export async function getConceptRecordCounts(
  sourceKey: string,
  conceptIds: number[]
): Promise<
  Map<
    number,
    {
      recordCount: number
      descendantRecordCount: number
      personCount: number
      descendantPersonCount: number
    }
  >
> {
  const recordCountMap = new Map()

  if (conceptIds.length === 0) {
    return recordCountMap
  }

  try {
    const endpoint = `/cdmresults/${sourceKey}/conceptRecordCount`
    const data = await httpPostRead<ConceptRecordCountResponse>(endpoint, conceptIds)

    for (const entry of data) {
      for (const [conceptIdStr, counts] of Object.entries(entry)) {
        const conceptId = parseInt(conceptIdStr, 10)
        if (Array.isArray(counts) && counts.length === 4) {
          recordCountMap.set(conceptId, {
            recordCount: counts[0] || 0,
            descendantRecordCount: counts[1] || 0,
            personCount: counts[2] || 0,
            descendantPersonCount: counts[3] || 0,
          })
        }
      }
    }
  } catch (error) {
    logger.error('ConceptSearch', 'Failed to fetch concept record counts', error)
  }

  return recordCountMap
}

export async function getRecommendedConcepts(
  sourceKey: string,
  conceptIds: number[]
): Promise<RecommendedConceptsResult> {
  if (conceptIds.length === 0) {
    return { available: true, concepts: [] }
  }

  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    throw new Error('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  const endpoint = `/vocabulary/${sourceKey}/lookup/recommended`

  let data: unknown
  try {
    data = await httpPostRead<unknown>(endpoint, conceptIds)
  } catch (error) {
    if (extractHttpStatus(error) === 501) {
      return { available: false, concepts: [] }
    }
    throw error
  }

  const parsed = ConceptSearchResponseSchema.safeParse(data)

  if (!parsed.success) {
    logger.error('ConceptSearch', 'Recommended concepts validation error', parsed.error)
    throw new Error('Invalid recommended concepts response format')
  }

  const concepts = parsed.data.map(mapConceptFromAPI)
  return { available: true, concepts }
}

export async function compareConceptSets(
  sourceKey: string,
  expression1: ConceptSetExpression,
  expression2: ConceptSetExpression
): Promise<ComparisonResultItem[]> {
  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    throw new Error('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  if (expression1.items.length === 0 || expression2.items.length === 0) {
    return []
  }

  const endpoint = `/vocabulary/${sourceKey}/compare`
  const data = await httpPostRead<unknown>(endpoint, [expression1, expression2])
  const parsed = ComparisonResultSchema.safeParse(data)

  if (!parsed.success) {
    logger.error('ConceptSearch', 'Concept set comparison validation error', parsed.error)
    throw new Error('Invalid concept set comparison response format')
  }

  return parsed.data.map(mapComparisonItemFromAPI)
}

export async function resolveConceptSetExpression(
  sourceKey: string,
  expression: ConceptSetExpression,
  signal?: AbortSignal,
): Promise<Concept[]> {
  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    throw new Error('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  const ids = await httpPostRead<unknown>(
    `/vocabulary/${sourceKey}/resolveConceptSetExpression`,
    expression,
    { signal },
  )

  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'number' && Number.isFinite(id))) {
    logger.error('ConceptSearch', 'Invalid resolveConceptSetExpression response', ids)
    throw new Error('Invalid resolveConceptSetExpression response format')
  }

  if (ids.length === 0) return []

  const raw = await httpPostRead<unknown>(
    `/vocabulary/${sourceKey}/lookup/identifiers`,
    ids,
    { signal },
  )

  const parsed = ConceptSearchResponseSchema.safeParse(raw)
  if (!parsed.success) {
    logger.error('ConceptSearch', 'lookup/identifiers validation error', parsed.error)
    throw new Error('Invalid resolveConceptSetExpression response format')
  }

  return parsed.data.map(mapConceptFromAPI)
}
