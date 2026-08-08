/**
 * A 500 on a write must not be re-sent: if WebAPI persisted the row before
 * failing, retrying creates duplicates.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFetch = vi.fn()

function serverError() {
  return {
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    text: async () => '',
  }
}

describe('services/http-client retry policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  it('does not retry a POST after a 500', async () => {
    mockFetch.mockResolvedValue(serverError())

    const { httpPost } = await import('@/services/http-client')
    await expect(
      httpPost('/conceptset', { name: 'x' }, { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow('HTTP 500')

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not retry a PUT after a 500', async () => {
    mockFetch.mockResolvedValue(serverError())

    const { httpPut } = await import('@/services/http-client')
    await expect(
      httpPut('/conceptset/1', { name: 'x' }, { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow('HTTP 500')

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not retry a DELETE after a 500', async () => {
    mockFetch.mockResolvedValue(serverError())

    const { httpDelete } = await import('@/services/http-client')
    await expect(
      httpDelete('/conceptset/1', { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow('HTTP 500')

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not retry a POST after a network TypeError', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    const { httpPost } = await import('@/services/http-client')
    await expect(
      httpPost('/conceptset', { name: 'x' }, { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow('Network error: Failed to fetch')

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('still retries a GET after a 500', async () => {
    mockFetch.mockResolvedValue(serverError())

    const { httpGet } = await import('@/services/http-client')
    await expect(
      httpGet('/source/sources', { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow('HTTP 500')

    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('still retries a GET after a network TypeError', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    const { httpGet } = await import('@/services/http-client')
    await expect(
      httpGet('/source/sources', { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow('Network error: Failed to fetch')

    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('retries a GET when no method is given (fetch defaults to GET)', async () => {
    mockFetch.mockResolvedValue(serverError())

    const { httpClient } = await import('@/services/http-client')
    await expect(
      httpClient('/source/sources', { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow('HTTP 500')

    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('retries a POST when the caller explicitly opts in', async () => {
    mockFetch.mockResolvedValue(serverError())

    const { httpPost } = await import('@/services/http-client')
    await expect(
      httpPost('/idempotent-thing', {}, {
        skipAuth: true,
        initialRetryDelay: 0,
        retryNonIdempotent: true,
      })
    ).rejects.toThrow('HTTP 500')

    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('retries httpPostRead, which is a read expressed as POST', async () => {
    mockFetch.mockResolvedValue(serverError())

    const { httpPostRead } = await import('@/services/http-client')
    await expect(
      httpPostRead('/vocabulary/SYNPUF1K/search', { QUERY: 'diabetes' }, {
        skipAuth: true,
        initialRetryDelay: 0,
      })
    ).rejects.toThrow('HTTP 500')

    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('sends httpPostRead as a POST with a JSON body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '[]' })

    const { httpPostRead } = await import('@/services/http-client')
    await httpPostRead('/vocabulary/SYNPUF1K/search', { QUERY: 'diabetes' }, { skipAuth: true })

    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"QUERY":"diabetes"}')
  })
})

// Ported from the deleted webapi-retry.spec.ts, which exercised this same
// status-code/backoff logic in httpClient only indirectly, through
// webapi.fetchCDMSources. Retried here directly against httpGet/httpClient
// so the coverage survives the barrel's removal.
describe('services/http-client status-code retry policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  it.each([500, 502, 503, 504, 429])('retries a GET on %i before succeeding', async (status) => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status, statusText: 'Error' })
      .mockResolvedValueOnce({ ok: true, text: async () => '[]' })

    const { httpGet } = await import('@/services/http-client')
    const result = await httpGet('/source/sources', { skipAuth: true, initialRetryDelay: 0 })

    expect(result).toEqual([])
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it.each([400, 401, 404, 422])('does not retry a GET on %i', async (status) => {
    mockFetch.mockResolvedValueOnce({ ok: false, status, statusText: 'Error', text: async () => '' })

    const { httpGet } = await import('@/services/http-client')
    await expect(
      httpGet('/source/sources', { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow(String(status))

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('gives up and surfaces the error after exhausting all retry attempts', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })

    const { httpGet } = await import('@/services/http-client')
    await expect(
      httpGet('/source/sources', { skipAuth: true, initialRetryDelay: 0 })
    ).rejects.toThrow('HTTP 500')

    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('retries through a mix of a network error and a 502 before succeeding', async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValueOnce({ ok: false, status: 502, statusText: 'Bad Gateway' })
      .mockResolvedValueOnce({ ok: true, text: async () => '[]' })

    const { httpGet } = await import('@/services/http-client')
    const result = await httpGet('/source/sources', { skipAuth: true, initialRetryDelay: 0 })

    expect(result).toEqual([])
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('uses exponential backoff delays between retries', async () => {
    vi.useFakeTimers()
    try {
      const delays: number[] = []
      let lastTime: number | null = null
      mockFetch.mockImplementation(() => {
        const now = Date.now()
        if (lastTime !== null) delays.push(now - lastTime)
        lastTime = now
        return Promise.resolve({ ok: false, status: 500, statusText: 'Internal Server Error' })
      })

      const { httpGet } = await import('@/services/http-client')
      const promise = httpGet('/source/sources', { skipAuth: true }).catch(() => {})

      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(500)
      await vi.advanceTimersByTimeAsync(1000)
      await promise

      expect(delays[0]).toBeGreaterThanOrEqual(500)
      expect(delays[0]).toBeLessThan(600)
      expect(delays[1]).toBeGreaterThanOrEqual(1000)
      expect(delays[1]).toBeLessThan(1100)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })

  it('logs each retry attempt with its delay', async () => {
    vi.useFakeTimers()
    try {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({ ok: true, text: async () => '[]' })

      const { httpGet } = await import('@/services/http-client')
      const promise = httpGet('/source/sources', { skipAuth: true })
      await vi.advanceTimersByTimeAsync(500)
      await promise

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HttpClient] Network error (attempt 1/3), retrying in 500ms...'),
        expect.anything()
      )
      consoleSpy.mockRestore()
    } finally {
      vi.useRealTimers()
    }
  })
})
