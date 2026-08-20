/**
 * Unit tests for useVersions composable
 * T021: Test loadVersions, getCurrentVersionRow, filterVersions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useVersions } from '@/composables/useVersions'
import type { VersionsConfig, Version } from '@/components/versions/types'
import * as cohortVersionsService from '@/services/cohort-definition-versions.service'
import * as conceptSetVersionsService from '@/services/concept-set-versions.service'

// Mock the services
vi.mock('@/services/cohort-definition-versions.service')
vi.mock('@/services/concept-set-versions.service')

describe('useVersions', () => {
  const mockVersions: Version[] = [
    {
      version: 2,
      assetId: 123,
      createdBy: { id: 1, name: 'John Doe', email: 'john@example.com' },
      createdDate: '2024-01-02T10:00:00Z',
      comment: 'Second version',
      archived: false,
    },
    {
      version: 1,
      assetId: 123,
      createdBy: { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      createdDate: '2024-01-01T10:00:00Z',
      comment: 'First version',
      archived: false,
    },
  ]

  const mockConfig: VersionsConfig = {
    assetType: 'cohortdefinition',
    assetId: 123,
    currentVersion: () => ({
      version: -1,
      displayVersion: 'Current',
      assetId: 123,
      createdBy: { id: 1, name: 'John Doe', email: 'john@example.com' },
      createdDate: '2024-01-03T10:00:00Z',
      comment: null,
      archived: false,
      isCurrent: true,
      isPreviewing: false,
      formattedDate: 'Jan 3, 2024, 10:00 AM',
    }),
    previewVersion: ref(null),
    canEdit: ref(true),
    isDirty: ref(false),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadVersions', () => {
    it('should load versions and prepend current row', async () => {
      vi.spyOn(cohortVersionsService, 'getVersions').mockResolvedValue(mockVersions)

      const { versions, loadVersions } = useVersions(mockConfig)

      await loadVersions()

      expect(cohortVersionsService.getVersions).toHaveBeenCalledWith(123)
      expect(versions.value).toHaveLength(3) // 2 historical + 1 current
      expect(versions.value[0].isCurrent).toBe(true)
      expect(versions.value[0].displayVersion).toBe('Current')
      expect(versions.value[1].version).toBe(2)
      expect(versions.value[2].version).toBe(1)
    })

    it('should use concept set service for concept sets', async () => {
      vi.spyOn(conceptSetVersionsService, 'getVersions').mockResolvedValue(mockVersions)

      const conceptSetConfig: VersionsConfig = {
        ...mockConfig,
        assetType: 'conceptset',
      }

      const { loadVersions } = useVersions(conceptSetConfig)

      await loadVersions()

      expect(conceptSetVersionsService.getVersions).toHaveBeenCalledWith(123)
    })

    it('should handle loading errors gracefully', async () => {
      vi.spyOn(cohortVersionsService, 'getVersions').mockRejectedValue(
        new Error('Network error')
      )

      const { versions, loadVersions, error } = useVersions(mockConfig)

      await loadVersions()

      expect(versions.value).toEqual([])
      expect(error.value).toBeTruthy()
    })

    it('should set loading state correctly', async () => {
      vi.spyOn(cohortVersionsService, 'getVersions').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockVersions), 100))
      )

      const { loadVersions, loading } = useVersions(mockConfig)

      const loadPromise = loadVersions()
      expect(loading.value).toBe(true)

      await loadPromise
      expect(loading.value).toBe(false)
    })
  })

  describe('getCurrentVersionRow', () => {
    it('should create synthetic current row with correct properties', () => {
      const { getCurrentVersionRow } = useVersions(mockConfig)

      const currentRow = getCurrentVersionRow()

      expect(currentRow.isCurrent).toBe(true)
      expect(currentRow.displayVersion).toBe('Current')
      expect(currentRow.isPreviewing).toBe(false)
    })

    it('should mark current row as previewing when no preview version', () => {
      const config = { ...mockConfig, previewVersion: ref(null) }
      const { getCurrentVersionRow } = useVersions(config)

      const currentRow = getCurrentVersionRow()

      expect(currentRow.isPreviewing).toBe(false) // Current is being viewed
    })
  })

  describe('filterVersions', () => {
    beforeEach(async () => {
      vi.spyOn(cohortVersionsService, 'getVersions').mockResolvedValue(mockVersions)
    })

    it('should filter by author', async () => {
      const { loadVersions, filteredVersions, setAuthorFilter } = useVersions(mockConfig)

      await loadVersions()
      setAuthorFilter('John Doe')

      // Should have current (John Doe) + version 2 (John Doe)
      expect(filteredVersions.value).toHaveLength(2)
      expect(filteredVersions.value.every(v =>
        v.isCurrent || v.createdBy.name === 'John Doe'
      )).toBe(true)
    })

    it('should filter by date range', async () => {
      const { loadVersions, filteredVersions, setDateRangeFilter } = useVersions(mockConfig)

      await loadVersions()

      const start = new Date('2024-01-01T00:00:00Z')
      const end = new Date('2024-01-01T23:59:59Z')
      setDateRangeFilter([start, end])

      // Should have current (always shown) + version 1 (in range)
      expect(filteredVersions.value).toHaveLength(2)
      expect(filteredVersions.value.some(v => v.version === 1)).toBe(true)
      expect(filteredVersions.value.some(v => v.version === 2)).toBe(false)
    })

    it('should clear all filters', async () => {
      const { loadVersions, filteredVersions, setAuthorFilter, clearFilters } =
        useVersions(mockConfig)

      await loadVersions()
      setAuthorFilter('John Doe')
      expect(filteredVersions.value.length).toBeLessThan(3)

      clearFilters()
      expect(filteredVersions.value).toHaveLength(3) // All versions shown
    })
  })

  describe('availableAuthors', () => {
    it('should extract unique authors from versions', async () => {
      vi.spyOn(cohortVersionsService, 'getVersions').mockResolvedValue(mockVersions)

      const { loadVersions, availableAuthors } = useVersions(mockConfig)

      await loadVersions()

      expect(availableAuthors.value).toContain('John Doe')
      expect(availableAuthors.value).toContain('Jane Smith')
      expect(availableAuthors.value).toHaveLength(2)
    })

    it('should return sorted authors', async () => {
      vi.spyOn(cohortVersionsService, 'getVersions').mockResolvedValue(mockVersions)

      const { loadVersions, availableAuthors } = useVersions(mockConfig)

      await loadVersions()

      expect(availableAuthors.value).toEqual(['Jane Smith', 'John Doe'])
    })
  })
})
