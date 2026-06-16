/**
 * Concept Search Store
 * State management for concept search functionality
 */
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { searchConcepts, getConceptRecordCounts } from '@/services/concept-search.service'
import type { Concept } from '@/models/concept-set.types'
import { getSourceKey } from '@/config/webapi'
import { useWebAPIStore } from '@/stores/webapi'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'
import { useConceptFacets } from '@/composables/useConceptFacets'

export const useConceptSearchStore = defineStore('concept-search', () => {
  // ============================================================================
  // State
  // ============================================================================

  const searchTerm = ref<string>('')
  const allConcepts = ref<Concept[]>([]) // All search results
  const loading = ref<boolean>(false)
  const loadingRecordCounts = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Pagination state
  const page = ref<number>(1)
  const itemsPerPage = ref<number>(25)

  // Sorting state
  const sortBy = ref<string | null>('conceptId')
  const sortDesc = ref<boolean>(false)

  // Faceted filtering over the result columns (vocabulary, domain, etc.)
  const facets = useConceptFacets(allConcepts)

  // A new facet selection can push the current page out of range.
  watch(
    () => facets.selected.value,
    () => {
      page.value = 1
    },
    { deep: true }
  )

  // ============================================================================
  // Getters
  // ============================================================================

  const totalCount = computed(() => facets.filteredConcepts.value.length)

  // Client-side pagination and sorting
  const concepts = computed(() => {
    const sorted = [...facets.filteredConcepts.value]

    // Apply sorting
    if (sortBy.value) {
      sorted.sort((a, b) => {
        const key = sortBy.value as keyof Concept
        const aVal = a[key]
        const bVal = b[key]

        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDesc.value ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal)
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDesc.value ? bVal - aVal : aVal - bVal
        }

        return 0
      })
    }

    // Apply pagination
    const start = (page.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value

    return sorted.slice(start, end)
  })

  const isEmpty = computed(() => allConcepts.value.length === 0)

  const pageRangeText = computed(() => {
    if (totalCount.value === 0) return '0-0 of 0'
    const start = (page.value - 1) * itemsPerPage.value + 1
    const end = Math.min(page.value * itemsPerPage.value, totalCount.value)
    return `${start}-${end} of ${totalCount.value}`
  })

  // ============================================================================
  // Actions
  // ============================================================================

  async function search(term: string) {
    if (term.length < 3) {
      allConcepts.value = []
      error.value = null
      return
    }

    searchTerm.value = term
    loading.value = true
    error.value = null

    try {
      const webapiStore = useWebAPIStore()
      const sourceKey = webapiStore.getValidVocabularySource() || getSourceKey()

      if (!sourceKey) {
        throw new Error('No vocabulary source available.')
      }

      const result = await searchConcepts(sourceKey, term)

      allConcepts.value = result.concepts
      loading.value = false
      page.value = 1
      // A new query changes the available value space — drop stale facets.
      facets.clearFilters()

      loadingRecordCounts.value = true
      const conceptIds = result.concepts.map(c => c.conceptId)
      const recordCounts = await getConceptRecordCounts(sourceKey, conceptIds)

      allConcepts.value = result.concepts.map(concept => ({
        ...concept,
        recordCount: recordCounts.get(concept.conceptId)?.recordCount,
        descendantRecordCount: recordCounts.get(concept.conceptId)?.descendantRecordCount,
        personCount: recordCounts.get(concept.conceptId)?.personCount,
        descendantPersonCount: recordCounts.get(concept.conceptId)?.descendantPersonCount,
      }))

      loadingRecordCounts.value = false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      error.value = errorMessage.includes('403')
        ? 'Access denied. Please check your source selection in Configuration.'
        : errorMessage || 'Failed to search concepts'
      logger.error('ConceptSearchStore', 'Search failed', err)
      allConcepts.value = []
      loading.value = false
      loadingRecordCounts.value = false
    }
  }

  /**
   * Debounced search (300ms delay)
   */
  const debouncedSearch = debounce(search, 300)

  /**
   * Update sorting
   */
  function updateSort(newSortBy: string, newSortDesc: boolean) {
    sortBy.value = newSortBy
    sortDesc.value = newSortDesc
  }

  /**
   * Update pagination
   */
  function updatePagination(newPage: number, newItemsPerPage: number) {
    page.value = newPage
    itemsPerPage.value = newItemsPerPage
  }

  /**
   * Clear search results
   */
  function clearSearch() {
    searchTerm.value = ''
    allConcepts.value = []
    error.value = null
    page.value = 1
    facets.clearFilters()
  }

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    searchTerm,
    concepts,
    allConcepts,
    loading,
    loadingRecordCounts,
    error,
    page,
    itemsPerPage,
    sortBy,
    sortDesc,

    // Getters
    totalCount,
    isEmpty,
    pageRangeText,

    // Facets
    facetOptions: facets.facetOptions,
    selectedFacets: facets.selected,
    activeFacetCount: facets.activeFilterCount,
    setFacet: facets.setFacet,
    clearFacets: facets.clearFilters,

    // Actions
    search,
    debouncedSearch,
    updateSort,
    updatePagination,
    clearSearch,
  }
})
