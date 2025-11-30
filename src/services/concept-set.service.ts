/**
 * Concept Set Service
 * Business logic for concept set CRUD operations
 */
import {
  ConceptSetListResponseSchema,
  type ConceptSet,
  type ConceptSetListItem,
} from '@/models/concept-set.types'
import {
  mapConceptSetFromAPI,
  mapConceptSetToAPI,
  type ConceptSetAPIMetadata,
  type ConceptSetAPIExpression,
  type ConceptSetAPIResponse,
} from '@/utils/api-mappers'
import { logger } from '@/utils/logger'

const BASE_URL = import.meta.env.VITE_WEBAPI_URL || '/WebAPI'

/**
 * Internal fetch wrapper with error handling
 */
async function fetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T
  }

  return await response.json() as T
}

/**
 * Get all concept sets accessible to the user
 * @returns Array of concept set list items (without full expression)
 */
export async function getAllConceptSets(): Promise<ConceptSetListItem[]> {
  try {
    const data = await fetchJSON<unknown>('/conceptset')
    const parsed = ConceptSetListResponseSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('ConceptSet', 'Concept set list validation error', parsed.error)
      return []
    }

    return parsed.data
  } catch (error) {
    logger.error('ConceptSet', 'Failed to fetch concept sets', error)
    return []
  }
}

/**
 * Get full concept set definition including all items
 * @param id Concept set ID
 * @returns Concept set with items or null if not found
 */
export async function getConceptSetById(
  id: number | string
): Promise<ConceptSet | null> {
  try {
    // Fetch metadata and expression separately
    const [metadata, expression] = await Promise.all([
      fetchJSON<ConceptSetAPIMetadata>(`/conceptset/${id}`),
      fetchJSON<ConceptSetAPIExpression>(`/conceptset/${id}/expression`)
    ])

    // Combine metadata and expression
    const combined: ConceptSetAPIResponse = {
      ...metadata,
      expression: expression
    }

    // Map WebAPI format to our interface
    return mapConceptSetFromAPI(combined)
  } catch (error) {
    logger.error('ConceptSet', `Failed to fetch concept set ${id}`, error)
    return null
  }
}

/**
 * Create new concept set
 * @param conceptSet Concept set data (without id)
 * @returns Created concept set with assigned ID
 */
export async function createConceptSet(
  conceptSet: Omit<ConceptSet, 'id' | 'createdDate' | 'createdBy' | 'modifiedDate' | 'modifiedBy'>
): Promise<ConceptSet | null> {
  try {
    const payload = mapConceptSetToAPI({
      ...conceptSet,
      items: conceptSet.items || [],
    } as ConceptSet)

    const data = await fetchJSON<ConceptSetAPIResponse>('/conceptset', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return mapConceptSetFromAPI(data)
  } catch (error) {
    logger.error('ConceptSet', 'Failed to create concept set', error)
    return null
  }
}

/**
 * Update existing concept set
 * @param conceptSet Concept set with id
 * @returns Updated concept set
 */
export async function updateConceptSet(
  conceptSet: ConceptSet
): Promise<ConceptSet | null> {
  if (!conceptSet.id) {
    throw new Error('Concept set ID is required for update')
  }

  try {
    const payload = mapConceptSetToAPI(conceptSet)

    const data = await fetchJSON<ConceptSetAPIResponse>(`/conceptset/${conceptSet.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    return mapConceptSetFromAPI(data)
  } catch (error) {
    logger.error('ConceptSet', `Failed to update concept set ${conceptSet.id}`, error)
    return null
  }
}

/**
 * Delete concept set
 * @param id Concept set ID
 * @returns True if deleted successfully
 */
export async function deleteConceptSet(
  id: number | string
): Promise<boolean> {
  try {
    await fetchJSON(`/conceptset/${id}`, {
      method: 'DELETE',
    })
    return true
  } catch (error) {
    logger.error('ConceptSet', `Failed to delete concept set ${id}`, error)
    return false
  }
}
