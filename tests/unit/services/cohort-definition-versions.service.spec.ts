/**
 * Unit Tests: Cohort Definition Versions Service
 *
 * Tests for cohort definition version history API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getVersions,
  getVersion,
  updateVersion,
  copyVersion
} from '@/services/cohort-definition-versions.service'

// Mock http-client
vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPut: vi.fn()
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('CohortDefinitionVersionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getVersions', () => {
    it('returns versions for a cohort definition', async () => {
      const { httpGet } = await import('@/services/http-client')
      const mockVersions = [
        {
          version: 3,
          assetId: 123,
          comment: 'Version 3',
          createdBy: { id: 1, name: 'user1' },
          createdDate: Date.now(),
          archived: false
        },
        {
          version: 2,
          assetId: 123,
          comment: 'Version 2',
          createdBy: { id: 1, name: 'user1' },
          createdDate: Date.now() - 10000,
          archived: false
        },
        {
          version: 1,
          assetId: 123,
          comment: 'Initial version',
          createdBy: { id: 1, name: 'user1' },
          createdDate: Date.now() - 20000,
          archived: true
        }
      ]

      vi.mocked(httpGet).mockResolvedValue(mockVersions)

      const result = await getVersions(123)

      expect(httpGet).toHaveBeenCalledWith('/cohortdefinition/123/version/')
      expect(result).toHaveLength(3)
      expect(result[0].version).toBe(3)
    })

    it('throws on validation error', async () => {
      const { httpGet } = await import('@/services/http-client')
      // Invalid structure - missing required fields
      vi.mocked(httpGet).mockResolvedValue([{ invalid: 'data' }])

      await expect(getVersions(123)).rejects.toThrow('Failed to validate version data')
    })

    it('throws on network error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new Error('Network error'))

      await expect(getVersions(123)).rejects.toThrow('Network error')
    })

    it('returns empty array for no versions', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([])

      const result = await getVersions(123)

      expect(result).toHaveLength(0)
    })
  })

  describe('getVersion', () => {
    it('returns a specific version', async () => {
      const { httpGet } = await import('@/services/http-client')
      const mockVersionedAsset = {
        versionDTO: {
          version: 2,
          assetId: 123,
          comment: 'Test version',
          createdBy: { id: 1, name: 'user1' },
          createdDate: Date.now(),
          archived: false
        },
        entityDTO: {
          id: 123,
          name: 'Test Cohort',
          expression: {}
        }
      }

      vi.mocked(httpGet).mockResolvedValue(mockVersionedAsset)

      const result = await getVersion(123, 2)

      expect(httpGet).toHaveBeenCalledWith('/cohortdefinition/123/version/2')
      expect(result.versionDTO.version).toBe(2)
      expect(result.entityDTO.id).toBe(123)
    })

    it('throws on validation error', async () => {
      const { httpGet } = await import('@/services/http-client')
      // Invalid structure
      vi.mocked(httpGet).mockResolvedValue({ invalid: 'structure' })

      await expect(getVersion(123, 2)).rejects.toThrow('Failed to validate version data')
    })

    it('throws on network error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new Error('Not found'))

      await expect(getVersion(123, 99)).rejects.toThrow('Not found')
    })
  })

  describe('updateVersion', () => {
    it('updates version comment and archived status', async () => {
      const { httpPut } = await import('@/services/http-client')
      const updatedVersion = {
        version: 2,
        assetId: 123,
        comment: 'Updated comment',
        createdBy: { id: 1, name: 'user1' },
        createdDate: Date.now(),
        archived: true
      }

      vi.mocked(httpPut).mockResolvedValue(updatedVersion)

      const result = await updateVersion(123, 2, {
        comment: 'Updated comment',
        archived: true
      })

      expect(httpPut).toHaveBeenCalledWith(
        '/cohortdefinition/123/version/2',
        { comment: 'Updated comment', archived: true }
      )
      expect(result.comment).toBe('Updated comment')
      expect(result.archived).toBe(true)
    })

    it('updates comment with archived false', async () => {
      const { httpPut } = await import('@/services/http-client')
      const updatedVersion = {
        version: 2,
        assetId: 123,
        comment: 'New comment',
        createdBy: { id: 1, name: 'user1' },
        createdDate: Date.now(),
        archived: false
      }

      vi.mocked(httpPut).mockResolvedValue(updatedVersion)

      // Both comment and archived are required by the schema
      const result = await updateVersion(123, 2, { comment: 'New comment', archived: false })

      expect(result.comment).toBe('New comment')
    })

    it('throws on validation error for response', async () => {
      const { httpPut } = await import('@/services/http-client')
      vi.mocked(httpPut).mockResolvedValue({ invalid: 'response' })

      await expect(updateVersion(123, 2, { comment: 'Test', archived: false })).rejects.toThrow('Failed to validate updated version data')
    })

    it('throws on network error', async () => {
      const { httpPut } = await import('@/services/http-client')
      vi.mocked(httpPut).mockRejectedValue(new Error('Forbidden'))

      await expect(updateVersion(123, 2, { comment: 'Test', archived: false })).rejects.toThrow('Forbidden')
    })
  })

  describe('copyVersion', () => {
    it('creates a new cohort from a version', async () => {
      const { httpPut } = await import('@/services/http-client')
      const newCohort = {
        id: 456,
        name: 'Copy of Test Cohort',
        expression: {}
      }

      vi.mocked(httpPut).mockResolvedValue(newCohort)

      const result = await copyVersion(123, 2)

      expect(httpPut).toHaveBeenCalledWith('/cohortdefinition/123/version/2/createAsset')
      expect(result.id).toBe(456)
    })

    it('throws on network error', async () => {
      const { httpPut } = await import('@/services/http-client')
      vi.mocked(httpPut).mockRejectedValue(new Error('Server error'))

      await expect(copyVersion(123, 2)).rejects.toThrow('Server error')
    })
  })
})
