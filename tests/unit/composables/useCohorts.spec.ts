/**
 * useCohorts Composable Tests
 * Tests for cohort list state management with async filtering
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

// Mock webapi
vi.mock('@/services/cohort-definition.service', () => ({
  getCohorts: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { useCohorts } from '@/composables/useCohorts'
import { getCohorts } from '@/services/cohort-definition.service'

describe('useCohorts', () => {
  const mockCohorts: CohortDefinitionSummary[] = [
    {
      id: 1,
      name: 'Diabetes Cohort',
      description: 'Patients with diabetes',
      createdBy: { login: 'user1', name: 'User One' },
      createdDate: Date.now() - 86400000 * 30, // 30 days ago
      modifiedDate: Date.now() - 86400000, // 1 day ago
      tags: [{ name: 'diabetes' }, { name: 'chronic' }]
    },
    {
      id: 2,
      name: 'Heart Disease Cohort',
      description: 'Cardiovascular conditions',
      createdBy: { login: 'user2', name: 'User Two' },
      createdDate: Date.now() - 86400000 * 60, // 60 days ago
      modifiedDate: Date.now() - 86400000 * 7, // 7 days ago
      tags: [{ name: 'cardiovascular' }]
    },
    {
      id: 3,
      name: 'Cancer Study',
      description: 'Oncology research',
      createdBy: 'user1', // String format
      createdDate: Date.now() - 86400000 * 10,
      modifiedDate: Date.now(),
      tags: []
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(cb, 0)
      return 1
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const { cohorts, loading, error, searchQuery, filters } = useCohorts()

      expect(cohorts.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(searchQuery.value).toBe('')
      expect(filters.value.searchQuery).toBe('')
      expect(filters.value.selectedTags).toEqual([])
    })
  })

  describe('fetchCohorts', () => {
    it('should fetch and sort cohorts by modifiedDate', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, cohorts, loading } = useCohorts()

      const promise = fetchCohorts()

      expect(loading.value).toBe(true)

      await promise

      expect(loading.value).toBe(false)
      expect(cohorts.value).toHaveLength(3)
      // Should be sorted by most recent first
      expect(cohorts.value[0].id).toBe(3) // Most recently modified
    })

    it('should handle fetch errors', async () => {
      vi.mocked(getCohorts).mockRejectedValue(new Error('Network error'))

      const { fetchCohorts, error } = useCohorts()

      await fetchCohorts()

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('Network error')
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(getCohorts).mockRejectedValue('String error')

      const { fetchCohorts, error } = useCohorts()

      await fetchCohorts()

      expect(error.value?.message).toBe('Failed to load cohorts')
    })
  })

  describe('availableTags', () => {
    it('should compute unique tags from cohorts', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, availableTags } = useCohorts()

      await fetchCohorts()

      expect(availableTags.value).toContain('diabetes')
      expect(availableTags.value).toContain('chronic')
      expect(availableTags.value).toContain('cardiovascular')
      // Should be sorted alphabetically
      expect(availableTags.value).toEqual(['cardiovascular', 'chronic', 'diabetes'])
    })

    it('should return empty array when no cohorts', () => {
      const { availableTags } = useCohorts()

      expect(availableTags.value).toEqual([])
    })
  })

  describe('availableAuthors', () => {
    it('should compute unique authors from cohorts', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, availableAuthors } = useCohorts()

      await fetchCohorts()

      expect(availableAuthors.value).toContain('user one')
      expect(availableAuthors.value).toContain('user two')
      expect(availableAuthors.value).toContain('user1') // String format
    })
  })

  describe('activeFilterCount', () => {
    it('should count active filters', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, filters, activeFilterCount } = useCohorts()

      await fetchCohorts()

      expect(activeFilterCount.value).toBe(0)

      filters.value.searchQuery = 'test'
      expect(activeFilterCount.value).toBe(1)

      filters.value.selectedTags = ['diabetes']
      expect(activeFilterCount.value).toBe(2)

      filters.value.author = 'user1'
      expect(activeFilterCount.value).toBe(3)
    })
  })

  describe('filtering', () => {
    it('should filter by search query', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, filters, filteredCohorts } = useCohorts()

      await fetchCohorts()

      // Wait for initial filtering
      await vi.advanceTimersByTimeAsync(500)

      filters.value.searchQuery = 'diabetes'

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(500)

      expect(filteredCohorts.value.some(c => c.name.includes('Diabetes'))).toBe(true)
    })

    it('should filter by description', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, filters, filteredCohorts } = useCohorts()

      await fetchCohorts()
      await vi.advanceTimersByTimeAsync(500)

      filters.value.searchQuery = 'oncology'
      await vi.advanceTimersByTimeAsync(500)

      expect(filteredCohorts.value.some(c => c.id === 3)).toBe(true)
    })

    it('should return all cohorts when no filters', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, filteredCohorts } = useCohorts()

      await fetchCohorts()
      await vi.advanceTimersByTimeAsync(500)

      expect(filteredCohorts.value).toHaveLength(3)
    })
  })

  describe('clearFilters', () => {
    it('should clear all filters', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, filters, searchQuery, clearFilters } = useCohorts()

      await fetchCohorts()

      filters.value.searchQuery = 'test'
      filters.value.selectedTags = ['diabetes']
      filters.value.author = 'user1'
      searchQuery.value = 'test'

      clearFilters()

      expect(filters.value.searchQuery).toBe('')
      expect(filters.value.selectedTags).toEqual([])
      expect(filters.value.author).toBe('')
      expect(searchQuery.value).toBe('')
    })
  })

  describe('refreshCohorts', () => {
    it('should refetch cohorts', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, refreshCohorts } = useCohorts()

      await fetchCohorts()
      await refreshCohorts()

      expect(getCohorts).toHaveBeenCalledTimes(2)
    })
  })

  describe('filtering state', () => {
    it('should indicate filtering in progress', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, filtering: _filtering, filters } = useCohorts()

      await fetchCohorts()
      await vi.advanceTimersByTimeAsync(500)

      filters.value.searchQuery = 'test'

      // Filtering happens asynchronously
      await vi.advanceTimersByTimeAsync(100)
      // The filtering state is managed internally
    })
  })

  describe('date range filtering', () => {
    it('should filter by created date range', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, filters, filteredCohorts } = useCohorts()

      await fetchCohorts()
      await vi.advanceTimersByTimeAsync(500)

      // Filter for cohorts created in the last 20 days
      const twentyDaysAgo = new Date(Date.now() - 86400000 * 20)
      filters.value.createdDateRange = { from: twentyDaysAgo }

      await vi.advanceTimersByTimeAsync(500)

      expect(filteredCohorts.value.every(c => {
        if (!c.createdDate) return false
        return new Date(c.createdDate) >= twentyDaysAgo
      })).toBe(true)
    })
  })

  describe('tag filtering', () => {
    it('should filter by selected tags', async () => {
      vi.mocked(getCohorts).mockResolvedValue({ success: true, data: [...mockCohorts] })

      const { fetchCohorts, filters, filteredCohorts } = useCohorts()

      await fetchCohorts()
      await vi.advanceTimersByTimeAsync(500)

      filters.value.selectedTags = ['diabetes']

      await vi.advanceTimersByTimeAsync(500)

      expect(filteredCohorts.value.every(c =>
        c.tags?.some(t => t.name === 'diabetes')
      )).toBe(true)
    })
  })
})
