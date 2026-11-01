import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildCache,
  getCacheStatus,
  getPatientCount,
  getInclusionStats,
  getAllCacheStatuses,
  cancelCountRequest,
  cancelAllCountRequests,
  listCacheFiles,
  deleteCacheFile,
} from '@/services/trexsql.service'
import { getAppConfig } from '@/config/app-config.loader'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/utils/logger'
import { listDataSources } from '@/services/datasource.service'

vi.mock('@/composables/useI18n', async () => (await import('../../helpers/i18n-mock')).mockUseI18n)
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ token: 'tok' })),
}))
vi.mock('@/services/datasource.service', () => ({
  listDataSources: vi.fn(),
}))

const JSON_AUTH_HEADERS = { 'Content-Type': 'application/json', Authorization: 'Bearer tok' }

function base(): string {
  return getAppConfig().api.url
}

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response
}

function errorResponse(status: number, init: Partial<Response> = {}): Response {
  return { ok: false, status, ...init } as Response
}

function rejectingText(status: number): Response {
  return errorResponse(status, { text: () => Promise.reject(new Error('stream')) })
}

function fetchMock() {
  return vi.mocked(global.fetch)
}

async function statusWithTimers(sourceKey: string) {
  vi.useFakeTimers()
  try {
    const pending = getCacheStatus(sourceKey)
    await vi.runAllTimersAsync()
    return await pending
  } finally {
    vi.useRealTimers()
  }
}

function abortError(): Error {
  const err = new Error('aborted')
  err.name = 'AbortError'
  return err
}

