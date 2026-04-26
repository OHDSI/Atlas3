import { ref, computed } from 'vue'
import { listPathways } from '@/services/webapi'
import type { Pathway } from '@/models/pathway.types'
import { logger } from '@/utils/logger'

export interface PathwayFilters {
  searchQuery: string
  selectedTags: string[]
  author: string
  createdDateRange: { from?: Date; to?: Date }
  modifiedDateRange: { from?: Date; to?: Date }
}

export function usePathways() {
  const pathways = ref<Pathway[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const filters = ref<PathwayFilters>({
    searchQuery: '',
    selectedTags: [],
    author: '',
    createdDateRange: {},
    modifiedDateRange: {},
  })
  const page = ref(0)
  const itemsPerPage = ref(25)

  async function fetchPathways() {
    loading.value = true
    error.value = null
    try {
      const result = await listPathways()
      if (result.success) {
        pathways.value = result.data
      } else {
        error.value = new Error(result.error)
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load')
      logger.error('usePathways', 'fetch failed', err)
    } finally {
      loading.value = false
    }
  }

  const filteredPathways = computed(() => {
    const q = filters.value.searchQuery.trim().toLowerCase()
    const tags = filters.value.selectedTags
    const author = filters.value.author
    const cr = filters.value.createdDateRange
    const mr = filters.value.modifiedDateRange
    return pathways.value.filter(p => {
      if (q && !p.name.toLowerCase().includes(q)
              && !(p.description?.toLowerCase().includes(q))) return false
      if (tags.length > 0) {
        const have = new Set((p.tags || []).map(t => t.name))
        if (!tags.every(t => have.has(t))) return false
      }
      if (author && p.createdBy?.name !== author) return false
      if (cr.from && new Date(p.createdDate ?? 0) < cr.from) return false
      if (cr.to && new Date(p.createdDate ?? 0) > cr.to) return false
      if (mr.from && new Date(p.modifiedDate ?? 0) < mr.from) return false
      if (mr.to && new Date(p.modifiedDate ?? 0) > mr.to) return false
      return true
    })
  })

  const totalItems = computed(() => filteredPathways.value.length)
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalItems.value / itemsPerPage.value))
  )
  const paginatedPathways = computed(() => {
    const start = page.value * itemsPerPage.value
    return filteredPathways.value.slice(start, start + itemsPerPage.value)
  })

  function clearFilters() {
    filters.value = {
      searchQuery: '', selectedTags: [], author: '',
      createdDateRange: {}, modifiedDateRange: {},
    }
    page.value = 0
  }

  return {
    pathways, loading, error,
    filters, page, itemsPerPage,
    fetchPathways, clearFilters,
    filteredPathways, paginatedPathways, totalItems, totalPages,
  }
}
