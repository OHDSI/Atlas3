/**
 * Concept Sets Store
 * Manages concept set definitions and search results
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import * as webapi from '@/services/webapi'

export const useConceptSetsStore = defineStore('conceptSets', () => {
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
    conceptSets.value.set(conceptSet.id, conceptSet)
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
      const results = await webapi.searchConcepts(sourceKey, query, domain)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching concepts:', error)
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
