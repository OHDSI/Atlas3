/**
 * useCharacterizations Composable
 *
 * Reactive wrapper over the characterization store. Exposes the list,
 * pagination state via {@link usePagination}, search/filter helpers, and
 * a refresh action so the list view can stay declarative.
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useCharacterizationStore } from '@/stores/characterization'
import { usePagination } from '@/composables/usePagination'
import type { CharacterizationListItem } from '@/models/characterization.types'

export function useCharacterizations() {
  const store = useCharacterizationStore()
  const { characterizations, loading, error, filterTerm, filteredCharacterizations, isEmpty } =
    storeToRefs(store)

  // Pagination over filtered results
  const totalItems = computed<number>(() => filteredCharacterizations.value.length)
  const pagination = usePagination(totalItems)

  /**
   * Filtered + paginated slice for the current page.
   */
  const paginatedCharacterizations = computed<CharacterizationListItem[]>(() => {
    const start = (pagination.page.value - 1) * pagination.itemsPerPage.value
    const end = start + pagination.itemsPerPage.value
    return filteredCharacterizations.value.slice(start, end)
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
    characterizations,
    loading,
    error,
    filterTerm,
    isEmpty,

    // Computed
    filteredCharacterizations,
    paginatedCharacterizations,

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
