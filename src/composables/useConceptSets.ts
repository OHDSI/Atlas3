/**
 * Composable for concept search
 * Provides reactive state and operations for searching concepts
 */
import { ref, computed } from 'vue'
import { useConceptPickerStore } from '@/stores/concept-picker'
import type { Concept } from '@/models/concept-set.types'
import { searchConcepts as searchConceptsApi } from '@/services/concept-search.service'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'
import { getSourceKey } from '@/config/webapi'

export function useConceptSets() {
  const store = useConceptPickerStore()

  // Local state for selected concepts (for creating/editing concept sets)
  const selectedConcepts = ref<Concept[]>([])

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
      const result = await searchConceptsApi(sourceKey, query, { domain })

      if (result?.success) {
        store.setSearchResults(result.data)
      } else {
        logger.error('ConceptSets', 'Search failed', result?.error)
        store.setSearchResults([])
      }
    } catch (error) {
      logger.error('ConceptSets', 'Search failed', error)
      store.setSearchResults([])
      throw error
    } finally {
      store.setSearching(false)
    }
  }, 300)

  return {
    searchResults: computed(() => store.searchResults),
    isSearching: computed(() => store.isSearching),
    selectedConcepts,
    searchConcepts,
  }
}
