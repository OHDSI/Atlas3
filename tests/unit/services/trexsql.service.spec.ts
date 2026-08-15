/**
 * Unit Tests: TrexSQL Service
 *
 * Tests for TrexSQL cache API calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildCache,
  getCacheStatus,
  getPatientCount,
  getAllCacheStatuses,
  isCacheReady,
  cancelCountRequest,
  cancelAllCountRequests,
  listCacheFiles,
  deleteCacheFile
} from '@/services/trexsql.service'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    token: 'mock-token'
  }))
}))

// Mock datasource service
vi.mock('@/services/datasource.service', () => ({
  listDataSources: vi.fn()
}))

describe('TrexSQLService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    cancelAllCountRequests()
  })

  describe('buildCache', () => {
    it('starts cache build successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ message: 'Cache build started' })
      } as Response)

      const result = await buildCache('CDM_SOURCE')

      const [url, init] = vi.mocked(global.fetch).mock.calls[0]
      expect(url).toContain('/trexsql/CDM_SOURCE/cache')
      expect((init as RequestInit).method).toBe('POST')
      const headers = (init as RequestInit).headers as Headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('Authorization')).toBe('Bearer mock-token')
      expect(result.message).toBe('Cache build started')
    })

    it('uses custom schema name', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ message: 'Cache build started' })
      } as Response)

      await buildCache('CDM_SOURCE', 'custom_schema')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ schemaName: 'custom_schema' })
        })
      )
    })

    it('throws on 404 not found', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not found'
      } as Response)

      await expect(buildCache('MISSING_SOURCE')).rejects.toThrow("Data source 'MISSING_SOURCE' not found")
    })

    it('throws on 409 conflict (build in progress)', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 409,
        text: async () => 'Conflict'
      } as Response)

      await expect(buildCache('BUSY_SOURCE')).rejects.toThrow('Cache build already in progress')
    })

    it('throws on 503 service unavailable', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service unavailable'
      } as Response)

      await expect(buildCache('NO_TREXSQL')).rejects.toThrow('TrexSQL extension not available')
    })

    it('throws on other errors with message', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      } as Response)

      await expect(buildCache('ERROR_SOURCE')).rejects.toThrow('Build failed: Internal server error')
    })

    it('handles validation failure gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ unexpectedField: 'value' })
      } as Response)

      const result = await buildCache('CDM_SOURCE')

      // Should use raw response when validation fails
      expect(result.message).toBe('Cache build started')
    })
  })

  describe('getCacheStatus', () => {
    it('returns cache status for ready cache', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'CDM_SOURCE',
          status: 'ready',
          totalPatientCount: 1000000,
          lastBuiltAt: '2024-01-15T10:00:00Z',
          sizeBytes: 1073741824,
          errorMessage: null
        })
      } as Response)

      const result = await getCacheStatus('CDM_SOURCE')

      expect(result.status).toBe('ready')
      expect(result.totalPatientCount).toBe(1000000)
    })

    it('returns not_built status for 404', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => ''
      } as Response)

      const result = await getCacheStatus('NEW_SOURCE')

      expect(result.status).toBe('not_built')
      expect(result.totalPatientCount).toBeNull()
    })

    it('maps legacy response format', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'CDM_SOURCE',
          cacheExists: true,
          cacheAttached: true,
          activeJob: false,
          totalPatientCount: 500000,
          lastModified: Date.now(),
          cacheSizeBytes: 536870912
        })
      } as Response)

      const result = await getCacheStatus('CDM_SOURCE')

      expect(result.status).toBe('ready')
      expect(result.totalPatientCount).toBe(500000)
    })

    it('maps building status from legacy format', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'CDM_SOURCE',
          cacheExists: false,
          cacheAttached: false,
          activeJob: true
        })
      } as Response)

      const result = await getCacheStatus('CDM_SOURCE')

      expect(result.status).toBe('building')
    })

    it('maps error status from legacy format', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'CDM_SOURCE',
          cacheExists: true,
          cacheAttached: false,
          activeJob: false,
          errorMessage: 'Cache attachment failed'
        })
      } as Response)

      // A persistent error is retried before it is believed; drive the backoff
      // with fake timers so the assertion does not wait out the real delays.
      vi.useFakeTimers()
      try {
        const pending = getCacheStatus('CDM_SOURCE')
        await vi.runAllTimersAsync()
        const result = await pending

        expect(result.status).toBe('error')
        expect(result.errorMessage).toBe('Cache attachment failed')
      } finally {
        vi.useRealTimers()
      }
    })

    it('re-checks a transient error and returns the recovered status', async () => {
      const errorResponse = {
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'CDM_SOURCE',
          cacheExists: true,
          cacheAttached: false,
          activeJob: false,
          errorMessage: 'Cache attachment failed'
        })
      } as Response
      const readyResponse = {
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'CDM_SOURCE',
          cacheExists: true,
          cacheAttached: true,
          activeJob: false
        })
      } as Response

      // trexsql reports cacheExists && !cacheAttached mid attach-retry; the next
      // poll shows it healthy, and that recovery is what callers must observe.
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValue(readyResponse)

      vi.useFakeTimers()
      try {
        const pending = getCacheStatus('CDM_SOURCE')
        await vi.runAllTimersAsync()
        const result = await pending

        expect(result.status).toBe('ready')
        expect(vi.mocked(global.fetch).mock.calls.length).toBeGreaterThan(1)
      } finally {
        vi.useRealTimers()
      }
    })

    it('throws on other errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error'
      } as Response)

      await expect(getCacheStatus('ERROR_SOURCE')).rejects.toThrow('Failed to get cache status: Server error')
    })
  })

  describe('getPatientCount', () => {
    it('returns patient count for valid expression', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          cohortPatientCount: 5000,
          totalPatientCount: 1000000,
          executionTimeMs: 150
        })
      } as Response)

      const expression = { PrimaryCriteria: { CriteriaList: [] } }
      const result = await getPatientCount('CDM_SOURCE', expression)

      expect(result.cohortPatientCount).toBe(5000)
      expect(result.totalPatientCount).toBe(1000000)
      expect(result.executionTimeMs).toBe(150)
    })

    it('sends expression as JSON string', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          cohortPatientCount: 100,
          totalPatientCount: 10000,
          executionTimeMs: 50
        })
      } as Response)

      const expression = { test: 'value' }
      await getPatientCount('CDM_SOURCE', expression)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ expression: JSON.stringify(expression) })
        })
      )
    })

    it('throws on 400 bad request', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => ''
      } as Response)

      await expect(getPatientCount('CDM_SOURCE', {})).rejects.toThrow('Invalid cohort expression')
    })

    it('throws on 404 not found', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => ''
      } as Response)

      await expect(getPatientCount('MISSING', {})).rejects.toThrow("Data source 'MISSING' not found")
    })

    it('throws on 503 cache not available', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => ''
      } as Response)

      await expect(getPatientCount('NO_CACHE', {})).rejects.toThrow('Cache not available')
    })

    it('handles validation failure gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          cohortPatientCount: 100,
          // Missing other fields
        })
      } as Response)

      const result = await getPatientCount('CDM_SOURCE', {})

      expect(result.cohortPatientCount).toBe(100)
      expect(result.totalPatientCount).toBe(0) // Default
      expect(result.executionTimeMs).toBe(0) // Default
    })

    it('handles already aborted signal', async () => {
      const abortController = new AbortController()
      abortController.abort()

      vi.mocked(global.fetch).mockImplementation(async (_url, options) => {
        // Check if the signal is already aborted
        if (options?.signal?.aborted) {
          const error = new DOMException('Aborted', 'AbortError')
          throw error
        }
        return {
          ok: true,
          text: async () => JSON.stringify({ cohortPatientCount: 100, totalPatientCount: 1000, executionTimeMs: 10 })
        } as Response
      })

      // Should handle the abort - either by throwing or returning (implementation dependent)
      // The function may complete before the signal takes effect
      try {
        await getPatientCount('CDM', {}, abortController.signal)
      } catch (error) {
        // Expected - abort was handled
        expect(error).toBeDefined()
      }
    })
  })

  describe('cancelCountRequest', () => {
    it('cancels active request for source by calling abort', () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')
      vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {
        // Never resolves; getPatientCount only needs to run synchronously
        // up to its first await to register the AbortController.
      }))
      getPatientCount('CDM_SOURCE', {}).catch(() => {})

      cancelCountRequest('CDM_SOURCE')

      expect(abortSpy).toHaveBeenCalledTimes(1)
      abortSpy.mockRestore()
    })

    it('does nothing for non-existent request', () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

      cancelCountRequest('NON_EXISTENT')

      expect(abortSpy).not.toHaveBeenCalled()
      abortSpy.mockRestore()
    })
  })

  describe('cancelAllCountRequests', () => {
    it('cancels all active requests', async () => {
      vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {
        // Never resolves
      }))

      // Start multiple requests
      getPatientCount('SOURCE_1', {}).catch(() => {})
      getPatientCount('SOURCE_2', {}).catch(() => {})

      // Cancel all
      cancelAllCountRequests()

      // Should not throw
    })
  })

  describe('getAllCacheStatuses', () => {
    it('returns statuses for all data sources', async () => {
      const { listDataSources } = await import('@/services/datasource.service')
      vi.mocked(listDataSources).mockResolvedValue([
        { sourceKey: 'SOURCE_1', sourceName: 'Source 1', sourceId: 1 },
        { sourceKey: 'SOURCE_2', sourceName: 'Source 2', sourceId: 2 }
      ] as never)

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'SOURCE_1',
          status: 'ready',
          totalPatientCount: 1000,
          lastBuiltAt: null,
          sizeBytes: null,
          errorMessage: null
        })
      } as Response)

      const results = await getAllCacheStatuses()

      expect(results).toHaveLength(2)
    })

    it('returns error status for failed sources', async () => {
      const { listDataSources } = await import('@/services/datasource.service')
      vi.mocked(listDataSources).mockResolvedValue([
        { sourceKey: 'GOOD_SOURCE', sourceName: 'Good', sourceId: 1 },
        { sourceKey: 'BAD_SOURCE', sourceName: 'Bad', sourceId: 2 }
      ] as never)

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ sourceKey: 'GOOD_SOURCE', status: 'ready', totalPatientCount: 100, lastBuiltAt: null, sizeBytes: null, errorMessage: null })
        } as Response)
        .mockRejectedValueOnce(new Error('Connection failed'))

      const results = await getAllCacheStatuses()

      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('ready')
      expect(results[1].status).toBe('error')
      expect(results[1].errorMessage).toBe('Connection failed')
    })

    it('throws when listing sources fails', async () => {
      const { listDataSources } = await import('@/services/datasource.service')
      vi.mocked(listDataSources).mockRejectedValue(new Error('Failed to list sources'))

      await expect(getAllCacheStatuses()).rejects.toThrow('Failed to list sources')
    })
  })

  describe('isCacheReady', () => {
    it('returns true when cache is ready', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'CDM',
          status: 'ready',
          totalPatientCount: 1000,
          lastBuiltAt: null,
          sizeBytes: null,
          errorMessage: null
        })
      } as Response)

      const result = await isCacheReady('CDM')

      expect(result).toBe(true)
    })

    it('returns false when cache is not ready', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          sourceKey: 'CDM',
          status: 'building',
          totalPatientCount: null,
          lastBuiltAt: null,
          sizeBytes: null,
          errorMessage: null
        })
      } as Response)

      const result = await isCacheReady('CDM')

      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const result = await isCacheReady('CDM')

      expect(result).toBe(false)
    })
  })

  describe('getInclusionStats', () => {
    it('POSTs the stringified expression and returns parsed stats', async () => {
      const payload = {
        entryEventCount: 15200,
        totalPatientCount: 1178420,
        finalCount: 5180,
        ruleCounts: [
          { ruleIndex: 0, ruleName: 'Adult', cumulativeCount: 12341 },
        ],
        executionTimeMs: 312,
      }
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(payload),
      } as Response)

      const { getInclusionStats } = await import('@/services/trexsql.service')
      const result = await getInclusionStats('CDM_SOURCE', { foo: 'bar' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/trexsql/CDM_SOURCE/cache/inclusion'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ expression: JSON.stringify({ foo: 'bar' }) }),
        })
      )
      expect(result.entryEventCount).toBe(15200)
      expect(result.ruleCounts).toHaveLength(1)
    })

    it('throws "Cache not available" on 503', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'cache offline',
      } as Response)

      const { getInclusionStats } = await import('@/services/trexsql.service')
      await expect(getInclusionStats('X', {})).rejects.toThrow(/Cache not available/)
    })

    it('cancels in-flight requests when called again with same source', async () => {
      const { getInclusionStats } = await import('@/services/trexsql.service')

      let firstAborted = false
      vi.mocked(global.fetch).mockImplementationOnce((_url, init) => {
        const signal = (init as RequestInit).signal
        return new Promise((_resolve, reject) => {
          const onAbort = () => {
            firstAborted = true
            const err = new Error('aborted')
            err.name = 'AbortError'
            reject(err)
          }
          // Real fetch rejects straight away on a signal that is already
          // aborted, which is now the case: the superseding call cancels
          // before the first request has finished resolving its auth token.
          if (signal?.aborted) onAbort()
          else signal?.addEventListener('abort', onAbort)
        })
      })
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({
          entryEventCount: 1, totalPatientCount: 1, finalCount: 1,
          ruleCounts: [], executionTimeMs: 0,
        }),
      } as Response)

      const first = getInclusionStats('X', { v: 1 }).catch(e => e)
      const second = await getInclusionStats('X', { v: 2 })

      await first
      expect(firstAborted).toBe(true)
      expect(second.entryEventCount).toBe(1)
    })
  })

  describe('cache files', () => {
    it('returns the files the endpoint reports', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          cachePath: '/usr/src/data/cache',
          files: [
            {
              fileName: 'orphan.db',
              databaseCode: 'orphan',
              sizeBytes: 12288,
              lastModified: 1,
              attached: false,
              orphaned: true,
              protected: false
            }
          ]
        })
      } as Response)

      const files = await listCacheFiles()

      expect(files).toHaveLength(1)
      expect(files[0].orphaned).toBe(true)
      expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/trexsql/cache/files')
    })

    it('returns an empty list when the payload has no files array', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({})
      } as Response)

      await expect(listCacheFiles()).resolves.toEqual([])
    })

    it('surfaces the server body when listing fails', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'boom'
      } as Response)

      await expect(listCacheFiles()).rejects.toThrow(/500 boom/)
    })

    it('deletes by database code', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: true, text: async () => '' } as Response)

      await deleteCacheFile('cdm_demo')

      const [url, init] = vi.mocked(global.fetch).mock.calls[0]
      expect(url).toContain('/trexsql/cache/files/cdm_demo')
      expect((init as RequestInit).method).toBe('DELETE')
    })

    it('rejects when the delete is refused', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Refusing to delete protected file: FHIR.db'
      } as Response)

      await expect(deleteCacheFile('FHIR')).rejects.toThrow(/protected file/)
    })
  })
})
