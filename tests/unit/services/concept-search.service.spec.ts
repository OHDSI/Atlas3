/**
 * Concept Search Service Tests
 * Tests for concept search and retrieval operations
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
  mapConceptFromAPI: vi.fn((data) => ({
    conceptId: data.CONCEPT_ID,
    conceptName: data.CONCEPT_NAME,
    domainId: data.DOMAIN_ID,
    vocabularyId: data.VOCABULARY_ID,
    conceptClassId: data.CONCEPT_CLASS_ID,
    standardConcept: data.STANDARD_CONCEPT,
    conceptCode: data.CONCEPT_CODE,
    invalidReason: data.INVALID_REASON,
  })),
}))

import { searchConcepts, getConceptById, getConceptRecordCounts } from '@/services/concept-search.service'
import { mapConceptFromAPI } from '@/utils/api-mappers'

describe('ConceptSearchService', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchConcepts', () => {
    it('should search for concepts and return mapped results', async () => {
      const mockResponse = [
        {
          CONCEPT_ID: 123,
          CONCEPT_NAME: 'Test Concept',
          DOMAIN_ID: 'Condition',
          VOCABULARY_ID: 'SNOMED',
          CONCEPT_CLASS_ID: 'Clinical Finding',
          STANDARD_CONCEPT: 'S',
          CONCEPT_CODE: '12345',
          INVALID_REASON: null,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await searchConcepts('TEST', 'diabetes')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/TEST/search?query=diabetes'),
        expect.any(Object)
      )
      expect(result.concepts).toHaveLength(1)
      expect(result.total).toBe(1)
      // .map() calls the function with (item, index, array)
      expect(mapConceptFromAPI).toHaveBeenCalledWith(mockResponse[0], 0, mockResponse)
    })

    it('should return empty results for empty query', async () => {
      const result = await searchConcepts('TEST', '')

      expect(result.concepts).toEqual([])
      expect(result.total).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should include domain filter when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await searchConcepts('TEST', 'diabetes', { domain: 'Condition' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('domain=Condition'),
        expect.any(Object)
      )
    })

    it('should trim query whitespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await searchConcepts('TEST', '  diabetes  ')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query=diabetes'),
        expect.any(Object)
      )
    })

    it('should throw error for invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      })

      await expect(searchConcepts('TEST', 'test')).rejects.toThrow(
        'Invalid concept search response format'
      )
    })

    it('should throw error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(searchConcepts('TEST', 'test')).rejects.toThrow('HTTP 500')
    })
  })

  describe('getConceptById', () => {
    it('should fetch single concept by ID', async () => {
      const mockConcept = {
        CONCEPT_ID: 123,
        CONCEPT_NAME: 'Test Concept',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'SNOMED',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        CONCEPT_CODE: '12345',
        INVALID_REASON: null,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConcept),
      })

      const result = await getConceptById('TEST', 123)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/TEST/concept/123'),
        expect.any(Object)
      )
      expect(result).not.toBeNull()
      expect(mapConceptFromAPI).toHaveBeenCalledWith(mockConcept)
    })

    it('should return null on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await getConceptById('TEST', 999)

      expect(result).toBeNull()
    })

    it('should return null for invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }),
      })

      const result = await getConceptById('TEST', 123)

      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getConceptById('TEST', 123)

      expect(result).toBeNull()
    })
  })

  describe('getConceptRecordCounts', () => {
    it('should fetch record counts for multiple concepts', async () => {
      const mockResponse = [
        {
          '123': [100, 150, 50, 75],
          '456': [200, 300, 100, 150],
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getConceptRecordCounts('TEST', [123, 456])

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/conceptRecordCount'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify([123, 456]),
        })
      )

      expect(result.size).toBe(2)
      expect(result.get(123)).toEqual({
        recordCount: 100,
        descendantRecordCount: 150,
        personCount: 50,
        descendantPersonCount: 75,
      })
      expect(result.get(456)).toEqual({
        recordCount: 200,
        descendantRecordCount: 300,
        personCount: 100,
        descendantPersonCount: 150,
      })
    })

    it('should return empty map for empty concept IDs', async () => {
      const result = await getConceptRecordCounts('TEST', [])

      expect(result.size).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return empty map on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      })

      const result = await getConceptRecordCounts('TEST', [123])

      expect(result.size).toBe(0)
    })

    it('should return empty map on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getConceptRecordCounts('TEST', [123])

      expect(result.size).toBe(0)
    })

    it('should handle malformed response data', async () => {
      const mockResponse = [
        {
          '123': [100], // Missing values
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getConceptRecordCounts('TEST', [123])

      // Should not include malformed data
      expect(result.has(123)).toBe(false)
    })

    it('should handle multiple response objects', async () => {
      const mockResponse = [
        { '123': [100, 150, 50, 75] },
        { '456': [200, 300, 100, 150] },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getConceptRecordCounts('TEST', [123, 456])

      expect(result.size).toBe(2)
      expect(result.has(123)).toBe(true)
      expect(result.has(456)).toBe(true)
    })
  })
})
