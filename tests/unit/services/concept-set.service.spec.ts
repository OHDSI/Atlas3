/**
 * Concept Set Service Tests
 * Tests for concept set CRUD operations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock api-mappers
vi.mock('@/utils/api-mappers', () => ({
  mapConceptSetFromAPI: vi.fn((data) => ({
    id: data.id,
    name: data.name,
    description: data.description,
    items: data.expression?.items || [],
  })),
  mapConceptSetToAPI: vi.fn((data) => ({
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

describe('ConceptSetService', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAllConceptSets', () => {
    it('should fetch and return concept set list', async () => {
      const mockResponse = [
        { id: 1, name: 'Concept Set 1' },
        { id: 2, name: 'Concept Set 2' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getAllConceptSets()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset'),
        expect.any(Object)
      )
      expect(result).toHaveLength(2)
    })

    it('throws on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      })

      await expect(getAllConceptSets()).rejects.toThrow('HTTP 500')
    })

    it('throws for invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      })

      await expect(getAllConceptSets()).rejects.toThrow('Invalid concept set list response')
    })

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getAllConceptSets()).rejects.toThrow('Network error')
    })
  })

  describe('getConceptSetById', () => {
    it('should fetch concept set by ID', async () => {
      const mockMetadata = { id: 1, name: 'Test Concept Set', description: 'Test description' }
      const mockExpression = { items: [{ concept: { conceptId: 123 } }] }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMetadata),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExpression),
        })

      const result = await getConceptSetById(1)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset/1'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset/1/expression'),
        expect.any(Object)
      )
      expect(result).not.toBeNull()
      expect(mapConceptSetFromAPI).toHaveBeenCalled()
    })

    it('should accept string ID', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ items: [] }),
        })

      await getConceptSetById('1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset/1'),
        expect.any(Object)
      )
    })

    it('should return null on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await getConceptSetById(999)

      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getConceptSetById(1)

      expect(result).toBeNull()
    })

    it('rethrows with the server message body when rethrow is requested', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 3 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () =>
            Promise.resolve(
              JSON.stringify({
                message: 'Current data source does not contain required concepts (443238)',
              })
            ),
        })

      await expect(getConceptSetById(3, { rethrow: true })).rejects.toThrow(/required concepts/)
    })

    it('falls back to the raw body text when the error body is not JSON', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 3 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('plain text failure'),
        })

      await expect(getConceptSetById(3, { rethrow: true })).rejects.toThrow(/plain text failure/)
    })
  })

  describe('createConceptSet', () => {
    it('should create concept set', async () => {
      const newConceptSet = {
        name: 'New Concept Set',
        description: 'New description',
        items: [],
      }

      const mockResponse = {
        id: 1,
        name: 'New Concept Set',
        description: 'New description',
        expression: { items: [] },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await createConceptSet(newConceptSet)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      )
      expect(result).not.toBeNull()
    })

    it('throws on create failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(createConceptSet({ name: 'Test', items: [] })).rejects.toThrow('HTTP 400')
    })

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(createConceptSet({ name: 'Test', items: [] })).rejects.toThrow('Network error')
    })
  })

  describe('updateConceptSet', () => {
    it('should update concept set', async () => {
      const conceptSet = {
        id: 1,
        name: 'Updated Concept Set',
        description: 'Updated description',
        items: [],
      }

      const mockMetadataResponse = {
        id: 1,
        name: 'Updated Concept Set',
        description: 'Updated description',
      }

      const mockExpressionResponse = {
        items: [],
      }

      // Mock the three fetch calls: PUT metadata, PUT items, GET metadata, GET expression
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMetadataResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 204,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMetadataResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExpressionResponse),
        })

      const result = await updateConceptSet(conceptSet)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset/1'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.any(String),
        })
      )
      expect(result).not.toBeNull()
    })

    it('should throw error when ID is missing', async () => {
      const conceptSet = {
        name: 'No ID',
        items: [],
      }

      await expect(updateConceptSet(conceptSet as any)).rejects.toThrow(
        'Concept set ID is required for update'
      )
    })

    it('throws on update failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      await expect(updateConceptSet({ id: 1, name: 'Test', items: [] })).rejects.toThrow(
        'HTTP 400'
      )
    })

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(updateConceptSet({ id: 1, name: 'Test', items: [] })).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('deleteConceptSet', () => {
    it('should delete concept set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await deleteConceptSet(1)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(result).toBe(true)
    })

    it('should accept string ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await deleteConceptSet('1')

      expect(result).toBe(true)
    })

    it('should return false on delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await deleteConceptSet(999)

      expect(result).toBe(false)
    })

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await deleteConceptSet(1)

      expect(result).toBe(false)
    })
  })

  describe('expression requests carry the selected vocabulary source', () => {
    const expressionUrl = () =>
      mockFetch.mock.calls.map(call => String(call[0])).find(url => url.includes('/expression'))

    it('appends the selected source key when reading a concept set', async () => {
      localStorage.setItem('selectedVocabulary', 'ed0f253b-dfef-4202-b1d1-5b0ce9f7c9e0')
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 1, name: 'CS' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })

      await getConceptSetById(1)

      expect(expressionUrl()).toContain(
        '/conceptset/1/expression/ed0f253b-dfef-4202-b1d1-5b0ce9f7c9e0'
      )
    })

    it('appends the selected source key when re-reading after a create with items', async () => {
      localStorage.setItem('selectedVocabulary', 'created-source')
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 3 }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 3, name: 'CS' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })

      await createConceptSet({
        name: 'CS',
        items: [{ conceptId: 1112807 }],
      } as never)

      expect(expressionUrl()).toContain('/conceptset/3/expression/created-source')
    })

    it('appends the selected source key when re-reading after an update', async () => {
      localStorage.setItem('selectedVocabulary', 'demo-source')
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 7 }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 7, name: 'CS' }) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ items: [] }) })

      await updateConceptSet({ id: 7, name: 'CS', items: [] } as never)

      expect(expressionUrl()).toContain('/conceptset/7/expression/demo-source')
    })
  })
})
