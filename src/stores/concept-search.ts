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
  // Which source the record/person counts come from. Independent of the
  // vocabulary source: the vocabulary knows the concepts, a Results source
  // knows how often they occur in that data (#228). Null means "follow the
  // vocabulary source", which is what this did before the picker existed.
  const recordCountSourceKey = ref<string | null>(null)
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
    facets.selected,
    () => {
      page.value = 1
    },
    { deep: true }
  )

  // Same for the free-text filter over the returned rows.
  watch(facets.textFilter, () => {
    page.value = 1
  })

  // ============================================================================
  // Getters
  // ============================================================================

  const totalCount = computed(() => facets.filteredConcepts.value.length)

  // Sorted (but NOT paginated) results. `ConceptTable` forwards this list to
  // `AtlasDataTable`/`v-data-table` together with `page`/`itemsPerPage`, and
  // `v-data-table` does its own slicing for the current page. Slicing here as
  // well used to double-paginate: page 1 happened to look correct because the
  // first `itemsPerPage` items of an already-`itemsPerPage`-sized array is
  // that same array, but page 2 sliced an out-of-range window from an array
  // that only ever contained one page's worth of items, silently returning
  // nothing (see #201/#203).
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

    return sorted
  })

  // `isEmpty` reflects whether the search returned ANY results (`allConcepts`),
  // not whether facets currently match anything. When facets filter every row out,
  // `isEmpty` stays `false` (keeping the facet bar visible so the user can clear
  // filters) while `totalCount`/`pageRangeText` report the filtered count of 0.
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
      if (!result.success) {
        throw result.error
      }

      allConcepts.value = result.data
      loading.value = false
      page.value = 1
      // A new query changes the available value space — drop stale facets.
      facets.clearFilters()

      await loadRecordCounts(recordCountSourceKey.value ?? sourceKey)
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
   * Refresh the record and person counts on the current results from one
   * source, leaving the concepts themselves alone.
   */
  async function loadRecordCounts(sourceKey: string): Promise<void> {
    const current = allConcepts.value
    if (current.length === 0) return

    loadingRecordCounts.value = true
    try {
      const recordCounts = await getConceptRecordCounts(
        sourceKey,
        current.map(c => c.conceptId)
      )

      allConcepts.value = current.map(concept => ({
        ...concept,
        recordCount: recordCounts.get(concept.conceptId)?.recordCount,
        descendantRecordCount: recordCounts.get(concept.conceptId)?.descendantRecordCount,
        personCount: recordCounts.get(concept.conceptId)?.personCount,
        descendantPersonCount: recordCounts.get(concept.conceptId)?.descendantPersonCount,
      }))
    } finally {
      loadingRecordCounts.value = false
    }
  }

  /**
   * Point the counts at a different source and refresh them in place. Failing
   * to reach one source must not blank the results, which are still valid.
   */
  async function setRecordCountSource(sourceKey: string): Promise<void> {
    recordCountSourceKey.value = sourceKey
    try {
      await loadRecordCounts(sourceKey)
    } catch (err) {
      logger.error('ConceptSearchStore', 'Failed to load record counts', err)
      error.value = 'Failed to load record counts for the selected source.'
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
    recordCountSourceKey,
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
    resultFilter: facets.textFilter,
    setFacet: facets.setFacet,
    setResultFilter: facets.setTextFilter,
    clearFacets: facets.clearFilters,

    // Actions
    search,
    debouncedSearch,
    updateSort,
    updatePagination,
    setRecordCountSource,
    clearSearch,
  }
})
