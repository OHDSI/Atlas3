/**
 * Composable for managing concept sets and concept search
 * Provides reactive state and operations for concept set management
 */
import { ref, computed } from 'vue'
import { useConceptPickerStore } from '@/stores/concept-picker'
import type { Concept, ConceptSet } from '@/models/concept-set.types'
import * as webapi from '@/services/webapi'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'
import { getSourceKey } from '@/config/webapi'

export function useConceptSets() {
  const store = useConceptPickerStore()

  // Local state for selected concepts (for creating/editing concept sets)
  const selectedConcepts = ref<Concept[]>([])

  /**
   * Search for concepts with 300ms debounce
   */
  const searchConcepts = debounce(async (query: string, domain?: string) => {
    if (!query || query.trim().length === 0) {
      store.setSearchResults([])
      store.setSearching(false)
      return
    }

    try {
      store.setSearching(true)
      store.setSearchQuery(query)

      const sourceKey = getSourceKey()
      const result = await webapi.searchConcepts(sourceKey, query, domain)

      if (result?.success) {
        store.setSearchResults(result.data)
      } else {
        if (result?.error) {
          logger.error('ConceptSets', 'Concept search error', result.error)
        }
        store.setSearchResults([])
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      // Log with more context for 403 errors
      if (errorMessage.includes('403')) {
        logger.error('ConceptSets', 'Concept search permission denied - user may not have access to vocabulary source', { sourceKey: getSourceKey(), error: errorMessage })
      } else {
        logger.error('ConceptSets', 'Concept search error', errorMessage)
      }
      store.setSearchResults([])
      throw error
    } finally {
      store.setSearching(false)
    }
  }, 300)

  /**
   * Create a new concept set
   */
  async function createConceptSet(conceptSet: ConceptSet): Promise<ConceptSet | null> {
    try {
      const created = await webapi.createConceptSet(conceptSet)

      if (created) {
        store.addConceptSet(created)
      }

      return created
    } catch (error) {
      logger.error('ConceptSets', 'Failed to create concept set', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Update an existing concept set
   */
  async function updateConceptSet(conceptSet: ConceptSet): Promise<void> {
    try {
      const updated = await webapi.updateConceptSet(conceptSet)

      if (updated && updated.id !== undefined) {
        store.updateConceptSet(updated.id, updated)
      }
    } catch (error) {
      logger.error('ConceptSets', 'Failed to update concept set', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Delete a concept set by ID
   */
  async function deleteConceptSet(id: number | string): Promise<void> {
    try {
      const success = await webapi.deleteConceptSet(id)

      if (success) {
        store.removeConceptSet(id)
      }
    } catch (error) {
      logger.error('ConceptSets', 'Failed to delete concept set', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Get concept set by ID
   */
  async function getConceptSet(id: number | string): Promise<ConceptSet | null> {
    try {
      // Check store first
      const cached = store.getConceptSetById(id)
      if (cached) {
        return cached
      }

      // Fetch from API
      const conceptSet = await webapi.getConceptSet(id)

      if (conceptSet) {
        store.addConceptSet(conceptSet)
      }

      return conceptSet
    } catch (error) {
      logger.error('ConceptSets', 'Failed to get concept set', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Load all concept sets
   */
  async function loadAllConceptSets(): Promise<void> {
    try {
      const result = await webapi.getAllConceptSets()

      if (result.success) {
        result.data.forEach((cs) => {
          store.addConceptSet(cs)
        })
      } else {
        logger.error('ConceptSets', 'Failed to load concept sets', result.error)
      }
    } catch (error) {
      logger.error('ConceptSets', 'Failed to load concept sets', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Toggle concept selection (for multi-select in search results)
   */
  function toggleConceptSelection(concept: Concept): void {
    const index = selectedConcepts.value.findIndex((c) => c.conceptId === concept.conceptId)

    if (index >= 0) {
      // Already selected, remove it
      selectedConcepts.value.splice(index, 1)
    } else {
      // Not selected, add it
      selectedConcepts.value.push(concept)
    }
  }

  /**
   * Check if a concept is selected
   */
  function isConceptSelected(conceptId: number): boolean {
    return selectedConcepts.value.some((c) => c.conceptId === conceptId)
  }

  /**
   * Clear all selected concepts
   */
  function clearSelectedConcepts(): void {
    selectedConcepts.value = []
  }

  /**
   * Get all concept sets as an array
   */
  const conceptSetsList = computed(() => {
    return store.conceptSetsList
  })

  return {
    // State
    searchResults: computed(() => store.searchResults),
    isSearching: computed(() => store.isSearching),
    searchQuery: computed(() => store.searchQuery),
    selectedConcepts,
    conceptSetsList,

    // Actions
    searchConcepts,
    createConceptSet,
    updateConceptSet,
    deleteConceptSet,
    getConceptSet,
    loadAllConceptSets,
    toggleConceptSelection,
    isConceptSelected,
    clearSelectedConcepts,
  }
}
