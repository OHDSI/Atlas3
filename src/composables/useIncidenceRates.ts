import { ref, computed } from 'vue'
import { listIncidenceRates } from '@/services/incidence-rate.service'
import type { IncidenceRate } from '@/models/incidence-rate.types'
import { logger } from '@/utils/logger'
import { getUserString, matchesTerms } from '@/utils/list-filters'
import { toggleTagFilter } from '@/utils/asset-tags'

export interface IncidenceRateListFilters {
  searchQuery: string
  selectedTags: string[]
  author: string
  createdDateRange: { from?: Date; to?: Date }
  modifiedDateRange: { from?: Date; to?: Date }
}

export function useIncidenceRates() {
  const incidenceRates = ref<IncidenceRate[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const filters = ref<IncidenceRateListFilters>({
    searchQuery: '',
    selectedTags: [],
    author: '',
    createdDateRange: {},
    modifiedDateRange: {},
  })
  const page = ref(0)
  const itemsPerPage = ref(25)

  async function fetchIncidenceRates() {
    loading.value = true
    error.value = null
    try {
      const result = await listIncidenceRates()
      if (result.success) incidenceRates.value = result.data
      else error.value = new Error(result.error.message)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load')
      logger.error('useIncidenceRates', 'fetch failed', err)
    } finally {
      loading.value = false
    }
  }

  const filteredIncidenceRates = computed(() => {
    const q = filters.value.searchQuery
    const tags = filters.value.selectedTags
    const author = filters.value.author
    const cr = filters.value.createdDateRange
    const mr = filters.value.modifiedDateRange
    return incidenceRates.value.filter(ir => {
      if (!matchesTerms([ir.name, ir.description], q)) return false
      if (tags.length > 0) {
        const have = new Set((ir.tags || []).map(t => t.name))
        if (!tags.every(t => have.has(t))) return false
      }
      if (author && getUserString(ir.createdBy) !== author.toLowerCase()) return false
      if (cr.from && new Date(ir.createdDate ?? 0) < cr.from) return false
      if (cr.to && new Date(ir.createdDate ?? 0) > cr.to) return false
      if (mr.from && new Date(ir.modifiedDate ?? 0) < mr.from) return false
      if (mr.to && new Date(ir.modifiedDate ?? 0) > mr.to) return false
      return true
    })
  })

  const totalItems = computed(() => filteredIncidenceRates.value.length)
  const availableAuthors = computed(() => {
    const authors = new Set<string>()
    incidenceRates.value.forEach(incidenceRate => {
      const author = getUserString(incidenceRate.createdBy)
      if (author) authors.add(author)
    })
    return [...authors].sort()
  })
  const availableTags = computed(() => {
    const tags = new Set<string>()
    incidenceRates.value.forEach(incidenceRate => {
      incidenceRate.tags?.forEach(tag => tags.add(tag.name))
    })
    return [...tags].sort()
  })
  const activeFilterCount = computed(() => {
    let count = 0
    if (filters.value.searchQuery) count++
    if (filters.value.author) count++
    if (filters.value.selectedTags.length > 0) count++
    if (filters.value.createdDateRange.from || filters.value.createdDateRange.to) count++
    if (filters.value.modifiedDateRange.from || filters.value.modifiedDateRange.to) count++
    return count
  })
  const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / itemsPerPage.value)))
  const paginatedIncidenceRates = computed(() => {
    const start = page.value * itemsPerPage.value
    return filteredIncidenceRates.value.slice(start, start + itemsPerPage.value)
  })

  function clearFilters() {
    filters.value = {
      searchQuery: '',
      selectedTags: [],
      author: '',
      createdDateRange: {},
      modifiedDateRange: {},
    }
    page.value = 0
  }

  function setFilters(next: IncidenceRateListFilters) {
    filters.value = { ...next, selectedTags: next.selectedTags ?? [] }
    page.value = 0
  }

  function toggleTagFilterSelection(tagName: string) {
    filters.value = {
      ...filters.value,
      selectedTags: toggleTagFilter(filters.value.selectedTags, tagName),
    }
    page.value = 0
  }

  return {
    incidenceRates,
    loading,
    error,
    filters,
    page,
    itemsPerPage,
    fetchIncidenceRates,
    clearFilters,
    setFilters,
    toggleTagFilterSelection,
    filteredIncidenceRates,
    paginatedIncidenceRates,
    totalItems,
    totalPages,
    availableAuthors,
    availableTags,
    activeFilterCount,
  }
}
