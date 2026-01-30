/**
 * Concept Search Service
 * Business logic for searching and retrieving medical concepts
 */
import { ConceptSearchResponseSchema, type Concept } from '@/models/concept-set.types'
import { mapConceptFromAPI } from '@/utils/api-mappers'
import { logger } from '@/utils/logger'
import { httpClient, httpPost } from '@/services/http-client'

type ConceptRecordCountResponse = Array<Record<string, number[]>>

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

  const params = new URLSearchParams({ query: query.trim() })
  if (options?.domain) {
    params.append('domain', options.domain)
  }

  const endpoint = `/vocabulary/${sourceKey}/search?${params.toString()}`
  const data = await httpClient<unknown>(endpoint)
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

export async function getConceptRecordCounts(
  sourceKey: string,
  conceptIds: number[]
): Promise<Map<number, { recordCount: number; descendantRecordCount: number; personCount: number; descendantPersonCount: number }>> {
  const recordCountMap = new Map()

  if (conceptIds.length === 0) {
    return recordCountMap
  }

  try {
    const endpoint = `/cdmresults/${sourceKey}/conceptRecordCount`
    const data = await httpPost<ConceptRecordCountResponse>(endpoint, conceptIds)

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
