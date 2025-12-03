/**
 * Unit Tests: Concept Set Service
 * Tests for src/services/concept-set.service.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getAllConceptSets,
  getConceptSetById,
  createConceptSet,
  updateConceptSet,
  deleteConceptSet,
} from '@/services/concept-set.service'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
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

describe('Concept Set Service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAllConceptSets', () => {
    it('fetches all concept sets successfully', async () => {
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

    it('returns empty array on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve('invalid'),
      })

      const result = await getAllConceptSets()

      expect(result).toEqual([])
    })

    it('returns empty array on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getAllConceptSets()

      expect(result).toEqual([])
    })

    it('returns empty array on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      })

      const result = await getAllConceptSets()

      expect(result).toEqual([])
    })
  })

  describe('getConceptSetById', () => {
    it('fetches concept set with metadata and expression', async () => {
      const mockMetadata = {
        id: 1,
        name: 'Test Concept Set',
        description: 'Test Description',
      }
      const mockExpression = {
        items: [{ concept: { conceptId: 12345 } }],
      }

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
    })

    it('accepts string ID', async () => {
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

    it('returns null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getConceptSetById(1)

      expect(result).toBeNull()
    })

    it('returns null on metadata fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await getConceptSetById(99999)

      expect(result).toBeNull()
    })
  })

  describe('createConceptSet', () => {
    it('creates concept set successfully', async () => {
      const newConceptSet = {
        name: 'New Concept Set',
        description: 'Test description',
        items: [],
      }

      const mockResponse = {
        id: 123,
        name: 'New Concept Set',
        description: 'Test description',
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
        })
      )
      expect(result).not.toBeNull()
    })

    it('returns null on creation error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await createConceptSet({
        name: 'Test',
        description: '',
        items: [],
      })

      expect(result).toBeNull()
    })

    it('returns null on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const result = await createConceptSet({
        name: '',
        description: '',
        items: [],
      })

      expect(result).toBeNull()
    })
  })

  describe('updateConceptSet', () => {
    it('updates concept set successfully', async () => {
      const conceptSet = {
        id: 1,
        name: 'Updated Concept Set',
        description: 'Updated description',
        items: [],
      }

      const mockResponse = {
        id: 1,
        name: 'Updated Concept Set',
        description: 'Updated description',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await updateConceptSet(conceptSet)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset/1'),
        expect.objectContaining({
          method: 'PUT',
        })
      )
      expect(result).not.toBeNull()
    })

    it('throws error when ID is missing', async () => {
      const conceptSet = {
        name: 'No ID Concept Set',
        description: '',
        items: [],
      }

      await expect(updateConceptSet(conceptSet as never)).rejects.toThrow(
        'Concept set ID is required for update'
      )
    })

    it('returns null on update error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await updateConceptSet({
        id: 1,
        name: 'Test',
        description: '',
        items: [],
      })

      expect(result).toBeNull()
    })

    it('returns null on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      })

      const result = await updateConceptSet({
        id: 1,
        name: 'Test',
        description: '',
        items: [],
      })

      expect(result).toBeNull()
    })
  })

  describe('deleteConceptSet', () => {
    it('deletes concept set successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(null),
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

    it('accepts string ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve(null),
      })

      const result = await deleteConceptSet('123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/conceptset/123'),
        expect.any(Object)
      )
      expect(result).toBe(true)
    })

    it('returns false on delete error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await deleteConceptSet(1)

      expect(result).toBe(false)
    })

    it('returns false on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      })

      const result = await deleteConceptSet(1)

      expect(result).toBe(false)
    })
  })
})
