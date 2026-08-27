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
import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http-client'
import { getSourceKey } from '@/config/webapi'
import { useAuthStore } from '@/stores/auth'

/**
 * Prefer the source key validated against the sources the server actually
 * reports; the unvalidated localStorage value is only a fallback for the
 * window before the store has loaded them.
 */
async function resolveSourceKey(): Promise<string> {
  try {
    const { useWebAPIStore } = await import('@/stores/webapi')
    return useWebAPIStore().getValidVocabularySource() || getSourceKey()
  } catch {
    return getSourceKey()
  }
}

/**
 * Get all concept sets accessible to the user
 * @returns Array of concept set list items (without full expression)
 */
export async function getAllConceptSets(): Promise<ConceptSetListItem[]> {
  try {
    const data = await httpGet<unknown>('/conceptset')
    const parsed = ConceptSetListResponseSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('ConceptSet', 'Concept set list validation error', parsed.error)
      throw new Error('Invalid concept set list response')
    }

    return parsed.data
  } catch (error) {
    // A failed fetch is not "no concept sets" - propagate so the store's
    // error state renders instead of an empty list.
    logger.error('ConceptSet', 'Failed to fetch concept sets', error)
    throw error
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
    const sourceKey = await resolveSourceKey()

    // Fetch metadata and expression separately
    const [metadata, expression] = await Promise.all([
      httpGet<ConceptSetAPIMetadata>(`/conceptset/${id}`),
      httpGet<ConceptSetAPIExpression>(`/conceptset/${id}/expression/${sourceKey}`),
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
): Promise<ConceptSet> {
  try {
    const authStore = useAuthStore()
    const metadataPayload = {
      name: conceptSet.name,
      description: conceptSet.description,
    }

    const data = await authStore.executeWithUserRefresh(async () => {
      const created = await httpPost<ConceptSetAPIResponse>('/conceptset', metadataPayload)

      if ((conceptSet.items?.length || 0) > 0 && created.id) {
        const itemsPayload = (conceptSet.items || []).map(item => ({
          conceptId: item.conceptId,
          isExcluded: item.isExcluded ? 1 : 0,
          includeDescendants: item.includeDescendants ? 1 : 0,
          includeMapped: item.includeMapped ? 1 : 0,
        }))

        await httpPut(`/conceptset/${created.id}/items`, itemsPayload)
      }

      return created
    })

    if (data.id) {
      const sourceKey = await resolveSourceKey()
      const [updatedMetadata, updatedExpression] = await Promise.all([
        httpGet<ConceptSetAPIMetadata>(`/conceptset/${data.id}`),
        httpGet<ConceptSetAPIExpression>(`/conceptset/${data.id}/expression/${sourceKey}`),
      ])

      return mapConceptSetFromAPI({
        ...updatedMetadata,
        expression: updatedExpression,
      })
    }

    return mapConceptSetFromAPI(data)
  } catch (error) {
    logger.error('ConceptSet', 'Failed to create concept set', error)
    throw error
  }
}

/**
 * Update existing concept set
 * @param conceptSet Concept set with id
 * @returns Updated concept set
 */
export async function updateConceptSet(conceptSet: ConceptSet): Promise<ConceptSet> {
  if (!conceptSet.id) {
    throw new Error('Concept set ID is required for update')
  }

  try {
    const authStore = useAuthStore()
    const metadataPayload = {
      id: conceptSet.id,
      name: conceptSet.name,
      description: conceptSet.description,
    }

    await authStore.executeWithUserRefresh(async () => {
      await httpPut<ConceptSetAPIResponse>(`/conceptset/${conceptSet.id}`, metadataPayload)

      const itemsPayload = (conceptSet.items || []).map(item => ({
        conceptId: item.conceptId,
        isExcluded: item.isExcluded ? 1 : 0,
        includeDescendants: item.includeDescendants ? 1 : 0,
        includeMapped: item.includeMapped ? 1 : 0,
      }))

      await httpPut(`/conceptset/${conceptSet.id}/items`, itemsPayload)
    })

    const sourceKey = await resolveSourceKey()
    const [updatedMetadata, updatedExpression] = await Promise.all([
      httpGet<ConceptSetAPIMetadata>(`/conceptset/${conceptSet.id}`),
      httpGet<ConceptSetAPIExpression>(`/conceptset/${conceptSet.id}/expression/${sourceKey}`),
    ])

    return mapConceptSetFromAPI({
      ...updatedMetadata,
      expression: updatedExpression,
    })
  } catch (error) {
    logger.error('ConceptSet', `Failed to update concept set ${conceptSet.id}`, error)
    throw error
  }
}

/**
 * Delete concept set
 * @param id Concept set ID
 * @returns True if deleted successfully
 */
export async function deleteConceptSet(id: number | string): Promise<boolean> {
  try {
    await httpDelete(`/conceptset/${id}`)
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
    await httpPost(`/conceptset/${id}/tag/`, tagId)
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
    await httpDelete(`/conceptset/${id}/tag/${tagId}`)
    return { success: true }
  } catch (error) {
    logger.error('ConceptSet', `Failed to unassign tag ${tagId} from concept set ${id}`, error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
