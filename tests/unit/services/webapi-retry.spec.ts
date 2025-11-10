/**
 * Unit Test: WebAPI Service - Network Retry Logic
 * Tests exponential backoff retry mechanism
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as webapi from '@/services/webapi'

// Mock the global fetch function
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WebAPI Service - Network Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful requests (no retry needed)', () => {
    it('should succeed on first attempt', async () => {
      const mockResponse = [
        {
          sourceKey: 'SYNPUF1K',
          sourceName: 'SYNPUF 1K',
          sourceDialect: 'postgresql',
          daimons: [],
          sourceId: 1,
          sourceConnection: 'connection string',
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const sources = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(sources).toHaveLength(1)
      expect(sources[0]?.sourceKey).toBe('SYNPUF1K')
    })
  })

  describe('retryable errors - network failures', () => {
    it('should retry on network error (TypeError)', async () => {
      const mockResponse = [{
        sourceKey: 'SYNPUF1K',
        sourceName: 'SYNPUF 1K',
        sourceDialect: 'postgresql',
        daimons: [],
        sourceId: 1,
        sourceConnection: 'connection string',
      }]

      // First two attempts fail with network error, third succeeds
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

      const promise = webapi.fetchCDMSources()

      // Advance timers for first retry (500ms)
      await vi.advanceTimersByTimeAsync(500)

      // Advance timers for second retry (1000ms)
      await vi.advanceTimersByTimeAsync(1000)

      const sources = await promise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(sources).toHaveLength(1)
      expect(sources[0]?.sourceKey).toBe('SYNPUF1K')
    })

    it('should use exponential backoff delays (500ms, 1000ms, 2000ms)', async () => {
      const delays: number[] = []
      let lastTime: number | null = null

      mockFetch.mockImplementation(() => {
        const currentTime = Date.now()
        if (lastTime !== null) {
          delays.push(currentTime - lastTime)
        }
        lastTime = currentTime
        return Promise.reject(new TypeError('Network error'))
      })

      const promise = webapi.fetchCDMSources().catch(() => {})

      // First attempt (no delay)
      await vi.advanceTimersByTimeAsync(0)

      // First retry after 500ms
      await vi.advanceTimersByTimeAsync(500)

      // Second retry after 1000ms
      await vi.advanceTimersByTimeAsync(1000)

      await promise

      // Verify exponential backoff: 500ms, 1000ms
      expect(delays[0]).toBeGreaterThanOrEqual(500)
      expect(delays[0]).toBeLessThan(600)
      expect(delays[1]).toBeGreaterThanOrEqual(1000)
      expect(delays[1]).toBeLessThan(1100)

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should fail after 3 attempts', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network request failed'))

      // Start the promise and catch it to prevent unhandled rejection
      const promise = webapi.fetchCDMSources().catch(err => err)

      // Advance through all retry attempts
      await vi.advanceTimersByTimeAsync(500)  // First retry
      await vi.advanceTimersByTimeAsync(1000) // Second retry

      const result = await promise
      expect(result).toBeInstanceOf(Error)
      expect(result.message).toContain('Network error')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('retryable errors - 5xx server errors', () => {
    it('should retry on 500 Internal Server Error', async () => {
      const mockResponse = [{
        sourceKey: 'SYNPUF1K',
        sourceName: 'SYNPUF 1K',
        sourceDialect: 'postgresql',
        daimons: [],
        sourceId: 1,
        sourceConnection: 'connection string',
      }]

      // First attempt fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

      const promise = webapi.fetchCDMSources()

      // Advance timer for first retry
      await vi.advanceTimersByTimeAsync(500)

      const sources = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(sources).toHaveLength(1)
      expect(sources[0]?.sourceKey).toBe('SYNPUF1K')
    })

    it('should retry on 502 Bad Gateway', async () => {
      const mockResponse = [{
        sourceKey: 'SYNPUF1K',
        sourceName: 'SYNPUF 1K',
        sourceDialect: 'postgresql',
        daimons: [],
        sourceId: 1,
        sourceConnection: 'connection string',
      }]

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

      const promise = webapi.fetchCDMSources()
      await vi.advanceTimersByTimeAsync(500)

      const sources = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(sources).toHaveLength(1)
      expect(sources[0]?.sourceKey).toBe('SYNPUF1K')
    })

    it('should retry on 503 Service Unavailable', async () => {
      const mockResponse = [{
        sourceKey: 'SYNPUF1K',
        sourceName: 'SYNPUF 1K',
        sourceDialect: 'postgresql',
        daimons: [],
        sourceId: 1,
        sourceConnection: 'connection string',
      }]

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

      const promise = webapi.fetchCDMSources()
      await vi.advanceTimersByTimeAsync(500)

      const sources = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(sources).toHaveLength(1)
      expect(sources[0]?.sourceKey).toBe('SYNPUF1K')
    })

    it('should retry on 504 Gateway Timeout', async () => {
      const mockResponse = [{
        sourceKey: 'SYNPUF1K',
        sourceName: 'SYNPUF 1K',
        sourceDialect: 'postgresql',
        daimons: [],
        sourceId: 1,
        sourceConnection: 'connection string',
      }]

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 504,
          statusText: 'Gateway Timeout',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

      const promise = webapi.fetchCDMSources()
      await vi.advanceTimersByTimeAsync(500)

      const sources = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(sources).toHaveLength(1)
      expect(sources[0]?.sourceKey).toBe('SYNPUF1K')
    })
  })

  describe('retryable errors - 429 Too Many Requests', () => {
    it('should retry on 429 status', async () => {
      const mockResponse = [{
        sourceKey: 'SYNPUF1K',
        sourceName: 'SYNPUF 1K',
        sourceDialect: 'postgresql',
        daimons: [],
        sourceId: 1,
        sourceConnection: 'connection string',
      }]

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

      const promise = webapi.fetchCDMSources()
      await vi.advanceTimersByTimeAsync(500)

      const sources = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(sources).toHaveLength(1)
      expect(sources[0]?.sourceKey).toBe('SYNPUF1K')
    })
  })

  describe('non-retryable errors - client errors', () => {
    it('should NOT retry on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const promise = webapi.fetchCDMSources()

      await expect(promise).rejects.toThrow('HTTP 400: Bad Request')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should NOT retry on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const promise = webapi.fetchCDMSources()

      await expect(promise).rejects.toThrow('HTTP 401: Unauthorized')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should NOT retry on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const promise = webapi.fetchCDMSources()

      await expect(promise).rejects.toThrow('HTTP 404: Not Found')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should NOT retry on 422 Unprocessable Entity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
      })

      const promise = webapi.fetchCDMSources()

      await expect(promise).rejects.toThrow('HTTP 422: Unprocessable Entity')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('mixed scenarios', () => {
    it('should handle mix of retryable and successful attempts', async () => {
      const mockResponse = [{
        sourceKey: 'SYNPUF1K',
        sourceName: 'SYNPUF 1K',
        sourceDialect: 'postgresql',
        daimons: [],
        sourceId: 1,
        sourceConnection: 'connection string',
      }]

      // Network error, then 502, then success
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          statusText: 'Bad Gateway',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        })

      const promise = webapi.fetchCDMSources()

      await vi.advanceTimersByTimeAsync(500)  // First retry
      await vi.advanceTimersByTimeAsync(1000) // Second retry

      const sources = await promise

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(sources).toHaveLength(1)
      expect(sources[0]?.sourceKey).toBe('SYNPUF1K')
    })

    it('should exhaust retries with different error types', async () => {
      // All retryable errors
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })

      // Catch the promise to prevent unhandled rejection
      const promise = webapi.fetchCDMSources().catch(err => err)

      await vi.advanceTimersByTimeAsync(500)  // First retry
      await vi.advanceTimersByTimeAsync(1000) // Second retry

      const result = await promise
      expect(result).toBeInstanceOf(Error)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('integration with other endpoints', () => {
    it('should apply retry logic to concept search', async () => {
      const mockConcepts = [
        {
          CONCEPT_ID: 201826,
          CONCEPT_NAME: 'Type 2 diabetes mellitus',
          DOMAIN_ID: 'Condition',
          VOCABULARY_ID: 'SNOMED',
          CONCEPT_CLASS_ID: 'Clinical Finding',
          CONCEPT_CODE: '44054006',
          STANDARD_CONCEPT: 'S',
          INVALID_REASON: null,
          VALID_START_DATE: '1970-01-01',
          VALID_END_DATE: '2099-12-31',
        }
      ]

      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockConcepts,
        })

      const promise = webapi.searchConcepts('SYNPUF1K', 'diabetes')

      await vi.advanceTimersByTimeAsync(500)

      const results = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(results).toHaveLength(1)
      expect(results[0]?.conceptName).toContain('diabetes')
    })

    it('should apply retry logic to cohort generation', async () => {
      const mockJob = {
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'SYNPUF1K',
        status: 'PENDING' as const,
        startTime: new Date().toISOString(),
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockJob,
        })

      const promise = webapi.generateCohort(123, 'SYNPUF1K')

      await vi.advanceTimersByTimeAsync(500)

      const job = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(job?.status).toBe('PENDING')
      expect(job?.cohortDefinitionId).toBe(123)
    })
  })

  describe('console logging', () => {
    it('should log retry attempts with delay information', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ([]),
        })

      const promise = webapi.fetchCDMSources()
      await vi.advanceTimersByTimeAsync(500)

      await promise

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebAPI] Network error (attempt 1/3), retrying in 500ms...'),
        expect.anything()
      )

      consoleSpy.mockRestore()
    })
  })
})
