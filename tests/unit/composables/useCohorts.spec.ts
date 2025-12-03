/**
 * Unit Tests: useCohorts Composable
 * Tests for src/composables/useCohorts.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'

// Mock webapi service
const mockGetCohorts = vi.fn()
vi.mock('@/services/webapi', () => ({
  getCohorts: () => mockGetCohorts(),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Import after mocks
import { useCohorts } from '@/composables/useCohorts'

describe.skip('useCohorts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCohorts.mockResolvedValue([])
  })

  describe('initial state', () => {
    it('returns empty cohorts array', () => {
      const { cohorts } = useCohorts()
      expect(cohorts.value).toEqual([])
    })

    it('returns loading as false initially', () => {
      const { loading } = useCohorts()
      expect(loading.value).toBe(false)
    })

    it('returns filtering as false initially', () => {
      const { filtering } = useCohorts()
      expect(filtering.value).toBe(false)
    })

    it('returns null error initially', () => {
      const { error } = useCohorts()
      expect(error.value).toBeNull()
    })

    it('returns empty searchQuery initially', () => {
      const { searchQuery } = useCohorts()
      expect(searchQuery.value).toBe('')
    })

    it('returns default filters', () => {
      const { filters } = useCohorts()
      expect(filters.value).toEqual({
        searchQuery: '',
        selectedTags: [],
        author: '',
        createdDateRange: {},
        modifiedDateRange: {},
      })
    })
  })

  describe('fetchCohorts', () => {
    it('sets loading to true during fetch', async () => {
      mockGetCohorts.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 100)))

      const { fetchCohorts, loading } = useCohorts()

      const fetchPromise = fetchCohorts()
      expect(loading.value).toBe(true)

      await fetchPromise
      expect(loading.value).toBe(false)
    })

    it('populates cohorts on successful fetch', async () => {
      const mockCohorts = [
        { id: 1, name: 'Cohort 1', modifiedDate: Date.now() },
        { id: 2, name: 'Cohort 2', modifiedDate: Date.now() - 1000 },
      ]
      mockGetCohorts.mockResolvedValue(mockCohorts)

      const { fetchCohorts, cohorts } = useCohorts()

      await fetchCohorts()

      expect(cohorts.value).toHaveLength(2)
    })

    it('sorts cohorts by modifiedDate descending', async () => {
      const now = Date.now()
      const mockCohorts = [
        { id: 1, name: 'Oldest', modifiedDate: now - 2000 },
        { id: 2, name: 'Newest', modifiedDate: now },
        { id: 3, name: 'Middle', modifiedDate: now - 1000 },
      ]
      mockGetCohorts.mockResolvedValue(mockCohorts)

      const { fetchCohorts, cohorts } = useCohorts()

      await fetchCohorts()

      expect(cohorts.value[0].name).toBe('Newest')
      expect(cohorts.value[2].name).toBe('Oldest')
    })

    it('handles missing modifiedDate', async () => {
      const mockCohorts = [
        { id: 1, name: 'No Date' },
        { id: 2, name: 'Has Date', modifiedDate: Date.now() },
      ]
      mockGetCohorts.mockResolvedValue(mockCohorts)

      const { fetchCohorts, cohorts } = useCohorts()

      await fetchCohorts()

      expect(cohorts.value).toHaveLength(2)
      expect(cohorts.value[0].name).toBe('Has Date')
    })

    it('sets error on fetch failure', async () => {
      const testError = new Error('Network error')
      mockGetCohorts.mockRejectedValue(testError)

      const { fetchCohorts, error } = useCohorts()

      await fetchCohorts()

      expect(error.value).toBe(testError)
    })

    it('creates Error from non-Error rejection', async () => {
      mockGetCohorts.mockRejectedValue('String error')

      const { fetchCohorts, error } = useCohorts()

      await fetchCohorts()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('Failed to load cohorts')
    })

    it('resets error on successful fetch', async () => {
      const { fetchCohorts, error } = useCohorts()

      // First fetch fails
      mockGetCohorts.mockRejectedValue(new Error('First error'))
      await fetchCohorts()
      expect(error.value).not.toBeNull()

      // Second fetch succeeds
      mockGetCohorts.mockResolvedValue([])
      await fetchCohorts()
      expect(error.value).toBeNull()
    })
  })

  describe('clearFilters', () => {
    it('resets all filters to defaults', () => {
      const { filters, searchQuery, clearFilters } = useCohorts()

      // Set some filters
      filters.value.searchQuery = 'test'
      filters.value.selectedTags = ['tag1', 'tag2']
      filters.value.author = 'author'
      searchQuery.value = 'search'

      clearFilters()

      expect(filters.value).toEqual({
        searchQuery: '',
        selectedTags: [],
        author: '',
        createdDateRange: {},
        modifiedDateRange: {},
      })
      expect(searchQuery.value).toBe('')
    })
  })

  describe('refreshCohorts', () => {
    it('calls fetchCohorts', async () => {
      mockGetCohorts.mockResolvedValue([{ id: 1, name: 'Test' }])

      const { refreshCohorts, cohorts } = useCohorts()

      await refreshCohorts()

      expect(mockGetCohorts).toHaveBeenCalled()
      expect(cohorts.value).toHaveLength(1)
    })
  })

  describe('availableTags computed', () => {
    it('returns empty array when no cohorts', () => {
      const { availableTags } = useCohorts()
      expect(availableTags.value).toEqual([])
    })

    it('extracts unique tags from cohorts', async () => {
      mockGetCohorts.mockResolvedValue([
        { id: 1, name: 'C1', tags: [{ name: 'tag1' }, { name: 'tag2' }] },
        { id: 2, name: 'C2', tags: [{ name: 'tag2' }, { name: 'tag3' }] },
      ])

      const { fetchCohorts, availableTags } = useCohorts()
      await fetchCohorts()

      expect(availableTags.value).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('sorts tags alphabetically', async () => {
      mockGetCohorts.mockResolvedValue([
        { id: 1, name: 'C1', tags: [{ name: 'zebra' }, { name: 'alpha' }] },
      ])

      const { fetchCohorts, availableTags } = useCohorts()
      await fetchCohorts()

      expect(availableTags.value).toEqual(['alpha', 'zebra'])
    })

    it('handles cohorts without tags', async () => {
      mockGetCohorts.mockResolvedValue([
        { id: 1, name: 'C1' },
        { id: 2, name: 'C2', tags: [{ name: 'tag1' }] },
      ])

      const { fetchCohorts, availableTags } = useCohorts()
      await fetchCohorts()

      expect(availableTags.value).toEqual(['tag1'])
    })
  })

  describe('availableAuthors computed', () => {
    it('returns empty array when no cohorts', () => {
      const { availableAuthors } = useCohorts()
      expect(availableAuthors.value).toEqual([])
    })

    it('extracts authors from cohorts', async () => {
      mockGetCohorts.mockResolvedValue([
        { id: 1, name: 'C1', createdBy: 'alice' },
        { id: 2, name: 'C2', createdBy: 'bob' },
      ])

      const { fetchCohorts, availableAuthors } = useCohorts()
      await fetchCohorts()

      expect(availableAuthors.value).toContain('alice')
      expect(availableAuthors.value).toContain('bob')
    })

    it('handles object createdBy with name', async () => {
      mockGetCohorts.mockResolvedValue([
        { id: 1, name: 'C1', createdBy: { name: 'Alice Smith' } },
      ])

      const { fetchCohorts, availableAuthors } = useCohorts()
      await fetchCohorts()

      expect(availableAuthors.value).toContain('alice smith')
    })

    it('handles object createdBy with login', async () => {
      mockGetCohorts.mockResolvedValue([
        { id: 1, name: 'C1', createdBy: { login: 'alice_login' } },
      ])

      const { fetchCohorts, availableAuthors } = useCohorts()
      await fetchCohorts()

      expect(availableAuthors.value).toContain('alice_login')
    })
  })

  describe('activeFilterCount computed', () => {
    it('returns 0 when no filters active', () => {
      const { activeFilterCount } = useCohorts()
      expect(activeFilterCount.value).toBe(0)
    })

    it('counts searchQuery filter', () => {
      const { filters, activeFilterCount } = useCohorts()
      filters.value.searchQuery = 'test'
      expect(activeFilterCount.value).toBe(1)
    })

    it('counts selectedTags filter', () => {
      const { filters, activeFilterCount } = useCohorts()
      filters.value.selectedTags = ['tag1']
      expect(activeFilterCount.value).toBe(1)
    })

    it('counts author filter', () => {
      const { filters, activeFilterCount } = useCohorts()
      filters.value.author = 'alice'
      expect(activeFilterCount.value).toBe(1)
    })

    it('counts createdDateRange filter', () => {
      const { filters, activeFilterCount } = useCohorts()
      filters.value.createdDateRange = { from: new Date() }
      expect(activeFilterCount.value).toBe(1)
    })

    it('counts modifiedDateRange filter', () => {
      const { filters, activeFilterCount } = useCohorts()
      filters.value.modifiedDateRange = { to: new Date() }
      expect(activeFilterCount.value).toBe(1)
    })

    it('counts multiple active filters', () => {
      const { filters, activeFilterCount } = useCohorts()
      filters.value.searchQuery = 'test'
      filters.value.selectedTags = ['tag1']
      filters.value.author = 'alice'
      expect(activeFilterCount.value).toBe(3)
    })
  })

  describe('filteredCohorts computed', () => {
    it('returns all cohorts when no filters', async () => {
      mockGetCohorts.mockResolvedValue([
        { id: 1, name: 'Cohort 1' },
        { id: 2, name: 'Cohort 2' },
      ])

      const { fetchCohorts, filteredCohorts } = useCohorts()
      await fetchCohorts()

      // Wait for async filtering
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 500))

      expect(filteredCohorts.value).toHaveLength(2)
    })
  })
})
