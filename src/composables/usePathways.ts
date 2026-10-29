import { ref, computed } from 'vue'
import { listPathways } from '@/services/pathway.service'
import type { Pathway } from '@/models/pathway.types'
import { logger } from '@/utils/logger'
import { getUserString, matchesFieldsOrId } from '@/utils/list-filters'
import { toggleTagFilter } from '@/utils/asset-tags'

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
        error.value = new Error(result.error.message)
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load')
      logger.error('usePathways', 'fetch failed', err)
    } finally {
      loading.value = false
    }
  }

  const filteredPathways = computed(() => {
    const q = filters.value.searchQuery
    const tags = filters.value.selectedTags
    const author = filters.value.author
    const cr = filters.value.createdDateRange
    const mr = filters.value.modifiedDateRange
    return pathways.value.filter(p => {
      if (!matchesFieldsOrId(p.id, [p.name, p.description], q)) return false
      if (tags.length > 0) {
        const have = new Set((p.tags || []).map(t => t.name))
        if (!tags.every(t => have.has(t))) return false
      }
      if (author && getUserString(p.createdBy) !== author.toLowerCase()) return false
      if (cr.from && new Date(p.createdDate ?? 0) < cr.from) return false
      if (cr.to && new Date(p.createdDate ?? 0) > cr.to) return false
      if (mr.from && new Date(p.modifiedDate ?? 0) < mr.from) return false
      if (mr.to && new Date(p.modifiedDate ?? 0) > mr.to) return false
      return true
    })
  })

  const totalItems = computed(() => filteredPathways.value.length)
  const availableAuthors = computed(() => {
    const authors = new Set<string>()
    pathways.value.forEach(pathway => {
      const author = getUserString(pathway.createdBy)
      if (author) authors.add(author)
    })
    return [...authors].sort()
  })
  const availableTags = computed(() => {
    const tags = new Set<string>()
    pathways.value.forEach(pathway => {
      pathway.tags?.forEach(tag => tags.add(tag.name))
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
  const paginatedPathways = computed(() => {
    const start = page.value * itemsPerPage.value
    return filteredPathways.value.slice(start, start + itemsPerPage.value)
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

  function setFilters(next: PathwayFilters) {
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
    pathways,
    loading,
    error,
    filters,
    page,
    itemsPerPage,
    fetchPathways,
    clearFilters,
    setFilters,
    toggleTagFilterSelection,
    filteredPathways,
    paginatedPathways,
    totalItems,
    totalPages,
    availableAuthors,
    availableTags,
    activeFilterCount,
  }
}
