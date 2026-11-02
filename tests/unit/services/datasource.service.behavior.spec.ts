import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ApiError } from '@/services/api-error'
import type { ReportType } from '@/models/datasource.types'

const authState = vi.hoisted(() => ({ token: null as string | null, throws: false }))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/config/app-config.loader', () => ({
  getAppConfig: () => ({ api: { url: 'https://api.test/WebAPI' } }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => {
    if (authState.throws) throw new Error('no pinia')
    return { token: authState.token }
  },
}))

vi.mock('@/utils/datasource-formatters', () => ({
  transformDashboardReport: vi.fn(data => data),
  transformClinicalDomainReport: vi.fn(data => ({ data, treemapData: [] })),
  transformDataDensityReport: vi.fn(data => data),
  transformPersonReport: vi.fn(data => data),
  transformObservationPeriodReport: vi.fn(data => data),
  transformDeathReport: vi.fn(data => data),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { logger } from '@/utils/logger'
import {
  listDataSources,
  getDashboardReport,
  getClinicalDomainReport,
} from '@/services/datasource.service'

const BASE = 'https://api.test/WebAPI'

function source(sourceId: number, sourceName: string) {
  return { sourceId, sourceName, sourceKey: `K${sourceId}`, sourceDialect: 'postgresql', daimons: [] }
}

function okJson(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) }
}

function httpError(status: number, text = 'body') {
  return { ok: false, status, text: () => Promise.resolve(text) }
}

function abortError(): Error {
  const error = new Error('The operation was aborted')
  error.name = 'AbortError'
  return error
}

function loggedSourcesError(): unknown {
  const call = vi
    .mocked(logger.error)
    .mock.calls.find(args => args[1] === 'Failed to fetch sources')
  return call?.[2]
}

async function settle(promise: Promise<unknown>): Promise<unknown> {
  const outcome = promise.then(
    () => undefined,
    (error: unknown) => error
  )
  await vi.runAllTimersAsync()
  return outcome
}

describe('datasource.service fetch behaviour', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.mocked(logger.error).mockClear()
    authState.token = null
    authState.throws = false
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('requests the configured base URL with JSON content type and an abort signal', async () => {
    mockFetch.mockResolvedValueOnce(okJson([]))

    await listDataSources()

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${BASE}/source/sources`)
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('adds a bearer token from the auth store', async () => {
    authState.token = 'tok-123'
    mockFetch.mockResolvedValueOnce(okJson([]))

    await listDataSources()

    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok-123',
    })
  })

  it('sends no Authorization header when the auth store is unavailable', async () => {
    authState.throws = true
    mockFetch.mockResolvedValueOnce(okJson([]))

    await expect(listDataSources()).resolves.toEqual([])

    const init = mockFetch.mock.calls[0]![1] as RequestInit
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
  })

  it('backs off 500ms then 1000ms between retries of a 5xx', async () => {
    mockFetch
      .mockResolvedValueOnce(httpError(503))
      .mockResolvedValueOnce(httpError(503))
      .mockResolvedValueOnce(okJson([]))

    const promise = listDataSources()
    await vi.advanceTimersByTimeAsync(499)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(999)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    await expect(promise).resolves.toEqual([])
  })

  it('gives up after three 5xx attempts with an ApiError carrying status and body', async () => {
    mockFetch.mockResolvedValue(httpError(500, 'Server exploded'))

    const error = await settle(listDataSources())

    expect(error).toEqual(new Error('Unable to load data sources. Please try again.'))
    expect(mockFetch).toHaveBeenCalledTimes(3)
    const cause = loggedSourcesError()
    expect(cause).toBeInstanceOf(ApiError)
    expect(cause).toMatchObject({
      message: 'HTTP 500: Server exploded',
      status: 500,
      body: 'Server exploded',
    })
  })

  it('uses "Unknown error" as the body when the error response text cannot be read', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.reject(new Error('stream closed')),
    })

    await settle(listDataSources())

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(loggedSourcesError()).toMatchObject({
      message: 'HTTP 400: Unknown error',
      status: 400,
      body: 'Unknown error',
    })
  })

  it('retries network failures with backoff and rethrows the last network error', async () => {
    const networkError = new TypeError('Failed to fetch')
    mockFetch.mockRejectedValue(networkError)

    const outcome = listDataSources().catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(499)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(999)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await outcome

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(loggedSourcesError()).toBe(networkError)
  })

  it('wraps a non-Error rejection as "Unknown error"', async () => {
    mockFetch.mockRejectedValue('boom')

    await settle(listDataSources())

    expect(mockFetch).toHaveBeenCalledTimes(3)
    const cause = loggedSourcesError()
    expect(cause).toBeInstanceOf(Error)
    expect((cause as Error).message).toBe('Unknown error')
  })

  it('reports an unparseable JSON body as "Invalid response format" after retrying', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.reject(new SyntaxError('bad')) })

    await settle(listDataSources())

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect((loggedSourcesError() as Error).message).toBe('Invalid response format')
    expect(logger.error).toHaveBeenCalledWith(
      'DataSource',
      'Failed to parse JSON response',
      expect.any(SyntaxError)
    )
  })

  it('does not retry an aborted request and rethrows the abort error', async () => {
    const aborted = abortError()
    mockFetch.mockRejectedValue(aborted)

    await settle(listDataSources())

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(loggedSourcesError()).toBe(aborted)
  })

  it('aborts the earlier in-flight request when the same endpoint is requested again', async () => {
    mockFetch.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(abortError()))
        })
    )
    mockFetch.mockResolvedValueOnce(okJson({}))

    const first = settle(getDashboardReport('SRC'))
    await vi.advanceTimersByTimeAsync(0)
    const firstSignal = (mockFetch.mock.calls[0]![1] as RequestInit).signal!
    expect(firstSignal.aborted).toBe(false)

    const second = settle(getDashboardReport('SRC'))
    await vi.advanceTimersByTimeAsync(0)

    expect(firstSignal.aborted).toBe(true)
    expect(await first).toEqual(new Error('Unable to load Dashboard report. Please try again.'))
    await second
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('listDataSources validation', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.mocked(logger.error).mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('drops sources that fail validation and keeps the valid ones', async () => {
    mockFetch.mockResolvedValueOnce(okJson([source(1, 'Valid'), { sourceId: -1, sourceName: '' }]))

    const result = await listDataSources()

    expect(result).toEqual([source(1, 'Valid')])
    expect(logger.error).toHaveBeenCalledWith(
      'DataSource',
      'Data source validation failed',
      expect.anything()
    )
  })

  it('fails when every returned source is invalid', async () => {
    mockFetch.mockResolvedValueOnce(okJson([{ sourceId: 0 }, { sourceName: 'x' }]))

    const error = await settle(listDataSources())

    expect(error).toEqual(new Error('Unable to load data sources. Please try again.'))
    expect((loggedSourcesError() as Error).message).toBe('All data sources failed validation')
  })

  it('returns sources sorted by name', async () => {
    mockFetch.mockResolvedValueOnce(
      okJson([source(1, 'Charlie'), source(2, 'alpha'), source(3, 'Bravo')])
    )

    const result = await listDataSources()

    expect(result.map(s => s.sourceName)).toEqual(['alpha', 'Bravo', 'Charlie'])
  })
})

describe('getDashboardReport validation', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects a report that does not match the dashboard schema', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ summary: { sourceName: 'S' } }))

    const error = await settle(getDashboardReport('SRC'))

    expect(error).toEqual(new Error('Unable to load Dashboard report. Please try again.'))
    expect(logger.error).toHaveBeenCalledWith(
      'DataSource',
      'Dashboard report validation failed',
      expect.anything()
    )
  })
})

describe('getClinicalDomainReport endpoint mapping', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it.each<[ReportType, string]>([
    ['conditionOccurrence', 'condition'],
    ['conditionEra', 'conditionera'],
    ['drugExposure', 'drug'],
    ['drugEra', 'drugera'],
    ['visit', 'visit'],
    ['measurement', 'measurement'],
    ['observation', 'observation'],
    ['procedure', 'procedure'],
  ])('requests %s from /cdmresults/SRC/%s', async (reportType, endpoint) => {
    mockFetch.mockResolvedValueOnce(okJson([]))

    await getClinicalDomainReport('SRC', reportType)

    expect(mockFetch).toHaveBeenCalledWith(`${BASE}/cdmresults/SRC/${endpoint}`, expect.any(Object))
  })
})
