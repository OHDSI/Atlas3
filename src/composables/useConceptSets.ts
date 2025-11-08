/**
 * Composable for managing concept sets and concept search
 * Provides reactive state and operations for concept set management
 */
import { ref, computed } from 'vue'
import { useConceptSetsStore } from '@/stores/conceptSets'
import type { Concept, ConceptSet } from '@/models/concept-set.types'
import * as webapi from '@/services/webapi'

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function useConceptSets() {
  const store = useConceptSetsStore()

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

      const sourceKey = import.meta.env.VITE_DEFAULT_SOURCE || 'SYNPUF1K'
      const results = await webapi.searchConcepts(sourceKey, query, domain)

      store.setSearchResults(results)
    } catch (error) {
      console.error('Concept search error:', error)
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
      console.error('Failed to create concept set:', error)
      throw error
    }
  }

  /**
   * Update an existing concept set
   */
  async function updateConceptSet(conceptSet: ConceptSet): Promise<void> {
    try {
      const updated = await webapi.updateConceptSet(conceptSet)

      if (updated) {
        store.updateConceptSet(updated.id, updated)
      }
    } catch (error) {
      console.error('Failed to update concept set:', error)
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
      console.error('Failed to delete concept set:', error)
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
      console.error('Failed to get concept set:', error)
      throw error
    }
  }

  /**
   * Load all concept sets
   */
  async function loadAllConceptSets(): Promise<void> {
    try {
      const conceptSets = await webapi.getAllConceptSets()

      conceptSets.forEach((cs) => {
        store.addConceptSet(cs)
      })
    } catch (error) {
      console.error('Failed to load concept sets:', error)
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