describe('trexsql.service request and response contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    cancelAllCountRequests()
  })

  describe('buildCache', () => {
    it('POSTs to the cache endpoint with the lower-cased source key as default schema', async () => {
      fetchMock().mockResolvedValue(jsonResponse({ message: 'ok', estimatedTimeSeconds: 5 }))

      const result = await buildCache('CDM_Source')

      expect(fetchMock()).toHaveBeenCalledWith(`${base()}/trexsql/CDM_Source/cache`, {
        method: 'POST',
        headers: JSON_AUTH_HEADERS,
        body: JSON.stringify({ schemaName: 'cdm_source' }),
      })
      expect(result).toEqual({ message: 'ok', estimatedTimeSeconds: 5 })
    })

    it('omits the Authorization header when there is no token', async () => {
      vi.mocked(useAuthStore).mockReturnValueOnce({ token: null } as unknown as ReturnType<typeof useAuthStore>)
      fetchMock().mockResolvedValue(jsonResponse({ message: 'ok' }))

      await buildCache('S')

      expect(fetchMock().mock.calls[0]?.[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
    })

    it('proceeds without auth when the auth store cannot be used', async () => {
      vi.mocked(useAuthStore).mockImplementationOnce(() => {
        throw new Error('no pinia')
      })
      fetchMock().mockResolvedValue(jsonResponse({ message: 'ok' }))

      await expect(buildCache('S')).resolves.toEqual({ message: 'ok' })
      expect(fetchMock().mock.calls[0]?.[1]?.headers).toEqual({ 'Content-Type': 'application/json' })
    })

    it('uses the raw message when the response fails validation', async () => {
      fetchMock().mockResolvedValue(jsonResponse({ message: 'queued', estimatedTimeSeconds: -1 }))

      await expect(buildCache('S')).resolves.toEqual({ message: 'queued' })
    })

    it('falls back to the unknown-error detail when the body cannot be read', async () => {
      fetchMock().mockResolvedValue(rejectingText(500))

      await expect(buildCache('S')).rejects.toThrow(/^Build failed: Unknown error$/)
    })
  })

  describe('getCacheStatus', () => {
    it('GETs the status endpoint with JSON and auth headers', async () => {
      const payload = {
        sourceKey: 'S',
        status: 'ready',
        totalPatientCount: 3,
        lastBuiltAt: null,
        sizeBytes: 7,
        errorMessage: null,
      }
      fetchMock().mockResolvedValue(jsonResponse(payload))

      const result = await getCacheStatus('S')

      expect(fetchMock()).toHaveBeenCalledWith(`${base()}/trexsql/S/cache/status`, {
        method: 'GET',
        headers: JSON_AUTH_HEADERS,
      })
      expect(result).toEqual(payload)
    })

    it('returns a full not_built status on 404', async () => {
      fetchMock().mockResolvedValue(errorResponse(404))

      await expect(getCacheStatus('NEW')).resolves.toEqual({
        sourceKey: 'NEW',
        status: 'not_built',
        totalPatientCount: null,
        lastBuiltAt: null,
        sizeBytes: null,
        errorMessage: null,
      })
    })

    it('falls back to the unknown-error detail when the body cannot be read', async () => {
      fetchMock().mockResolvedValue(rejectingText(500))

      await expect(getCacheStatus('S')).rejects.toThrow(/^Failed to get cache status: Unknown error$/)
    })

    it('maps every field of the legacy response', async () => {
      const lastModified = Date.UTC(2024, 0, 2, 3, 4, 5)
      fetchMock().mockResolvedValue(
        jsonResponse({
          sourceKey: 'FROM_SERVER',
          cacheExists: true,
          cacheAttached: true,
          activeJob: false,
          totalPatientCount: 42,
          lastModified,
          cacheSizeBytes: 1024,
          errorMessage: 'note',
        })
      )

      await expect(getCacheStatus('ARG')).resolves.toEqual({
        sourceKey: 'FROM_SERVER',
        status: 'ready',
        totalPatientCount: 42,
        lastBuiltAt: '2024-01-02T03:04:05.000Z',
        sizeBytes: 1024,
        errorMessage: 'note',
      })
    })

    it('nulls legacy fields of the wrong type and falls back to the requested source key', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({
          cacheExists: false,
          cacheAttached: false,
          activeJob: false,
          totalPatientCount: '42',
          lastModified: '1700000000000',
          cacheSizeBytes: '1024',
          errorMessage: 5,
        })
      )

      await expect(statusWithTimers('ARG')).resolves.toEqual({
        sourceKey: 'ARG',
        status: 'not_built',
        totalPatientCount: null,
        lastBuiltAt: null,
        sizeBytes: null,
        errorMessage: null,
      })
    })

    it.each([0, -5])('treats lastModified %s as never built', async lastModified => {
      fetchMock().mockResolvedValue(
        jsonResponse({ sourceKey: 'S', cacheExists: true, cacheAttached: true, lastModified })
      )

      const result = await getCacheStatus('S')

      expect(result.lastBuiltAt).toBeNull()
    })

    it('reports an attached-but-missing cache as not built, not as an error', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ sourceKey: 'S', cacheExists: false, cacheAttached: true, activeJob: false })
      )

      const result = await statusWithTimers('S')

      expect(result.status).toBe('not_built')
      expect(fetchMock()).toHaveBeenCalledTimes(1)
    })

    it('re-checks a persistent error exactly five times before returning it', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ sourceKey: 'S', cacheExists: true, cacheAttached: false, activeJob: false })
      )

      const result = await statusWithTimers('S')

      expect(result.status).toBe('error')
      expect(fetchMock()).toHaveBeenCalledTimes(6)
    })
  })

  describe('getPatientCount', () => {
    it('POSTs the stringified expression with auth headers and an abort signal', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ cohortPatientCount: 1, totalPatientCount: 2, executionTimeMs: 3 })
      )

      await getPatientCount('S', { a: 1 })

      expect(fetchMock()).toHaveBeenCalledWith(`${base()}/trexsql/S/cache/count`, {
        method: 'POST',
        headers: JSON_AUTH_HEADERS,
        body: JSON.stringify({ expression: JSON.stringify({ a: 1 }) }),
        signal: expect.any(AbortSignal),
      })
    })

    it('returns only the schema fields of a valid response', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ cohortPatientCount: 1, totalPatientCount: 2, executionTimeMs: 3, extra: true })
      )

      await expect(getPatientCount('S', {})).resolves.toEqual({
        cohortPatientCount: 1,
        totalPatientCount: 2,
        executionTimeMs: 3,
      })
    })

    it('passes through raw values when the count exceeds the total', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ cohortPatientCount: 9, totalPatientCount: 2, executionTimeMs: 3 })
      )

      await expect(getPatientCount('S', {})).resolves.toEqual({
        cohortPatientCount: 9,
        totalPatientCount: 2,
        executionTimeMs: 3,
      })
    })

    it('defaults missing fields to zero', async () => {
      fetchMock().mockResolvedValue(jsonResponse({ cohortPatientCount: null }))

      await expect(getPatientCount('S', {})).resolves.toEqual({
        cohortPatientCount: 0,
        totalPatientCount: 0,
        executionTimeMs: 0,
      })
    })

    it('surfaces the circe message verbatim on 422 as an InvalidExpressionError', async () => {
      fetchMock().mockResolvedValue(
        errorResponse(422, { json: async () => ({ message: 'Inclusion rule 2 has no window' }) })
      )

      await expect(getPatientCount('S', {})).rejects.toMatchObject({
        name: 'InvalidExpressionError',
        message: 'Inclusion rule 2 has no window',
      })
    })

    it.each([
      ['an unreadable body', () => Promise.reject(new Error('bad json'))],
      ['a non-string message', async () => ({ message: 42 })],
      ['an empty message', async () => ({ message: '' })],
      ['a null body', async () => null],
    ])('uses the incomplete-expression text on 422 with %s', async (_label, json) => {
      fetchMock().mockResolvedValue(errorResponse(422, { json } as Partial<Response>))

      await expect(getPatientCount('S', {})).rejects.toMatchObject({
        name: 'InvalidExpressionError',
        message: 'The cohort expression is incomplete or invalid.',
      })
    })

    it('reports other failures with the server body', async () => {
      fetchMock().mockResolvedValue(errorResponse(500, { text: async () => 'boom' }))

      await expect(getPatientCount('S', {})).rejects.toThrow(/^Count failed: boom$/)
    })

    it('reports other failures with the unknown-error detail when the body cannot be read', async () => {
      fetchMock().mockResolvedValue(rejectingText(500))

      await expect(getPatientCount('S', {})).rejects.toThrow(/^Count failed: Unknown error$/)
    })

    it('rethrows aborts without logging them as failures', async () => {
      fetchMock().mockRejectedValue(abortError())

      await expect(getPatientCount('S', {})).rejects.toMatchObject({ name: 'AbortError' })
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('logs non-abort failures', async () => {
      fetchMock().mockRejectedValue(new Error('net'))

      await expect(getPatientCount('S', {})).rejects.toThrow('net')
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('forwards an abort of the caller signal to the request', async () => {
      let requestSignal: AbortSignal | undefined
      fetchMock().mockImplementation((_url, init) => {
        requestSignal = (init as RequestInit).signal ?? undefined
        return new Promise(() => {})
      })
      const outer = new AbortController()

      void getPatientCount('S', {}, outer.signal).catch(() => {})
      await vi.waitFor(() => expect(requestSignal).toBeDefined())
      outer.abort()

      expect(requestSignal?.aborted).toBe(true)
    })

    it('forgets the request once it settles', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ cohortPatientCount: 1, totalPatientCount: 2, executionTimeMs: 3 })
      )
      await getPatientCount('S', {})
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

      cancelCountRequest('S')

      expect(abortSpy).not.toHaveBeenCalled()
      abortSpy.mockRestore()
    })
  })

  describe('cancelAllCountRequests', () => {
    it('aborts every in-flight count request', async () => {
      const signals: AbortSignal[] = []
      fetchMock().mockImplementation((_url, init) => {
        signals.push((init as RequestInit).signal as AbortSignal)
        return new Promise(() => {})
      })

      void getPatientCount('A', {}).catch(() => {})
      void getPatientCount('B', {}).catch(() => {})
      await vi.waitFor(() => expect(signals).toHaveLength(2))
      cancelAllCountRequests()

      expect(signals.map(s => s.aborted)).toEqual([true, true])
    })
  })

  describe('getInclusionStats', () => {
    it('POSTs with JSON and auth headers and an abort signal', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ entryEventCount: 1, totalPatientCount: 1, finalCount: 1, ruleCounts: [], executionTimeMs: 0 })
      )

      await getInclusionStats('S', { a: 1 })

      expect(fetchMock()).toHaveBeenCalledWith(`${base()}/trexsql/S/cache/inclusion`, {
        method: 'POST',
        headers: JSON_AUTH_HEADERS,
        body: JSON.stringify({ expression: JSON.stringify({ a: 1 }) }),
        signal: expect.any(AbortSignal),
      })
    })

    it('returns only the schema fields of a valid response', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({
          entryEventCount: 5,
          totalPatientCount: 6,
          finalCount: 4,
          ruleCounts: [{ ruleIndex: 0, ruleName: 'r', cumulativeCount: 4 }],
          executionTimeMs: 7,
          extra: 'x',
        })
      )

      await expect(getInclusionStats('S', {})).resolves.toEqual({
        entryEventCount: 5,
        totalPatientCount: 6,
        finalCount: 4,
        ruleCounts: [{ ruleIndex: 0, ruleName: 'r', cumulativeCount: 4 }],
        executionTimeMs: 7,
      })
    })

    it('coerces an invalid response into numbers with zero defaults', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ entryEventCount: '12', totalPatientCount: null, ruleCounts: 'nope' })
      )

      await expect(getInclusionStats('S', {})).resolves.toEqual({
        entryEventCount: 12,
        totalPatientCount: 0,
        finalCount: 0,
        ruleCounts: [],
        executionTimeMs: 0,
      })
    })

    it('keeps a rule counts array from an otherwise invalid response', async () => {
      const ruleCounts = [{ ruleIndex: 0 }]
      fetchMock().mockResolvedValue(
        jsonResponse({ entryEventCount: 3, totalPatientCount: 4, finalCount: 2, ruleCounts, executionTimeMs: 9 })
      )

      await expect(getInclusionStats('S', {})).resolves.toEqual({
        entryEventCount: 3,
        totalPatientCount: 4,
        finalCount: 2,
        ruleCounts,
        executionTimeMs: 9,
      })
    })

    it.each([
      [400, 'Invalid cohort expression'],
      [404, "Data source 'S' not found"],
      [503, 'Cache not available. Please build the cache first.'],
    ])('maps status %s to its message', async (status, message) => {
      fetchMock().mockResolvedValue(errorResponse(status, { text: async () => 'body' }))

      await expect(getInclusionStats('S', {})).rejects.toThrow(new RegExp(`^${message.replace(/[.]/g, '\\.')}$`))
    })

    it('surfaces the circe message verbatim on 422 as an InvalidExpressionError', async () => {
      fetchMock().mockResolvedValue(errorResponse(422, { json: async () => ({ message: 'rule 1 broken' }) }))

      await expect(getInclusionStats('S', {})).rejects.toMatchObject({
        name: 'InvalidExpressionError',
        message: 'rule 1 broken',
      })
    })

    it.each([
      ['an unreadable body', () => Promise.reject(new Error('bad json'))],
      ['a non-string message', async () => ({ message: 42 })],
      ['an empty message', async () => ({ message: '' })],
      ['a null body', async () => null],
    ])('uses the incomplete-expression text on 422 with %s', async (_label, json) => {
      fetchMock().mockResolvedValue(errorResponse(422, { json } as Partial<Response>))

      await expect(getInclusionStats('S', {})).rejects.toMatchObject({
        name: 'InvalidExpressionError',
        message: 'The cohort expression is incomplete or invalid.',
      })
    })

    it('reports other failures with the server body', async () => {
      fetchMock().mockResolvedValue(errorResponse(500, { text: async () => 'boom' }))

      await expect(getInclusionStats('S', {})).rejects.toThrow(/^Inclusion stats failed: boom$/)
    })

    it('reports other failures with the unknown-error detail when the body cannot be read', async () => {
      fetchMock().mockResolvedValue(rejectingText(500))

      await expect(getInclusionStats('S', {})).rejects.toThrow(/^Inclusion stats failed: Unknown error$/)
    })

    it('rethrows aborts without logging them as failures', async () => {
      fetchMock().mockRejectedValue(abortError())

      await expect(getInclusionStats('S', {})).rejects.toMatchObject({ name: 'AbortError' })
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('logs non-abort failures', async () => {
      fetchMock().mockRejectedValue(new Error('net'))

      await expect(getInclusionStats('S', {})).rejects.toThrow('net')
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('forwards an abort of the caller signal to the request', async () => {
      let requestSignal: AbortSignal | undefined
      fetchMock().mockImplementation((_url, init) => {
        requestSignal = (init as RequestInit).signal ?? undefined
        return new Promise(() => {})
      })
      const outer = new AbortController()

      void getInclusionStats('S', {}, outer.signal).catch(() => {})
      await vi.waitFor(() => expect(requestSignal).toBeDefined())
      outer.abort()

      expect(requestSignal?.aborted).toBe(true)
    })

    it('forgets the request once it settles', async () => {
      fetchMock().mockResolvedValue(
        jsonResponse({ entryEventCount: 1, totalPatientCount: 1, finalCount: 1, ruleCounts: [], executionTimeMs: 0 })
      )
      await getInclusionStats('S', {})
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort')

      cancelCountRequest('S')

      expect(abortSpy).not.toHaveBeenCalled()
      abortSpy.mockRestore()
    })
  })

  describe('cache files', () => {
    it('GETs the file list with JSON and auth headers', async () => {
      fetchMock().mockResolvedValue(jsonResponse({ files: [] }))

      await listCacheFiles()

      expect(fetchMock()).toHaveBeenCalledWith(`${base()}/trexsql/cache/files`, {
        method: 'GET',
        headers: JSON_AUTH_HEADERS,
      })
    })

    it('reports a list failure with only the status when the body cannot be read', async () => {
      fetchMock().mockResolvedValue(rejectingText(502))

      await expect(listCacheFiles()).rejects.toThrow(/^Failed to list cache files: 502$/)
    })

    it('DELETEs the url-encoded database code with JSON and auth headers', async () => {
      fetchMock().mockResolvedValue({ ok: true } as Response)

      await deleteCacheFile('a/b c')

      expect(fetchMock()).toHaveBeenCalledWith(`${base()}/trexsql/cache/files/a%2Fb%20c`, {
        method: 'DELETE',
        headers: JSON_AUTH_HEADERS,
      })
    })

    it('reports a delete failure with only the status when the body cannot be read', async () => {
      fetchMock().mockResolvedValue(rejectingText(500))

      await expect(deleteCacheFile('x')).rejects.toThrow(/^Failed to delete cache: 500$/)
    })
  })

  describe('getAllCacheStatuses', () => {
    it('reports a non-Error failure as an unknown error status', async () => {
      vi.mocked(listDataSources).mockResolvedValue([{ sourceKey: 'S' }] as never)
      fetchMock().mockRejectedValue('offline')

      await expect(getAllCacheStatuses()).resolves.toEqual([
        {
          sourceKey: 'S',
          status: 'error',
          totalPatientCount: null,
          lastBuiltAt: null,
          sizeBytes: null,
          errorMessage: 'Unknown error',
        },
      ])
    })
  })
})
