/**
 * Concept Picker Store
 * UI state for concept selection dialogs and search results
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import { searchConcepts as searchConceptsApi } from '@/services/concept-search.service'
import { logger } from '@/utils/logger'

export const useConceptPickerStore = defineStore('concept-picker', () => {
  // State
  const conceptSets = ref<Map<number | string, ConceptSet>>(new Map())
  const searchResults = ref<Concept[]>([])
  const isSearching = ref(false)
  const searchQuery = ref('')
  const searchError = ref<string | null>(null)

  // Getters
  const conceptSetsList = computed(() => Array.from(conceptSets.value.values()))

  const conceptSetsCount = computed(() => conceptSets.value.size)

  function getConceptSetById(id: number | string): ConceptSet | undefined {
    return conceptSets.value.get(id)
  }

  // Actions
  function addConceptSet(conceptSet: ConceptSet) {
    if (conceptSet.id !== undefined) {
      conceptSets.value.set(conceptSet.id, conceptSet)
    }
  }

  function updateConceptSet(id: number | string, conceptSet: ConceptSet) {
    if (conceptSets.value.has(id)) {
      conceptSets.value.set(id, conceptSet)
    }
  }

  function removeConceptSet(id: number | string) {
    conceptSets.value.delete(id)
  }

  function setSearchResults(results: Concept[]) {
    searchResults.value = results
  }

  function setSearching(searching: boolean) {
    isSearching.value = searching
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setSearchError(error: string | null) {
    searchError.value = error
  }

  function clearSearch() {
    searchResults.value = []
    searchQuery.value = ''
    isSearching.value = false
    searchError.value = null
  }

  async function searchConcepts(sourceKey: string, query: string, domain?: string) {
    try {
      setSearching(true)
      setSearchQuery(query)
      setSearchError(null)
      const result = await searchConceptsApi(sourceKey, query, { domain })
      if (result.success) {
        setSearchResults(result.data)
      } else {
        logger.error('ConceptPickerStore', 'Search failed', { sourceKey, error: result.error })
        setSearchResults([])
        setSearchError(result.error.message)
      }
    } catch (error) {
      logger.error('ConceptPickerStore', 'Search failed', { sourceKey, error })
      setSearchResults([])
      setSearchError(error instanceof Error ? error.message : String(error))
    } finally {
      setSearching(false)
    }
  }

  function clearAll() {
    conceptSets.value.clear()
    clearSearch()
  }

  return {
    // State
    conceptSets,
    searchResults,
    isSearching,
    searchQuery,
    searchError,
    // Getters
    conceptSetsList,
    conceptSetsCount,
    getConceptSetById,
    // Actions
    addConceptSet,
    updateConceptSet,
    removeConceptSet,
    setSearchResults,
    setSearching,
    setSearchQuery,
    setSearchError,
    searchConcepts,
    clearSearch,
    clearAll,
  }
})
