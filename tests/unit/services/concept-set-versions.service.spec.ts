/**
 * Unit Tests: Concept Set Versions Service
 *
 * Tests for concept set version history API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getVersions,
  getVersion,
  getVersionExpression,
  updateVersion,
  copyVersion
} from '@/services/concept-set-versions.service'

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

describe('ConceptSetVersionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getVersions', () => {
    it('returns versions for a concept set', async () => {
      const { httpGet } = await import('@/services/http-client')
      const mockVersions = [
        {
          version: 3,
          assetId: 456,
          comment: 'Added more concepts',
          createdBy: { id: 1, name: 'user1' },
          createdDate: Date.now(),
          archived: false
        },
        {
          version: 2,
          assetId: 456,
          comment: 'Refined criteria',
          createdBy: { id: 1, name: 'user1' },
          createdDate: Date.now() - 10000,
          archived: false
        },
        {
          version: 1,
          assetId: 456,
          comment: 'Initial version',
          createdBy: { id: 1, name: 'user1' },
          createdDate: Date.now() - 20000,
          archived: true
        }
      ]

      vi.mocked(httpGet).mockResolvedValue(mockVersions)

      const result = await getVersions(456)

      expect(httpGet).toHaveBeenCalledWith('/conceptset/456/version/')
      expect(result).toHaveLength(3)
      expect(result[0].version).toBe(3)
    })

    it('throws on validation error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([{ bad: 'data' }])

      await expect(getVersions(456)).rejects.toThrow('Failed to validate version data')
    })

    it('throws on network error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new Error('Connection refused'))

      await expect(getVersions(456)).rejects.toThrow('Connection refused')
    })

    it('returns empty array for no versions', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([])

      const result = await getVersions(456)

      expect(result).toHaveLength(0)
    })
  })

  describe('getVersion', () => {
    it('returns a specific version with asset', async () => {
      const { httpGet } = await import('@/services/http-client')
      const mockVersionedAsset = {
        versionDTO: {
          version: 2,
          assetId: 456,
          comment: 'Test version',
          createdBy: { id: 1, name: 'user1' },
          createdDate: Date.now(),
          archived: false
        },
        entityDTO: {
          id: 456,
          name: 'Diabetes Concepts',
          items: []
        }
      }

      vi.mocked(httpGet).mockResolvedValue(mockVersionedAsset)

      const result = await getVersion(456, 2)

      expect(httpGet).toHaveBeenCalledWith('/conceptset/456/version/2')
      expect(result.versionDTO.version).toBe(2)
      expect(result.entityDTO.name).toBe('Diabetes Concepts')
    })

    it('throws on validation error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue({ wrong: 'format' })

      await expect(getVersion(456, 2)).rejects.toThrow('Failed to validate version data')
    })

    it('throws on network error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new Error('404 Not found'))

      await expect(getVersion(456, 99)).rejects.toThrow('404 Not found')
    })
  })

  describe('getVersionExpression', () => {
    it('returns expression for a specific version', async () => {
      const { httpGet } = await import('@/services/http-client')
      const mockExpression = {
        items: [
          {
            concept: { conceptId: 201826, conceptName: 'Type 2 diabetes mellitus' },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false
          }
        ]
      }

      vi.mocked(httpGet).mockResolvedValue(mockExpression)

      const result = await getVersionExpression(456, 2)

      expect(httpGet).toHaveBeenCalledWith('/conceptset/456/version/2/expression')
      expect(result).toEqual(mockExpression)
    })

    it('throws on network error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new Error('Server error'))

      await expect(getVersionExpression(456, 2)).rejects.toThrow('Server error')
    })

    it('returns empty expression', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue({ items: [] })

      const result = await getVersionExpression(456, 2)

      expect(result).toEqual({ items: [] })
    })
  })

  describe('updateVersion', () => {
    it('updates version comment', async () => {
      const { httpPut } = await import('@/services/http-client')
      const updatedVersion = {
        version: 2,
        assetId: 456,
        comment: 'Updated description',
        createdBy: { id: 1, name: 'user1' },
        createdDate: Date.now(),
        archived: false
      }

      vi.mocked(httpPut).mockResolvedValue(updatedVersion)

      // Both comment and archived are required by the schema
      const result = await updateVersion(456, 2, { comment: 'Updated description', archived: false })

      expect(httpPut).toHaveBeenCalledWith(
        '/conceptset/456/version/2',
        { comment: 'Updated description', archived: false }
      )
      expect(result.comment).toBe('Updated description')
    })

    it('updates archived status', async () => {
      const { httpPut } = await import('@/services/http-client')
      const updatedVersion = {
        version: 2,
        assetId: 456,
        comment: 'Test',
        createdBy: { id: 1, name: 'user1' },
        createdDate: Date.now(),
        archived: true
      }

      vi.mocked(httpPut).mockResolvedValue(updatedVersion)

      // Both comment and archived are required
      const result = await updateVersion(456, 2, { comment: 'Test', archived: true })

      expect(result.archived).toBe(true)
    })

    it('updates both comment and archived', async () => {
      const { httpPut } = await import('@/services/http-client')
      const updatedVersion = {
        version: 2,
        assetId: 456,
        comment: 'Archived version',
        createdBy: { id: 1, name: 'user1' },
        createdDate: Date.now(),
        archived: true
      }

      vi.mocked(httpPut).mockResolvedValue(updatedVersion)

      const result = await updateVersion(456, 2, {
        comment: 'Archived version',
        archived: true
      })

      expect(result.comment).toBe('Archived version')
      expect(result.archived).toBe(true)
    })

    it('throws on validation error for response', async () => {
      const { httpPut } = await import('@/services/http-client')
      vi.mocked(httpPut).mockResolvedValue({ bad: 'response' })

      await expect(updateVersion(456, 2, { comment: 'Test', archived: false })).rejects.toThrow('Failed to validate updated version data')
    })

    it('throws on network error', async () => {
      const { httpPut } = await import('@/services/http-client')
      vi.mocked(httpPut).mockRejectedValue(new Error('Unauthorized'))

      await expect(updateVersion(456, 2, { comment: 'Test', archived: false })).rejects.toThrow('Unauthorized')
    })
  })

  describe('copyVersion', () => {
    it('creates a new concept set from a version', async () => {
      const { httpPut } = await import('@/services/http-client')
      const newConceptSet = {
        id: 789,
        name: 'Copy of Diabetes Concepts',
        items: []
      }

      vi.mocked(httpPut).mockResolvedValue(newConceptSet)

      const result = await copyVersion(456, 2)

      expect(httpPut).toHaveBeenCalledWith('/conceptset/456/version/2/createAsset')
      expect(result.id).toBe(789)
      expect(result.name).toBe('Copy of Diabetes Concepts')
    })

    it('throws on network error', async () => {
      const { httpPut } = await import('@/services/http-client')
      vi.mocked(httpPut).mockRejectedValue(new Error('Insufficient permissions'))

      await expect(copyVersion(456, 2)).rejects.toThrow('Insufficient permissions')
    })
  })
})
