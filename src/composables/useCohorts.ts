/**
 * useCohorts Composable
 * Manages cohort list state, fetching, filtering, and sorting
 * Optimized for large datasets (30k+ items)
 */
import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { getCohorts } from '@/services/webapi'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'

export interface DateRange {
  from?: Date
  to?: Date
}

export interface FilterState {
  searchQuery: string
  selectedTags: string[]
  author: string
  createdDateRange: DateRange
  modifiedDateRange: DateRange
}

export function useCohorts() {
  // State
  const cohorts: Ref<CohortDefinitionSummary[]> = ref([])
  const loading = ref(false)
  const filtering = ref(false)
  const error: Ref<Error | null> = ref(null)
  const searchQuery = ref('')
  const cachedFilteredResults: Ref<CohortDefinitionSummary[]> = ref([])
  let filterAbortController: AbortController | null = null

  // Filter state
  const filters = ref<FilterState>({
    searchQuery: '',
    selectedTags: [],
    author: '',
    createdDateRange: {},
    modifiedDateRange: {},
  })

  // Debounced search query
  const debouncedSearchQuery = ref('')

  // Debounced function to update search query
  const updateDebouncedSearchQuery = debounce((query: string) => {
    debouncedSearchQuery.value = query
  }, 300)

  // Watch for search changes and debounce
  watch(
    () => filters.value.searchQuery,
    newQuery => {
      updateDebouncedSearchQuery(newQuery)
    }
  )

  // Also watch the old searchQuery for backwards compatibility
  watch(searchQuery, newQuery => {
    updateDebouncedSearchQuery(newQuery)
  })

  // Trigger async filtering when debounced search changes
  watch(debouncedSearchQuery, () => {
    filterCohortsAsync()
  })

  // Debounced function for filter changes
  const debouncedFilterCohortsAsync = debounce(() => {
    filterCohortsAsync()
  }, 400)

  // Debounce filter changes (tags, author, date ranges)
  watch(
    () => filters.value,
    () => {
      debouncedFilterCohortsAsync()
    },
    { deep: true }
  )

  // Initialize cached results with all cohorts
  watch(
    cohorts,
    newCohorts => {
      if (cachedFilteredResults.value.length === 0) {
        cachedFilteredResults.value = newCohorts
      }
      filterCohortsAsync()
    },
    { immediate: true }
  )

  /**
   * Fetch all cohorts from WebAPI
   * Automatically sorts by most recent first
   */
  async function fetchCohorts() {
    loading.value = true
    error.value = null

    try {
      const result = await getCohorts()

      if (result.success) {
        // Sort by modifiedDate descending (most recent first)
        cohorts.value = result.data.sort((a, b) => {
          const aDate = a.modifiedDate ? new Date(a.modifiedDate).getTime() : 0
          const bDate = b.modifiedDate ? new Date(b.modifiedDate).getTime() : 0
          return bDate - aDate
        })
      } else {
        error.value = new Error(result.error.message)
        logger.error('useCohorts', 'Failed to fetch cohorts', result.error)
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load cohorts')
      logger.error('useCohorts', 'Failed to fetch cohorts', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Helper: Check if date is within range
   */
  function isDateInRange(date: number | string | undefined, range: DateRange): boolean {
    if (!date) return !range.from && !range.to // If no date, only pass if no range set
    const dateObj = new Date(date)
    if (range.from && dateObj < range.from) return false
    if (range.to && dateObj > range.to) return false
    return true
  }

  /**
   * Helper: Format user for comparison
   */
  function getUserString(userValue: unknown): string {
    if (!userValue) return ''
    if (typeof userValue === 'string') return userValue.toLowerCase()
    if (typeof userValue === 'object' && userValue !== null) {
      const user = userValue as Record<string, unknown>
      return ((user.name || user.login || user.id || '') as string).toLowerCase()
    }
    return ''
  }

  /**
   * Get all unique tags from cohorts
   * Memoized to prevent recalculation on every filter change
   */
  const availableTags = computed(() => {
    if (cohorts.value.length === 0) return []

    const tagSet = new Set<string>()
    const cohortList = cohorts.value
    for (let i = 0; i < cohortList.length; i++) {
      const cohort = cohortList[i]
      if (!cohort) continue
      const tags = cohort.tags
      if (tags) {
        for (let j = 0; j < tags.length; j++) {
          const tag = tags[j]
          if (tag) tagSet.add(tag.name)
        }
      }
    }
    return Array.from(tagSet).sort()
  })

  /**
   * Get all unique authors from cohorts
   * Memoized to prevent recalculation on every filter change
   */
  const availableAuthors = computed(() => {
    if (cohorts.value.length === 0) return []

    const authorSet = new Set<string>()
    const cohortList = cohorts.value
    for (let i = 0; i < cohortList.length; i++) {
      const cohort = cohortList[i]
      if (!cohort) continue
      const author = getUserString(cohort.createdBy)
      if (author) authorSet.add(author)
    }
    return Array.from(authorSet).sort()
  })

  /**
   * Count active filters
   */
  const activeFilterCount = computed(() => {
    let count = 0
    if (filters.value.searchQuery) count++
    if (filters.value.selectedTags.length > 0) count++
    if (filters.value.author) count++
    if (filters.value.createdDateRange.from || filters.value.createdDateRange.to) count++
    if (filters.value.modifiedDateRange.from || filters.value.modifiedDateRange.to) count++
    return count
  })

  /**
   * Asynchronously filter cohorts in chunks to avoid blocking the UI
   * Processes 500 items at a time with breaks for the UI to remain responsive
   */
  async function filterCohortsAsync() {
    // Abort any ongoing filter operation
    if (filterAbortController) {
      filterAbortController.abort()
    }
    filterAbortController = new AbortController()
    const signal = filterAbortController.signal

    filtering.value = true

    try {
      // Use debounced search query
      const query = debouncedSearchQuery.value.toLowerCase().trim()
      const hasSearch = query.length > 0
      const hasTags = filters.value.selectedTags.length > 0
      const hasAuthor = filters.value.author.length > 0
      const hasCreatedRange = !!(
        filters.value.createdDateRange.from || filters.value.createdDateRange.to
      )
      const hasModifiedRange = !!(
        filters.value.modifiedDateRange.from || filters.value.modifiedDateRange.to
      )

      // Early exit: no filters applied
      if (!hasSearch && !hasTags && !hasAuthor && !hasCreatedRange && !hasModifiedRange) {
        cachedFilteredResults.value = cohorts.value
        filtering.value = false
        return
      }

      // Pre-compute filter values for reuse
      const authorQuery = hasAuthor ? filters.value.author.toLowerCase() : ''
      const selectedTagsSet = hasTags ? new Set(filters.value.selectedTags) : null

      const result: CohortDefinitionSummary[] = []
      const chunkSize = 500 // Process 500 items at a time for better UI responsiveness
      const totalItems = cohorts.value.length

      for (let chunkStart = 0; chunkStart < totalItems; chunkStart += chunkSize) {
        // Check if operation was aborted
        if (signal.aborted) {
          return
        }

        const chunkEnd = Math.min(chunkStart + chunkSize, totalItems)

        // Process chunk
        for (let i = chunkStart; i < chunkEnd; i++) {
          const cohort = cohorts.value[i]
          if (!cohort) continue

          // Search filter (most common, check first)
          if (hasSearch) {
            const nameMatch = cohort.name.toLowerCase().includes(query)
            const descMatch = cohort.description?.toLowerCase().includes(query) ?? false
            if (!nameMatch && !descMatch) continue
          }

          // Tags filter (use Set for O(1) lookup)
          if (hasTags) {
            if (!cohort.tags || cohort.tags.length === 0) continue
            let hasMatchingTag = false
            for (let j = 0; j < cohort.tags.length; j++) {
              const tag = cohort.tags[j]
              if (!tag) continue
              if (selectedTagsSet!.has(tag.name)) {
                hasMatchingTag = true
                break
              }
            }
            if (!hasMatchingTag) continue
          }

          // Author filter (cached lowercase comparison)
          if (hasAuthor) {
            if (!getUserString(cohort.createdBy).includes(authorQuery)) continue
          }

          // Date range filters (only if specified)
          if (hasCreatedRange) {
            if (!isDateInRange(cohort.createdDate, filters.value.createdDateRange)) continue
          }

          if (hasModifiedRange) {
            if (!isDateInRange(cohort.modifiedDate, filters.value.modifiedDateRange)) continue
          }

          // All filters passed
          result.push(cohort)
        }

        // Yield to the UI after each chunk using requestAnimationFrame
        if (chunkEnd < totalItems) {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        }
      }

      // Check if operation was aborted before updating results
      if (!signal.aborted) {
        cachedFilteredResults.value = result
      }
    } finally {
      if (!signal.aborted) {
        filtering.value = false
      }
    }
  }

  /**
   * Filtered cohorts based on all filter criteria
   * Returns cached results from async filtering
   */
  const filteredCohorts = computed(() => cachedFilteredResults.value)

  /**
   * Clear all filters
   */
  function clearFilters() {
    filters.value = {
      searchQuery: '',
      selectedTags: [],
      author: '',
      createdDateRange: {},
      modifiedDateRange: {},
    }
    searchQuery.value = ''
  }

  /**
   * Refresh cohorts list (refetch from API)
   */
  async function refreshCohorts() {
    await fetchCohorts()
  }

  return {
    // State
    cohorts,
    loading,
    filtering,
    error,
    searchQuery,
    filters,

    // Computed
    filteredCohorts,
    availableTags,
    availableAuthors,
    activeFilterCount,

    // Actions
    fetchCohorts,
    refreshCohorts,
    clearFilters,
  }
}
