/**
 * useFeatureAnalyses Composable
 *
 * Reactive wrapper over the feature-analyses store. Exposes the list,
 * pagination state via {@link usePagination}, search/filter helpers, a
 * refresh action, and per-type counts so the list view can build facets
 * without poking at internals.
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { usePagination } from '@/composables/usePagination'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

export function useFeatureAnalyses() {
  const store = useFeatureAnalysesStore()
  const {
    featureAnalyses,
    loading,
    error,
    filterTerm,
    filteredFeatureAnalyses,
    isEmpty,
  } = storeToRefs(store)

  // Pagination over filtered results
  const totalItems = computed<number>(() => filteredFeatureAnalyses.value.length)
  const pagination = usePagination(totalItems)

  /**
   * Filtered + paginated slice for the current page.
   */
  const paginatedFeatureAnalyses = computed<FeatureAnalysisListItem[]>(() => {
    const start = (pagination.page.value - 1) * pagination.itemsPerPage.value
    const end = start + pagination.itemsPerPage.value
    return filteredFeatureAnalyses.value.slice(start, end)
  })

  /**
   * Counts per FeatureAnalysisType for the (unfiltered) list — useful for
   * facet chips/badges in the toolbar.
   */
  const byType = computed(() => {
    const counts = { PRESET: 0, CRITERIA_SET: 0, CUSTOM_FE: 0 }
    for (const fa of featureAnalyses.value) {
      counts[fa.type] = (counts[fa.type] ?? 0) + 1
    }
    return counts
  })

  /**
   * Set the filter term (delegates to store, which debounces).
   */
  function setFilter(term: string) {
    store.setFilter(term)
  }

  /**
   * Refresh the list from WebAPI.
   */
  async function refresh() {
    await store.fetchAll()
  }

  return {
    // State (refs)
    featureAnalyses,
    loading,
    error,
    filterTerm,
    isEmpty,

    // Computed
    filteredFeatureAnalyses,
    paginatedFeatureAnalyses,
    byType,

    // Pagination
    page: pagination.page,
    itemsPerPage: pagination.itemsPerPage,
    itemsPerPageOptions: pagination.itemsPerPageOptions,
    totalPages: pagination.totalPages,
    totalItems,
    canGoPrevious: pagination.canGoPrevious,
    canGoNext: pagination.canGoNext,
    rangeDisplay: pagination.rangeDisplay,
    nextPage: pagination.nextPage,
    previousPage: pagination.previousPage,
    setPage: pagination.setPage,
    setItemsPerPage: pagination.setItemsPerPage,

    // Actions
    setFilter,
    refresh,
  }
}
