/**
 * Concept Search Service
 * Business logic for searching and retrieving medical concepts
 */
import { ConceptSearchResponseSchema, type Concept } from '@/models/concept-set.types'
import { mapConceptFromAPI } from '@/utils/api-mappers'
import { logger } from '@/utils/logger'

/**
 * API response type for concept record counts
 * Each entry maps concept ID (as string) to an array of [RC, DRC, PC, DPC]
 */
type ConceptRecordCountResponse = Array<Record<string, number[]>>

const BASE_URL = import.meta.env.VITE_WEBAPI_URL || '/WebAPI'

/**
 * Internal fetch wrapper with error handling
 */
async function fetchJSON<T>(endpoint: string): Promise<T> {
  const url = `${BASE_URL}${endpoint}`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  try {
    return await response.json() as T
  } catch (parseError) {
    logger.error('ConceptSearch', 'Failed to parse JSON response', parseError)
    throw new Error('Invalid response format')
  }
}

/**
 * Search for concepts in vocabulary
 * @param sourceKey CDM source key (e.g., "SYNPUF1K")
 * @param query Search term (min 3 characters recommended)
 * @param options Pagination and sorting options
 * @returns Array of matching concepts
 */
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

  // Build query params
  const params = new URLSearchParams({
    query: query.trim(),
  })

  if (options?.domain) {
    params.append('domain', options.domain)
  }

  // Note: WebAPI doesn't support pagination params, returns all results
  // We'll implement client-side pagination in the store
  const endpoint = `/vocabulary/${sourceKey}/search?${params.toString()}`
  
  const data = await fetchJSON<unknown>(endpoint)
  const parsed = ConceptSearchResponseSchema.safeParse(data)

  if (!parsed.success) {
    logger.error('ConceptSearch', 'Concept search validation error', parsed.error)
    throw new Error('Invalid concept search response format')
  }

  // Map UPPERCASE fields to camelCase
  const concepts = parsed.data.map(mapConceptFromAPI)

  return {
    concepts,
    total: concepts.length,
  }
}

/**
 * Get concept details by ID
 * @param sourceKey CDM source key
 * @param conceptId Concept ID
 * @returns Concept details or null if not found
 */
export async function getConceptById(
  sourceKey: string,
  conceptId: number
): Promise<Concept | null> {
  try {
    const endpoint = `/vocabulary/${sourceKey}/concept/${conceptId}`
    const data = await fetchJSON<unknown>(endpoint)

    // Validate and map response
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
 * Fetch concept record counts for a list of concept IDs
 * @param sourceKey CDM source key (e.g., "SYNPUF1K")
 * @param conceptIds Array of concept IDs
 * @returns Map of concept ID to record counts (RC, DRC, PC, DPC)
 */
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
    const url = `${BASE_URL}${endpoint}`

    // POST request with concept IDs as JSON array in body
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(conceptIds),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    let data: ConceptRecordCountResponse
    try {
      data = await response.json()
    } catch (parseError) {
      logger.error('ConceptSearch', 'Failed to parse JSON response', parseError)
      throw new Error('Invalid response format')
    }

    // The API returns an array of objects with concept IDs as keys
    // Example: [{ "192671": [13, 331, 12, 323], "313217": [3023, 3023, 579, 579] }]
    // Where the array values are: [RC, DRC, PC, DPC]

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
    // Return empty map on error - don't fail the whole search
  }

  return recordCountMap
}

