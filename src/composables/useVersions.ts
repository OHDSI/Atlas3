/**
 * useVersions Composable
 *
 * Business logic for version history management. Provides comprehensive
 * version list management including loading, filtering, and state management.
 *
 * @module composables/useVersions
 * @category Version Management
 * @since 1.0.0
 *
 * @example
 * ```typescript
 * const config: VersionsConfig = {
 *   assetType: 'cohortdefinition',
 *   assetId: 123,
 *   currentVersion: () => getCurrentVersion(),
 *   previewVersion: ref(null),
 *   canEdit: ref(true),
 *   isDirty: ref(false),
 * }
 *
 * const {
 *   versions,
 *   loading,
 *   filteredVersions,
 *   loadVersions,
 *   setAuthorFilter,
 * } = useVersions(config)
 *
 * // Load versions
 * await loadVersions()
 *
 * // Filter by author
 * setAuthorFilter('John Doe')
 * ```
 *
 * T024: Core composable for version list functionality
 */
import { ref, computed } from 'vue'
import { format, parseISO, isWithinInterval } from 'date-fns'
import type { VersionsTableItem, VersionsConfig } from '@/components/versions/types'
import { getVersions as getCohortVersions } from '@/services/cohort-definition-versions.service'
import { getVersions as getConceptSetVersions } from '@/services/concept-set-versions.service'

export interface VersionFilters {
  author: string | null
  dateRange: [Date, Date] | null
}

export function useVersions(config: VersionsConfig) {
  // State
  const versions = ref<VersionsTableItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<VersionFilters>({
    author: null,
    dateRange: null,
  })

  // Get API service based on asset type
  const getVersionsAPI = config.assetType === 'cohortdefinition'
    ? getCohortVersions
    : getConceptSetVersions

  /**
   * Load versions from API and prepend current version row
   * T024: Implements loadVersions functionality
   */
  async function loadVersions(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const historicalVersions = await getVersionsAPI(config.assetId)

      // Convert to table items with formatting
      const tableItems: VersionsTableItem[] = historicalVersions.map(v => {
        // Handle different date formats (Unix timestamp or ISO string)
        const dateStr = typeof v.createdDate === 'number'
          ? new Date(v.createdDate).toISOString()
          : v.createdDate

        return {
          ...v,
          // Ensure createdBy exists with fallback
          createdBy: v.createdBy ?? { id: 0, name: 'Unknown', email: undefined },
          // Normalize createdDate to ISO string
          createdDate: dateStr,
          // Ensure comment is set
          comment: v.comment ?? null,
          displayVersion: v.version,
          isCurrent: false,
          isPreviewing: config.previewVersion?.value?.version === v.version,
          formattedDate: format(parseISO(dateStr), 'PPpp'),
        }
      })

      // Sort by version number descending (highest to lowest)
      tableItems.sort((a, b) => b.version - a.version)

      // Prepend "Current" row (T029)
      const currentRow = getCurrentVersionRow()
      versions.value = [currentRow, ...tableItems]
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load version history'
      console.error('Failed to load versions:', err)
      versions.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Get synthetic "Current" row for versions table
   * T029: Implements current row display logic
   */
  function getCurrentVersionRow(): VersionsTableItem {
    const current = config.currentVersion()
    return {
      ...current,
      isPreviewing: false,
    }
  }

  /**
   * Filter versions by author and date range
   * T024: Implements filterVersions functionality
   */
  const filteredVersions = computed(() => {
    let result = versions.value

    // Filter by author
    if (filters.value.author) {
      result = result.filter(v => v.createdBy.name === filters.value.author)
    }

    // Filter by date range
    if (filters.value.dateRange) {
      const [start, end] = filters.value.dateRange
      result = result.filter(v => {
        if (v.isCurrent) return true // Always show current
        const date = parseISO(v.createdDate)
        return isWithinInterval(date, { start, end })
      })
    }

    return result
  })

  /**
   * Get unique authors for filter dropdown
   */
  const availableAuthors = computed(() => {
    const authors = new Set<string>()
    versions.value.forEach(v => {
      if (!v.isCurrent) {
        authors.add(v.createdBy.name)
      }
    })
    return Array.from(authors).sort()
  })

  /**
   * Clear all filters
   */
  function clearFilters(): void {
    filters.value = {
      author: null,
      dateRange: null,
    }
  }

  /**
   * Set author filter
   */
  function setAuthorFilter(author: string | null): void {
    filters.value.author = author
  }

  /**
   * Set date range filter
   */
  function setDateRangeFilter(range: [Date, Date] | null): void {
    filters.value.dateRange = range
  }

  return {
    // State
    versions,
    loading,
    error,
    filters,

    // Computed
    filteredVersions,
    availableAuthors,

    // Actions
    loadVersions,
    getCurrentVersionRow,
    clearFilters,
    setAuthorFilter,
    setDateRangeFilter,
  }
}
