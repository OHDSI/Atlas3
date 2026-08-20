/**
 * Concept Search Service Tests
 * Tests for concept search and retrieval operations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Some sandboxed jsdom builds don't expose a global `localStorage`, which the
// http-client reads for the locale header. Provide a minimal in-memory shim so
// the service requests can run. No-op when localStorage already exists (CI).
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size
      },
    },
  })
}

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
    ...(data.RELATIONSHIPS !== undefined ? { relationships: data.RELATIONSHIPS } : {}),
  })),
  mapComparisonItemFromAPI: vi.fn((data) => data),
}))

import {
  searchConcepts,
  getConceptById,
  getConceptsByIds,
  getMappedSourceCodes,
  getConceptsBySourceCodes,
  getConceptRecordCounts,
  getRecommendedConcepts,
  compareConceptSets,
  resolveConceptSetExpression,
} from '@/services/concept-search.service'
import { mapConceptFromAPI } from '@/utils/api-mappers'
import { logger } from '@/utils/logger'
import type { ConceptSetExpression } from '@/models/concept-set.types'

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
          STANDARD_CONCEPT_CAPTION: 'Standard',
          CONCEPT_CODE: '12345',
          INVALID_REASON: null,
          INVALID_REASON_CAPTION: 'Unknown',
          VALID_START_DATE: Date.UTC(1970, 0, 1),
          VALID_END_DATE: Date.UTC(2090, 0, 1),
        },
      ]

      // http-client uses text() then JSON.parse, not json()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      })

      const result = await searchConcepts('TEST', 'diabetes')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/TEST/search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"QUERY":"diabetes"'),
        })
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        // .map() calls the function with (item, index, array)
        expect(mapConceptFromAPI).toHaveBeenCalledWith(mockResponse[0], 0, mockResponse)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('should return empty results for empty query', async () => {
      const result = await searchConcepts('TEST', '')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should include domain filter in POST body when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([])),
      })

      await searchConcepts('TEST', 'diabetes', { domain: 'Condition' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/TEST/search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"DOMAIN_ID":["Condition"]'),
        })
      )
    })

    it('should trim query whitespace', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([])),
      })

      await searchConcepts('TEST', '  diabetes  ')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/TEST/search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"QUERY":"diabetes"'),
        })
      )
    })

    it('should fail with an error for invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ invalid: 'response' })),
      })

      const result = await searchConcepts('TEST', 'test')

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected searchConcepts to fail')
      } else {
        expect(result.error.message).toBe('Invalid concept search response format')
      }
    })

    it('fails with the status when the search is rejected', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('no access'),
      })

      const result = await searchConcepts('TEST', 'diabetes')

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected searchConcepts to fail')
      } else {
        expect(result.error.status).toBe(403)
      }
    })

    it('fails with an error for an invalid sourceKey', async () => {
      const result = await searchConcepts('', 'diabetes')

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected searchConcepts to fail')
      } else {
        expect(result.error.message).toContain('Invalid vocabulary source')
      }
      expect(mockFetch).not.toHaveBeenCalled()
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
        STANDARD_CONCEPT_CAPTION: 'Standard',
        CONCEPT_CODE: '12345',
        INVALID_REASON: null,
        INVALID_REASON_CAPTION: 'Unknown',
        VALID_START_DATE: Date.UTC(1970, 0, 1),
        VALID_END_DATE: Date.UTC(2090, 0, 1),
      }

      // http-client uses text() then JSON.parse
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockConcept)),
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

    it('throws for invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ invalid: 'response' })),
      })

      await expect(getConceptById('TEST', 123)).rejects.toThrow(
        'Invalid concept detail response'
      )
    })

    it('throws on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(getConceptById('TEST', 123)).rejects.toThrow('Network error')
    })
  })

  describe('getConceptsByIds', () => {
    const concept = (id: number) => ({
      CONCEPT_ID: id,
      CONCEPT_NAME: `Concept ${id}`,
      DOMAIN_ID: 'Condition',
      VOCABULARY_ID: 'SNOMED',
      CONCEPT_CLASS_ID: 'Clinical Finding',
      STANDARD_CONCEPT: 'S',
      STANDARD_CONCEPT_CAPTION: 'Standard',
      CONCEPT_CODE: `${id}`,
      INVALID_REASON: null,
      INVALID_REASON_CAPTION: 'Unknown',
      VALID_START_DATE: Date.UTC(1970, 0, 1),
      VALID_END_DATE: Date.UTC(2090, 0, 1),
    })

    it('POSTs the id array to lookup/identifiers and maps the response', async () => {
      const apiResponse = [concept(201826), concept(443238)]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(apiResponse)),
      })

      const result = await getConceptsByIds('SYNPUF1K', [201826, 443238])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/SYNPUF1K/lookup/identifiers'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify([201826, 443238]),
        }),
      )
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ conceptId: 201826 })
      expect(result[1]).toMatchObject({ conceptId: 443238 })
    })

    it('returns [] without calling fetch for an empty id list', async () => {
      const result = await getConceptsByIds('SYNPUF1K', [])
      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('only returns rows for ids the endpoint resolves (missing ids omitted)', async () => {
      // Requested 3 ids, endpoint only knows about 1 — the caller diffs these.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([concept(201826)])),
      })

      const result = await getConceptsByIds('SYNPUF1K', [201826, 111, 222])
      expect(result).toHaveLength(1)
      expect(result[0].conceptId).toBe(201826)
    })

    it('throws for an invalid sourceKey', async () => {
      await expect(getConceptsByIds('', [1])).rejects.toThrow('Invalid vocabulary source')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws and logs on a malformed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ not: 'an array' })),
      })

      await expect(getConceptsByIds('SYNPUF1K', [1])).rejects.toThrow(
        'Invalid concept identifier lookup response format',
      )
      expect(logger.error).toHaveBeenCalled()
    })

    it('passes the AbortSignal through to fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('[]'),
      })
      const ctrl = new AbortController()
      await getConceptsByIds('SYNPUF1K', [1], ctrl.signal)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: ctrl.signal }),
      )
    })
  })

  describe('getMappedSourceCodes', () => {
    const sourceConcept = (id: number, code: string, vocab: string) => ({
      CONCEPT_ID: id,
      CONCEPT_NAME: `Source ${id}`,
      DOMAIN_ID: 'Condition',
      VOCABULARY_ID: vocab,
      CONCEPT_CLASS_ID: 'ICD10 code',
      STANDARD_CONCEPT: null,
      STANDARD_CONCEPT_CAPTION: 'Unknown',
      CONCEPT_CODE: code,
      INVALID_REASON: null,
      INVALID_REASON_CAPTION: 'Unknown',
      VALID_START_DATE: Date.UTC(1970, 0, 1),
      VALID_END_DATE: Date.UTC(2090, 0, 1),
    })

    it('POSTs the concept-id array to lookup/mapped and maps the response', async () => {
      const apiResponse = [
        sourceConcept(45542738, 'E11.9', 'ICD10CM'),
        sourceConcept(44824073, '250.00', 'ICD9CM'),
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(apiResponse)),
      })

      const result = await getMappedSourceCodes('SYNPUF1K', [201826, 443238])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/SYNPUF1K/lookup/mapped'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify([201826, 443238]),
        }),
      )
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ conceptId: 45542738, vocabularyId: 'ICD10CM' })
    })

    it('returns [] without calling fetch for an empty id list', async () => {
      const result = await getMappedSourceCodes('SYNPUF1K', [])
      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws for an invalid sourceKey', async () => {
      await expect(getMappedSourceCodes('', [1])).rejects.toThrow('Invalid vocabulary source')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws and logs on a malformed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ not: 'an array' })),
      })

      await expect(getMappedSourceCodes('SYNPUF1K', [1])).rejects.toThrow(
        'Invalid mapped source code lookup response format',
      )
      expect(logger.error).toHaveBeenCalled()
    })

    it('passes the AbortSignal through to fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('[]'),
      })
      const ctrl = new AbortController()
      await getMappedSourceCodes('SYNPUF1K', [1], ctrl.signal)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: ctrl.signal }),
      )
    })
  })

  describe('getConceptsBySourceCodes', () => {
    const conceptWithCode = (id: number, code: string) => ({
      CONCEPT_ID: id,
      CONCEPT_NAME: `Concept ${id}`,
      DOMAIN_ID: 'Condition',
      VOCABULARY_ID: 'ICD10CM',
      CONCEPT_CLASS_ID: '4-char billing code',
      STANDARD_CONCEPT: null,
      STANDARD_CONCEPT_CAPTION: 'Unknown',
      CONCEPT_CODE: code,
      INVALID_REASON: null,
      INVALID_REASON_CAPTION: 'Unknown',
      VALID_START_DATE: Date.UTC(1970, 0, 1),
      VALID_END_DATE: Date.UTC(2090, 0, 1),
    })

    it('POSTs the code array to lookup/sourcecodes and maps the response', async () => {
      const apiResponse = [conceptWithCode(35206879, 'E11.9'), conceptWithCode(44826979, '250.00')]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(apiResponse)),
      })

      const result = await getConceptsBySourceCodes('SYNPUF1K', ['E11.9', '250.00'])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/SYNPUF1K/lookup/sourcecodes'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(['E11.9', '250.00']),
        }),
      )
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ conceptCode: 'E11.9' })
      expect(result[1]).toMatchObject({ conceptCode: '250.00' })
    })

    it('returns [] without calling fetch for an empty code list', async () => {
      const result = await getConceptsBySourceCodes('SYNPUF1K', [])
      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws for an invalid sourceKey', async () => {
      await expect(getConceptsBySourceCodes('null', ['E11.9'])).rejects.toThrow(
        'Invalid vocabulary source',
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws and logs on a malformed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ not: 'an array' })),
      })

      await expect(getConceptsBySourceCodes('SYNPUF1K', ['E11.9'])).rejects.toThrow(
        'Invalid source code lookup response format',
      )
      expect(logger.error).toHaveBeenCalled()
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

      // http-client uses text() then JSON.parse
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      })

      const result = await getConceptRecordCounts('TEST', [123, 456])

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/conceptRecordCount'),
        expect.objectContaining({
          method: 'POST',
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
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
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
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      })

      const result = await getConceptRecordCounts('TEST', [123, 456])

      expect(result.size).toBe(2)
      expect(result.has(123)).toBe(true)
      expect(result.has(456)).toBe(true)
    })
  })

  describe('getRecommendedConcepts', () => {
    it('should return available:true with empty concepts when conceptIds is empty (no fetch)', async () => {
      const result = await getRecommendedConcepts('TEST', [])

      expect(result).toEqual({ available: true, concepts: [] })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw for invalid sourceKey (empty string)', async () => {
      await expect(getRecommendedConcepts('', [123])).rejects.toThrow(
        'Invalid vocabulary source'
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should throw for invalid sourceKey ('null')", async () => {
      await expect(getRecommendedConcepts('null', [123])).rejects.toThrow(
        'Invalid vocabulary source'
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should POST to /vocabulary/{key}/lookup/recommended with conceptIds and map results', async () => {
      const mockResponse = [
        {
            CONCEPT_ID: 999,
            CONCEPT_NAME: 'Recommended Concept',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
            STANDARD_CONCEPT: 'S',
          STANDARD_CONCEPT_CAPTION: 'Standard',
            CONCEPT_CODE: '99999',
            INVALID_REASON: null,
          INVALID_REASON_CAPTION: 'Unknown',
          VALID_START_DATE: Date.UTC(1970, 0, 1),
          VALID_END_DATE: Date.UTC(2090, 0, 1),
            RELATIONSHIPS: ['Maps to', 'Subsumes'],
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      })

      const result = await getRecommendedConcepts('TEST', [201826, 4034964])

      expect(result.available).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/TEST/lookup/recommended'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify([201826, 4034964]),
        })
      )
      expect(result.concepts).toHaveLength(1)
      expect(result.concepts[0].conceptId).toBe(999)
      expect(result.concepts[0].relationships).toEqual(['Maps to', 'Subsumes'])
      expect(mapConceptFromAPI).toHaveBeenCalledWith(mockResponse[0], 0, mockResponse)
    })

    it('should map results without RELATIONSHIPS when not provided', async () => {
      const mockResponse = [
        {
            CONCEPT_ID: 1000,
            CONCEPT_NAME: 'Plain Concept',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
            STANDARD_CONCEPT: 'S',
          STANDARD_CONCEPT_CAPTION: 'Standard',
            CONCEPT_CODE: '1000',
            INVALID_REASON: null,
          INVALID_REASON_CAPTION: 'Unknown',
          VALID_START_DATE: Date.UTC(1970, 0, 1),
          VALID_END_DATE: Date.UTC(2090, 0, 1),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      })

      const result = await getRecommendedConcepts('TEST', [123])

      expect(result.available).toBe(true)
      expect(result.concepts).toHaveLength(1)
      expect(result.concepts[0].relationships).toBeUndefined()
    })

    it('should return available:false on HTTP 501 without throwing or logging error', async () => {
      // 501 is in the 5xx retryable range; http-client will attempt the
      // request multiple times before giving up. Use mockResolvedValue (not
      // Once) so every retry sees the same 501 response.
      mockFetch.mockResolvedValue({
        ok: false,
        status: 501,
        statusText: 'Not Implemented',
      })

      const result = await getRecommendedConcepts('TEST', [123])

      expect(result).toEqual({ available: false, concepts: [] })
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should propagate non-501 server errors', async () => {
      // 404 is not retryable
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(getRecommendedConcepts('TEST', [123])).rejects.toThrow('HTTP 404')
    })

    it('should throw and log validation error for malformed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ unexpected: 'shape' })),
      })

      await expect(getRecommendedConcepts('TEST', [123])).rejects.toThrow(
        'Invalid recommended concepts response format'
      )
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('resolveConceptSetExpression', () => {
    const expression: ConceptSetExpression = {
      items: [
        {
          concept: {
            CONCEPT_ID: 201826,
            CONCEPT_NAME: 'Type 2 diabetes mellitus',
            CONCEPT_CODE: '44054006',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
            STANDARD_CONCEPT: 'S',
            INVALID_REASON: null,
          },
          isExcluded: false,
          includeDescendants: true,
          includeMapped: false,
        },
      ],
    }

    it('POSTs the expression to the resolve endpoint and maps the response', async () => {
      const apiResponse = [
        {
            CONCEPT_ID: 201826,
            CONCEPT_NAME: 'Type 2 diabetes mellitus',
            CONCEPT_CODE: '44054006',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
            STANDARD_CONCEPT: 'S',
          STANDARD_CONCEPT_CAPTION: 'Standard',
            INVALID_REASON: null,
          INVALID_REASON_CAPTION: 'Unknown',
          VALID_START_DATE: Date.UTC(1970, 0, 1),
          VALID_END_DATE: Date.UTC(2090, 0, 1),
        },
        {
            CONCEPT_ID: 443238,
            CONCEPT_NAME: 'Type 2 diabetes mellitus with diabetic nephropathy',
            CONCEPT_CODE: '127013003',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
            CONCEPT_CLASS_ID: 'Clinical Finding',
            STANDARD_CONCEPT: 'S',
          STANDARD_CONCEPT_CAPTION: 'Standard',
            INVALID_REASON: null,
          INVALID_REASON_CAPTION: 'Unknown',
          VALID_START_DATE: Date.UTC(1970, 0, 1),
          VALID_END_DATE: Date.UTC(2090, 0, 1),
        },
      ]

      // First call: resolveConceptSetExpression returns an array of IDs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([201826, 443238])),
      })
      // Second call: lookup/identifiers returns full concept records
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(apiResponse)),
      })

      const result = await resolveConceptSetExpression('SYNPUF1K', expression)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/vocabulary/SYNPUF1K/resolveConceptSetExpression'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"CONCEPT_ID":201826'),
        }),
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/vocabulary/SYNPUF1K/lookup/identifiers'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify([201826, 443238]),
        }),
      )
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ conceptId: 201826, vocabularyId: 'SNOMED' })
      expect(result[1]).toMatchObject({ conceptId: 443238 })
    })

    it('passes the AbortSignal through to fetch', async () => {
      // First call: resolve returns one ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('[1]'),
      })
      // Second call: lookup/identifiers returns empty array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('[]'),
      })

      const ctrl = new AbortController()
      await resolveConceptSetExpression('SYNPUF1K', expression, ctrl.signal)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.objectContaining({ signal: ctrl.signal }),
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.objectContaining({ signal: ctrl.signal }),
      )
    })

    it('throws on non-2xx responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(''),
      })

      await expect(resolveConceptSetExpression('SYNPUF1K', expression)).rejects.toThrow(/HTTP 500/)
    })

    it('throws when the response is not a JSON array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"not":"an array"}'),
      })

      await expect(resolveConceptSetExpression('SYNPUF1K', expression)).rejects.toThrow(
        /Invalid resolve.*response/i,
      )
    })

    it('throws when an array element fails schema validation', async () => {
      // First call: resolve returns a valid ID array
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('[1]'),
      })
      // Second call: lookup/identifiers returns a malformed concept
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([{ CONCEPT_ID: 'not-a-number' }])),
      })
      await expect(resolveConceptSetExpression('SYNPUF1K', expression)).rejects.toThrow(
        /Invalid resolve.*response/i,
      )
    })

    it('throws when sourceKey is empty', async () => {
      await expect(resolveConceptSetExpression('', expression)).rejects.toThrow(/Invalid vocabulary/i)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns [] without calling lookup/identifiers when resolve returns an empty array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('[]'),
      })

      const result = await resolveConceptSetExpression('SYNPUF1K', expression)

      expect(result).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/resolveConceptSetExpression'),
        expect.any(Object),
      )
    })

    it('throws when the resolve response contains non-numbers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('["not a number"]'),
      })
      await expect(resolveConceptSetExpression('SYNPUF1K', expression)).rejects.toThrow(
        /Invalid resolveConceptSetExpression response format/i,
      )
    })
  })

  describe('compareConceptSets', () => {
    function makeExpression(conceptId: number): ConceptSetExpression {
      return {
        items: [
          {
            concept: {
              CONCEPT_ID: conceptId,
              CONCEPT_NAME: `Concept ${conceptId}`,
              CONCEPT_CODE: `${conceptId}`,
              DOMAIN_ID: 'Condition',
              VOCABULARY_ID: 'SNOMED',
              CONCEPT_CLASS_ID: 'Clinical Finding',
              STANDARD_CONCEPT: 'S',
              INVALID_REASON: null,
            },
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false,
          },
        ],
      }
    }

    function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        conceptId: 100,
        conceptIn1Only: 0,
        conceptIn2Only: 0,
        conceptIn1And2: 1,
        conceptName: 'Type 2 diabetes mellitus',
        conceptCode: '44054006',
        conceptClassId: 'Clinical Finding',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        standardConcept: 'S',
        invalidReason: null,
        validStartDate: '2002-01-31',
        validEndDate: '2099-12-31',
        nameMismatch: false,
        ...overrides,
      }
    }

    it('should POST to /vocabulary/{key}/compare with the two expressions in order and parse results', async () => {
      const mockResponse = [
        makeRow({ conceptId: 1, conceptIn1Only: 1, conceptIn2Only: 0, conceptIn1And2: 0 }),
        makeRow({ conceptId: 2, conceptIn1Only: 0, conceptIn2Only: 1, conceptIn1And2: 0 }),
        makeRow({ conceptId: 3, conceptIn1Only: 0, conceptIn2Only: 0, conceptIn1And2: 1 }),
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      })

      const expr1 = makeExpression(1)
      const expr2 = makeExpression(2)
      const result = await compareConceptSets('TEST', expr1, expr2)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/vocabulary/TEST/compare')
      expect(init.method).toBe('POST')
      const sentBody = JSON.parse(init.body)
      expect(Array.isArray(sentBody)).toBe(true)
      expect(sentBody).toHaveLength(2)
      expect(sentBody[0]).toEqual(expr1)
      expect(sentBody[1]).toEqual(expr2)

      expect(result).toHaveLength(3)
      expect(result[0].conceptId).toBe(1)
      expect(result[0].conceptIn1Only).toBe(1)
      expect(result[1].conceptIn2Only).toBe(1)
      expect(result[2].conceptIn1And2).toBe(1)
    })

    it('should default nameMismatch to false when missing from response', async () => {
      const row = makeRow()
      delete (row as Record<string, unknown>).nameMismatch

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify([row])),
      })

      const result = await compareConceptSets('TEST', makeExpression(1), makeExpression(2))
      expect(result).toHaveLength(1)
      expect(result[0].nameMismatch).toBe(false)
    })

    it('should return [] without making a request when expression1 has no items', async () => {
      const empty: ConceptSetExpression = { items: [] }
      const result = await compareConceptSets('TEST', empty, makeExpression(2))

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should return [] without making a request when expression2 has no items', async () => {
      const empty: ConceptSetExpression = { items: [] }
      const result = await compareConceptSets('TEST', makeExpression(1), empty)

      expect(result).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw for invalid sourceKey (empty string)', async () => {
      await expect(
        compareConceptSets('', makeExpression(1), makeExpression(2))
      ).rejects.toThrow('Invalid vocabulary source')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("should throw for invalid sourceKey ('null')", async () => {
      await expect(
        compareConceptSets('null', makeExpression(1), makeExpression(2))
      ).rejects.toThrow('Invalid vocabulary source')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should throw and log validation error for malformed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ unexpected: 'shape' })),
      })

      await expect(
        compareConceptSets('TEST', makeExpression(1), makeExpression(2))
      ).rejects.toThrow('Invalid concept set comparison response format')
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
