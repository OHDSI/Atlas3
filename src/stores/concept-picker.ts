/**
 * Concept Picker Store
 * UI state for concept selection dialogs and search results
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import * as webapi from '@/services/webapi'
import { logger } from '@/utils/logger'

export const useConceptPickerStore = defineStore('concept-picker', () => {
  // State
  const conceptSets = ref<Map<number | string, ConceptSet>>(new Map())
  const searchResults = ref<Concept[]>([])
  const isSearching = ref(false)
  const searchQuery = ref('')

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

  function clearSearch() {
    searchResults.value = []
    searchQuery.value = ''
    isSearching.value = false
  }

  async function searchConcepts(sourceKey: string, query: string, domain?: string) {
    try {
      setSearching(true)
      setSearchQuery(query)
      const result = await webapi.searchConcepts(sourceKey, query, domain)
      if (result.success) {
        setSearchResults(result.data)
      } else {
        // Check for permission error
        const errorStr = result.error || ''
        if (errorStr.includes('403')) {
          logger.error('ConceptPickerStore', 'Permission denied for concept search', {
            sourceKey,
            query,
            error: errorStr,
            hint: 'User may lack vocabulary:*:get or source:*:access permission'
          })
        } else {
          logger.error('ConceptPickerStore', 'Error searching concepts', result.error)
        }
        setSearchResults([])
      }
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error)
      if (errorStr.includes('403')) {
        logger.error('ConceptPickerStore', 'Permission denied for concept search', {
          sourceKey,
          query,
          error: errorStr,
          hint: 'User may lack vocabulary:*:get or source:*:access permission'
        })
      } else {
        logger.error('ConceptPickerStore', 'Error searching concepts', error)
      }
      setSearchResults([])
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
    searchConcepts,
    clearSearch,
    clearAll,
  }
})
