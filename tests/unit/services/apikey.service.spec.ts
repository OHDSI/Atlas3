/**
 * Unit Tests: API Key Service
 * Covers happy-path and failure flows for /user/apikeys.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { logger } from '@/utils/logger'
import { listApiKeys, createApiKey, revokeApiKey, deleteApiKey } from '@/services/apikey.service'

describe('services/apikey.service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  function ok(body: unknown) {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(body) })
  }

  function fail(status: number, text = 'error') {
    mockFetch.mockResolvedValueOnce({ ok: false, status, statusText: text, text: async () => text })
  }

  describe('listApiKeys', () => {
    it('returns the parsed list', async () => {
      ok([
        {
          name: 'laptop',
          description: null,
          keyIdentifier: 'abc123',
          createdAt: 1700000000,
          expiresAt: null,
          disabled: false,
          lastUsedAt: null,
        },
      ])

      const result = await listApiKeys()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].keyIdentifier).toBe('abc123')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/user/apikeys')
      expect(options.method).toBe('GET')
    })

    it('reports a parse failure as ApiResult rather than throwing', async () => {
      ok([{ name: 'oops' }])

      const result = await listApiKeys()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Invalid API key list response format')
      } else {
        expect.fail('expected failure')
      }
    })
  })

  describe('createApiKey', () => {
    it('posts the request body and returns the raw key result', async () => {
      ok({
        name: 'laptop',
        keyIdentifier: 'abc123',
        rawKey: 'wa_abc123_secret',
        createdAt: 1700000000,
        expiresAt: null,
      })

      const result = await createApiKey({ name: 'laptop', expiresInDays: null })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rawKey).toBe('wa_abc123_secret')
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/user/apikeys')
      expect(options.method).toBe('POST')
      expect(JSON.parse(options.body)).toEqual({ name: 'laptop', expiresInDays: null })
    })

    it('surfaces a server error as ApiResult failure', async () => {
      fail(400, 'name is required')

      const result = await createApiKey({ name: '' })

      expect(result.success).toBe(false)
    })

    it('reports a parse failure with the create-specific message', async () => {
      ok({ rawKey: 'wa_abc123_secret' })

      const result = await createApiKey({ name: 'laptop' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Invalid API key creation response format')
      } else {
        expect.fail('expected failure')
      }
      expect(logger.error).toHaveBeenCalledWith('ApiKeyService', expect.any(String), expect.anything())
    })
  })

  describe('revokeApiKey', () => {
    it('sends a DELETE without the remove flag', async () => {
      ok(undefined)

      const result = await revokeApiKey('abc123')

      expect(result.success).toBe(true)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain('/user/apikeys/abc123')
      expect(url).not.toContain('remove')
      expect(options.method).toBe('DELETE')
    })
  })

  describe('deleteApiKey', () => {
    it('sends a DELETE with the remove flag', async () => {
      ok(undefined)

      const result = await deleteApiKey('abc123')

      expect(result.success).toBe(true)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('/user/apikeys/abc123?remove=true')
    })
  })
})
