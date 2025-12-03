/**
 * Unit Tests: Concept Search Service
 * Tests for src/services/concept-search.service.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  searchConcepts,
  getConceptById,
  getConceptRecordCounts,
} from '@/services/concept-search.service'

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
  mapConceptFromAPI: vi.fn((c) => ({
    conceptId: c.CONCEPT_ID,
    conceptName: c.CONCEPT_NAME,
    conceptCode: c.CONCEPT_CODE,
    domainId: c.DOMAIN_ID,
    vocabularyId: c.VOCABULARY_ID,
    conceptClassId: c.CONCEPT_CLASS_ID,
    standardConcept: c.STANDARD_CONCEPT,
    invalidReason: c.INVALID_REASON,
  })),
}))

describe('Concept Search Service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchConcepts', () => {
    it('returns empty result for empty query', async () => {
      const result = await searchConcepts('SYNPUF1K', '')

      expect(result).toEqual({ concepts: [], total: 0 })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('searches concepts with valid query', async () => {
      const mockResponse = [
        {
          CONCEPT_ID: 1,
          CONCEPT_NAME: 'Test Concept',
          CONCEPT_CODE: 'TEST001',
          DOMAIN_ID: 'Condition',
          VOCABULARY_ID: 'SNOMED',
          CONCEPT_CLASS_ID: 'Clinical Finding',
          STANDARD_CONCEPT: 'S',
          INVALID_REASON: null,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await searchConcepts('SYNPUF1K', 'diabetes')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/SYNPUF1K/search?query=diabetes'),
        expect.any(Object)
      )
      expect(result.concepts).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('includes domain filter when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await searchConcepts('SYNPUF1K', 'test', { domain: 'Condition' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('domain=Condition'),
        expect.any(Object)
      )
    })

    it('trims whitespace from query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await searchConcepts('SYNPUF1K', '  diabetes  ')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query=diabetes'),
        expect.any(Object)
      )
    })

    it('throws error on validation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ invalid: 'data' }]),
      })

      await expect(searchConcepts('SYNPUF1K', 'test')).rejects.toThrow(
        'Invalid concept search response format'
      )
    })

    it('throws error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(searchConcepts('SYNPUF1K', 'test')).rejects.toThrow()
    })
  })

  describe('getConceptById', () => {
    it('fetches concept by ID successfully', async () => {
      const mockConcept = {
        CONCEPT_ID: 12345,
        CONCEPT_NAME: 'Type 2 diabetes mellitus',
        CONCEPT_CODE: 'E11',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'ICD10CM',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: null,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConcept),
      })

      const result = await getConceptById('SYNPUF1K', 12345)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/SYNPUF1K/concept/12345'),
        expect.any(Object)
      )
      expect(result).not.toBeNull()
      expect(result?.conceptId).toBe(12345)
    })

    it('returns null on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' }),
      })

      const result = await getConceptById('SYNPUF1K', 12345)

      expect(result).toBeNull()
    })

    it('returns null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getConceptById('SYNPUF1K', 12345)

      expect(result).toBeNull()
    })

    it('returns null on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await getConceptById('SYNPUF1K', 99999)

      expect(result).toBeNull()
    })
  })

  describe('getConceptRecordCounts', () => {
    it('returns empty map for empty concept IDs', async () => {
      const result = await getConceptRecordCounts('SYNPUF1K', [])

      expect(result.size).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('fetches record counts successfully', async () => {
      const mockResponse = [
        {
          '192671': [13, 331, 12, 323],
          '313217': [3023, 3023, 579, 579],
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getConceptRecordCounts('SYNPUF1K', [192671, 313217])

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/SYNPUF1K/conceptRecordCount'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify([192671, 313217]),
        })
      )

      expect(result.size).toBe(2)
      expect(result.get(192671)).toEqual({
        recordCount: 13,
        descendantRecordCount: 331,
        personCount: 12,
        descendantPersonCount: 323,
      })
      expect(result.get(313217)).toEqual({
        recordCount: 3023,
        descendantRecordCount: 3023,
        personCount: 579,
        descendantPersonCount: 579,
      })
    })

    it('handles multiple entries in response', async () => {
      const mockResponse = [{ '1': [10, 20, 30, 40] }, { '2': [50, 60, 70, 80] }]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getConceptRecordCounts('SYNPUF1K', [1, 2])

      expect(result.size).toBe(2)
    })

    it('returns empty map on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getConceptRecordCounts('SYNPUF1K', [12345])

      expect(result.size).toBe(0)
    })

    it('returns empty map on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      })

      const result = await getConceptRecordCounts('SYNPUF1K', [12345])

      expect(result.size).toBe(0)
    })

    it('skips entries with invalid count arrays', async () => {
      const mockResponse = [
        {
          '1': [10, 20, 30, 40], // valid
          '2': [10], // invalid - not 4 elements
          '3': 'invalid', // invalid - not an array
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getConceptRecordCounts('SYNPUF1K', [1, 2, 3])

      expect(result.size).toBe(1)
      expect(result.has(1)).toBe(true)
      expect(result.has(2)).toBe(false)
      expect(result.has(3)).toBe(false)
    })
  })
})
