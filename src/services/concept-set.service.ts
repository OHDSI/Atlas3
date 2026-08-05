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
  type ConceptSetAPIMetadata,
  type ConceptSetAPIExpression,
  type ConceptSetAPIResponse,
} from '@/utils/api-mappers'
import { logger } from '@/utils/logger'
import { getAppConfig } from '@/config/app-config.loader'
import { getSourceKey } from '@/config/webapi'

function getBaseUrl(): string {
  return getAppConfig().api.url
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { useAuthStore } = await import('@/stores/auth')
    return useAuthStore().token
  } catch {
    return null
  }
}

/**
 * Internal fetch wrapper with error handling
 */
async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`

  // Get auth token
  const token = await getAuthToken()
  const authHeaders: Record<string, string> = {}
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    // Surface the server's error body (e.g. WebAPI's "Current data source does
    // not contain required concepts …") instead of the bare status text, which
    // alone is useless for diagnosing why a concept set won't resolve.
    let detail = response.statusText
    try {
      const text = await response.text()
      if (text) {
        try {
          detail = (JSON.parse(text) as { message?: string }).message ?? text
        } catch {
          detail = text
        }
      }
    } catch {
      // keep statusText
    }
    throw new Error(`HTTP ${response.status}: ${detail}`)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T
  }

  try {
    return (await response.json()) as T
  } catch (parseError) {
    logger.error('ConceptSet', 'Failed to parse JSON response', parseError)
    throw new Error('Invalid response format')
  }
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
  id: number | string,
  options?: { rethrow?: boolean }
): Promise<ConceptSet | null> {
  try {
    // Fetch metadata and expression separately
    const [metadata, expression] = await Promise.all([
      fetchJSON<ConceptSetAPIMetadata>(`/conceptset/${id}`),
      fetchJSON<ConceptSetAPIExpression>(`/conceptset/${id}/expression/${getSourceKey()}`),
    ])

    // Combine metadata and expression
    const combined: ConceptSetAPIResponse = {
      ...metadata,
      expression: expression,
    }

    // Map WebAPI format to our interface
    return mapConceptSetFromAPI(combined)
  } catch (error) {
    logger.error('ConceptSet', `Failed to fetch concept set ${id}`, error)
    // Most callers treat a failed load as "not found" (null). Callers that need
    // to tell the user *why* it failed (e.g. the Compare picker) opt into rethrow.
    if (options?.rethrow) throw error
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
    const metadataPayload = {
      name: conceptSet.name,
      description: conceptSet.description,
    }

    const data = await fetchJSON<ConceptSetAPIResponse>('/conceptset', {
      method: 'POST',
      body: JSON.stringify(metadataPayload),
    })

    if ((conceptSet.items?.length || 0) > 0 && data.id) {
      const itemsPayload = (conceptSet.items || []).map(item => ({
        conceptId: item.conceptId,
        isExcluded: item.isExcluded ? 1 : 0,
        includeDescendants: item.includeDescendants ? 1 : 0,
        includeMapped: item.includeMapped ? 1 : 0,
      }))

      await fetchJSON(`/conceptset/${data.id}/items`, {
        method: 'PUT',
        body: JSON.stringify(itemsPayload),
      })

      const [updatedMetadata, updatedExpression] = await Promise.all([
        fetchJSON<ConceptSetAPIMetadata>(`/conceptset/${data.id}`),
        fetchJSON<ConceptSetAPIExpression>(`/conceptset/${data.id}/expression/${getSourceKey()}`),
      ])

      return mapConceptSetFromAPI({
        ...updatedMetadata,
        expression: updatedExpression,
      })
    }

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
export async function updateConceptSet(conceptSet: ConceptSet): Promise<ConceptSet | null> {
  if (!conceptSet.id) {
    throw new Error('Concept set ID is required for update')
  }

  try {
    const metadataPayload = {
      id: conceptSet.id,
      name: conceptSet.name,
      description: conceptSet.description,
    }

    await fetchJSON<ConceptSetAPIResponse>(`/conceptset/${conceptSet.id}`, {
      method: 'PUT',
      body: JSON.stringify(metadataPayload),
    })

    const itemsPayload = (conceptSet.items || []).map(item => ({
      conceptId: item.conceptId,
      isExcluded: item.isExcluded ? 1 : 0,
      includeDescendants: item.includeDescendants ? 1 : 0,
      includeMapped: item.includeMapped ? 1 : 0,
    }))

    await fetchJSON(`/conceptset/${conceptSet.id}/items`, {
      method: 'PUT',
      body: JSON.stringify(itemsPayload),
    })

    const [updatedMetadata, updatedExpression] = await Promise.all([
      fetchJSON<ConceptSetAPIMetadata>(`/conceptset/${conceptSet.id}`),
      fetchJSON<ConceptSetAPIExpression>(
        `/conceptset/${conceptSet.id}/expression/${getSourceKey()}`
      ),
    ])

    return mapConceptSetFromAPI({
      ...updatedMetadata,
      expression: updatedExpression,
    })
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
export async function deleteConceptSet(id: number | string): Promise<boolean> {
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

/**
 * Assign a tag to a concept set.
 * WebAPI: POST /conceptset/{id}/tag  (body is the raw tagId int)
 */
export async function assignTagToConceptSet(
  id: number | string,
  tagId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await fetchJSON(`/conceptset/${id}/tag/`, {
      method: 'POST',
      body: JSON.stringify(tagId),
    })
    return { success: true }
  } catch (error) {
    logger.error('ConceptSet', `Failed to assign tag ${tagId} to concept set ${id}`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Unassign a tag from a concept set.
 * WebAPI: DELETE /conceptset/{id}/tag/{tagId}
 */
export async function unassignTagFromConceptSet(
  id: number | string,
  tagId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await fetchJSON(`/conceptset/${id}/tag/${tagId}`, {
      method: 'DELETE',
    })
    return { success: true }
  } catch (error) {
    logger.error('ConceptSet', `Failed to unassign tag ${tagId} from concept set ${id}`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
