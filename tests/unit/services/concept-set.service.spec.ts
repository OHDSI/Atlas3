/**
 * Concept Set Service Tests
 * Tests for concept set CRUD operations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock http-client
vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}))

const mockAuthStore = {
  executeWithUserRefresh: vi.fn((operation: () => Promise<unknown>) => operation()),
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
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

const getValidVocabularySource = vi.fn<() => string | null>(() => null)

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({ getValidVocabularySource }),
}))

// Mock api-mappers
vi.mock('@/utils/api-mappers', () => ({
  mapConceptSetFromAPI: vi.fn(data => ({
    id: data.id,
    name: data.name,
    description: data.description,
    items: data.expression?.items || [],
  })),
  mapConceptSetToAPI: vi.fn(data => ({
    id: data.id,
    name: data.name,
    description: data.description,
    expression: { items: data.items || [] },
  })),
}))

import {
  getAllConceptSets,
  getConceptSetById,
  createConceptSet,
  updateConceptSet,
  deleteConceptSet,
} from '@/services/concept-set.service'
import { mapConceptSetFromAPI } from '@/utils/api-mappers'
import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http-client'

describe('ConceptSetService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getValidVocabularySource.mockReturnValue(null)
    localStorage.clear()
    mockAuthStore.executeWithUserRefresh.mockImplementation((operation: () => Promise<unknown>) => operation())
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getAllConceptSets', () => {
    it('should fetch and return concept set list', async () => {
      vi.mocked(httpGet).mockResolvedValueOnce([
        { id: 1, name: 'Concept Set 1' },
        { id: 2, name: 'Concept Set 2' },
      ])

      const result = await getAllConceptSets()

      expect(httpGet).toHaveBeenCalledWith('/conceptset')
      expect(result).toHaveLength(2)
    })

    it('throws on fetch failure', async () => {
      vi.mocked(httpGet).mockRejectedValueOnce(new Error('HTTP 500: Server Error'))

      await expect(getAllConceptSets()).rejects.toThrow('HTTP 500')
    })

    it('throws for invalid response format', async () => {
      vi.mocked(httpGet).mockResolvedValueOnce({ invalid: 'response' })

      await expect(getAllConceptSets()).rejects.toThrow('Invalid concept set list response')
    })

    it('throws on network error', async () => {
      vi.mocked(httpGet).mockRejectedValueOnce(new Error('Network error'))

      await expect(getAllConceptSets()).rejects.toThrow('Network error')
    })
  })

  describe('getConceptSetById', () => {
    it('should fetch concept set by ID', async () => {
      vi.mocked(httpGet)
        .mockResolvedValueOnce({ id: 1, name: 'Test Concept Set', description: 'Test description' })
        .mockResolvedValueOnce({ items: [{ concept: { conceptId: 123 } }] })

      const result = await getConceptSetById(1)

      expect(httpGet).toHaveBeenCalledTimes(2)
      expect(httpGet).toHaveBeenCalledWith('/conceptset/1')
      expect(httpGet).toHaveBeenCalledWith(expect.stringContaining('/conceptset/1/expression/'))
      expect(result).not.toBeNull()
      expect(mapConceptSetFromAPI).toHaveBeenCalled()
    })

    it('should accept string ID', async () => {
      vi.mocked(httpGet)
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ items: [] })

      await getConceptSetById('1')

      expect(httpGet).toHaveBeenCalledWith('/conceptset/1')
    })

    it('should return null on fetch failure', async () => {
      vi.mocked(httpGet).mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      const result = await getConceptSetById(999)

      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      vi.mocked(httpGet).mockRejectedValueOnce(new Error('Network error'))

      const result = await getConceptSetById(1)

      expect(result).toBeNull()
    })

    it('rethrows the server message when rethrow is requested', async () => {
      vi.mocked(httpGet)
        .mockResolvedValueOnce({ id: 3 })
        .mockRejectedValueOnce(
          new Error('HTTP 400: Current data source does not contain required concepts (443238)')
        )

      await expect(getConceptSetById(3, { rethrow: true })).rejects.toThrow(/required concepts/)
    })
  })

  describe('createConceptSet', () => {
    it('should create concept set', async () => {
      vi.mocked(httpPost).mockResolvedValueOnce({
        id: 1,
        name: 'New Concept Set',
        description: 'New description',
        expression: { items: [] },
      })

      const result = await createConceptSet({
        name: 'New Concept Set',
        description: 'New description',
        items: [],
      })

      expect(httpPost).toHaveBeenCalledWith('/conceptset', {
        name: 'New Concept Set',
        description: 'New description',
      })
      expect(mockAuthStore.executeWithUserRefresh).toHaveBeenCalled()
      expect(result).not.toBeNull()
    })

    it('throws on create failure', async () => {
      vi.mocked(httpPost).mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

      await expect(createConceptSet({ name: 'Test', items: [] })).rejects.toThrow('HTTP 400')
    })

    it('throws on network error', async () => {
      vi.mocked(httpPost).mockRejectedValueOnce(new Error('Network error'))

      await expect(createConceptSet({ name: 'Test', items: [] })).rejects.toThrow('Network error')
    })
  })

  describe('updateConceptSet', () => {
    it('should update concept set', async () => {
      const metadata = { id: 1, name: 'Updated Concept Set', description: 'Updated description' }

      vi.mocked(httpPut).mockResolvedValue(undefined)
      vi.mocked(httpGet).mockResolvedValueOnce(metadata).mockResolvedValueOnce({ items: [] })

      const result = await updateConceptSet({
        id: 1,
        name: 'Updated Concept Set',
        description: 'Updated description',
        items: [],
      })

      expect(httpPut).toHaveBeenCalledWith('/conceptset/1', metadata)
      expect(httpPut).toHaveBeenCalledWith('/conceptset/1/items', [])
      expect(mockAuthStore.executeWithUserRefresh).toHaveBeenCalled()
      expect(result).not.toBeNull()
    })

    it('should throw error when ID is missing', async () => {
      await expect(updateConceptSet({ name: 'No ID', items: [] } as never)).rejects.toThrow(
        'Concept set ID is required for update'
      )
    })

    it('throws on update failure', async () => {
      vi.mocked(httpPut).mockRejectedValueOnce(new Error('HTTP 400: Bad Request'))

      await expect(updateConceptSet({ id: 1, name: 'Test', items: [] })).rejects.toThrow('HTTP 400')
    })

    it('throws on network error', async () => {
      vi.mocked(httpPut).mockRejectedValueOnce(new Error('Network error'))

      await expect(updateConceptSet({ id: 1, name: 'Test', items: [] })).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('deleteConceptSet', () => {
    it('should delete concept set', async () => {
      vi.mocked(httpDelete).mockResolvedValueOnce(undefined)

      const result = await deleteConceptSet(1)

      expect(httpDelete).toHaveBeenCalledWith('/conceptset/1')
      expect(result).toBe(true)
    })

    it('should accept string ID', async () => {
      vi.mocked(httpDelete).mockResolvedValueOnce(undefined)

      const result = await deleteConceptSet('1')

      expect(result).toBe(true)
    })

    it('should return false on delete failure', async () => {
      vi.mocked(httpDelete).mockRejectedValueOnce(new Error('HTTP 404: Not Found'))

      expect(await deleteConceptSet(999)).toBe(false)
    })

    it('should return false on network error', async () => {
      vi.mocked(httpDelete).mockRejectedValueOnce(new Error('Network error'))

      expect(await deleteConceptSet(1)).toBe(false)
    })
  })

  describe('expression requests carry the validated vocabulary source', () => {
    const expressionUrl = () =>
      vi
        .mocked(httpGet)
        .mock.calls.map(call => String(call[0]))
        .find(url => url.includes('/expression'))

    it('prefers the source validated against the server list', async () => {
      getValidVocabularySource.mockReturnValue('validated-source')
      localStorage.setItem('selectedVocabulary', 'stale-source')
      vi.mocked(httpGet)
        .mockResolvedValueOnce({ id: 1, name: 'CS' })
        .mockResolvedValueOnce({ items: [] })

      await getConceptSetById(1)

      expect(expressionUrl()).toContain('/conceptset/1/expression/validated-source')
    })

    it('falls back to the stored key when no validated source is available', async () => {
      localStorage.setItem('selectedVocabulary', 'ed0f253b-dfef-4202-b1d1-5b0ce9f7c9e0')
      vi.mocked(httpGet)
        .mockResolvedValueOnce({ id: 1, name: 'CS' })
        .mockResolvedValueOnce({ items: [] })

      await getConceptSetById(1)

      expect(expressionUrl()).toContain(
        '/conceptset/1/expression/ed0f253b-dfef-4202-b1d1-5b0ce9f7c9e0'
      )
    })

    it('appends the source key when re-reading after a create with items', async () => {
      getValidVocabularySource.mockReturnValue('created-source')
      vi.mocked(httpPost).mockResolvedValueOnce({ id: 3 })
      vi.mocked(httpPut).mockResolvedValue(undefined)
      vi.mocked(httpGet)
        .mockResolvedValueOnce({ id: 3, name: 'CS' })
        .mockResolvedValueOnce({ items: [] })

      await createConceptSet({ name: 'CS', items: [{ conceptId: 1112807 }] } as never)

      expect(expressionUrl()).toContain('/conceptset/3/expression/created-source')
    })

    it('appends the source key when re-reading after an update', async () => {
      getValidVocabularySource.mockReturnValue('demo-source')
      vi.mocked(httpPut).mockResolvedValue(undefined)
      vi.mocked(httpGet)
        .mockResolvedValueOnce({ id: 7, name: 'CS' })
        .mockResolvedValueOnce({ items: [] })

      await updateConceptSet({ id: 7, name: 'CS', items: [] } as never)

      expect(expressionUrl()).toContain('/conceptset/7/expression/demo-source')
    })
  })
})
