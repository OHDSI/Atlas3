import { ref, computed } from 'vue'
import { listIncidenceRates } from '@/services/webapi'
import type { IncidenceRate } from '@/models/incidence-rate.types'
import { logger } from '@/utils/logger'

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
    const q = filters.value.searchQuery.trim().toLowerCase()
    const tags = filters.value.selectedTags
    const author = filters.value.author
    const cr = filters.value.createdDateRange
    const mr = filters.value.modifiedDateRange
    return incidenceRates.value.filter(ir => {
      if (q && !ir.name.toLowerCase().includes(q) && !ir.description?.toLowerCase().includes(q))
        return false
      if (tags.length > 0) {
        const have = new Set((ir.tags || []).map(t => t.name))
        if (!tags.every(t => have.has(t))) return false
      }
      if (author && ir.createdBy?.name !== author) return false
      if (cr.from && new Date(ir.createdDate ?? 0) < cr.from) return false
      if (cr.to && new Date(ir.createdDate ?? 0) > cr.to) return false
      if (mr.from && new Date(ir.modifiedDate ?? 0) < mr.from) return false
      if (mr.to && new Date(ir.modifiedDate ?? 0) > mr.to) return false
      return true
    })
  })

  const totalItems = computed(() => filteredIncidenceRates.value.length)
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

  return {
    incidenceRates,
    loading,
    error,
    filters,
    page,
    itemsPerPage,
    fetchIncidenceRates,
    clearFilters,
    filteredIncidenceRates,
    paginatedIncidenceRates,
    totalItems,
    totalPages,
  }
}
