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

  it('leaves the body null when the server sent none', async () => {
    // A caller that substitutes its own wording has to be able to tell an
    // absent explanation from one that reads like the reason phrase.
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      text: async () => '',
    })

    const { httpClient } = await import('@/services/http-client')
    await expect(httpClient('/tag/', { method: 'POST', skipAuth: true })).rejects.toMatchObject({
      status: 422,
      message: 'HTTP 422: Unprocessable Entity',
      body: null,
    })
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

describe('services/http-client locale header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
    localStorage.clear()
  })

  it('sends the stored locale as the User-Language header', async () => {
    localStorage.setItem('locale', 'de')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    })

    const { httpClient } = await import('@/services/http-client')
    await httpClient('/source/sources', { skipAuth: true })

    const [, requestInit] = mockFetch.mock.calls[0]
    const headers = requestInit.headers as Headers
    expect(headers.get('User-Language')).toBe('de')
  })

  it('defaults to en when no locale is stored', async () => {
    localStorage.removeItem('locale')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify([]),
    })

    const { httpClient } = await import('@/services/http-client')
    await httpClient('/source/sources', { skipAuth: true })

    const [, requestInit] = mockFetch.mock.calls[0]
    const headers = requestInit.headers as Headers
    expect(headers.get('User-Language')).toBe('en')
  })
})
