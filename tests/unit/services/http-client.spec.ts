/**
 * Unit tests for src/services/http-client.ts error-body surfacing.
 *
 * #132: a bare "HTTP 500: Internal Server Error" doesn't say what actually
 * went wrong (e.g. a violated tag-group constraint). The server's response
 * body must be read and surfaced instead of being discarded.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFetch = vi.fn()

describe('services/http-client error surfacing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  it('surfaces the JSON error body message on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ message: 'Tag name already exists in this group' }),
    })

    const { httpClient } = await import('@/services/http-client')
    await expect(httpClient('/tag/', { method: 'POST', skipAuth: true })).rejects.toThrow(
      'HTTP 400: Tag name already exists in this group'
    )
  })

  it('surfaces a plain-text error body when it is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'mandatory tag group violated',
    })

    const { httpClient } = await import('@/services/http-client')
    await expect(httpClient('/tag/', { method: 'POST', skipAuth: true })).rejects.toThrow(
      'HTTP 400: mandatory tag group violated'
    )
  })

  it('falls back to statusText when the body cannot be read', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    })

    const { httpClient } = await import('@/services/http-client')
    await expect(httpClient('/tag/', { method: 'POST', skipAuth: true })).rejects.toThrow(
      'HTTP 400: Bad Request'
    )
  })

  it('preserves the HTTP status on the thrown error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: async () => 'no access to this source',
    })

    const { httpClient } = await import('@/services/http-client')
    const { ApiError } = await import('@/services/api-error')

    await expect(httpClient('/source/sources', { skipAuth: true })).rejects.toMatchObject({
      status: 403,
      body: 'no access to this source',
    })
    await expect(httpClient('/source/sources', { skipAuth: true })).rejects.toBeInstanceOf(ApiError)
  })
})
