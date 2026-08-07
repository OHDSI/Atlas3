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
