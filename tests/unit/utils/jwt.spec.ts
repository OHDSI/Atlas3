/**
 * Unit Tests: JWT Utilities
 * Tests for src/utils/jwt.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTokenExpiration, isTokenExpired, getTokenPayload } from '@/utils/jwt'

// Mock jose
vi.mock('jose', () => ({
  decodeJwt: vi.fn(),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('jwt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getTokenExpiration', () => {
    it('returns Date from exp claim', async () => {
      const { decodeJwt } = await import('jose')
      const expTimestamp = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      vi.mocked(decodeJwt).mockReturnValue({ exp: expTimestamp })

      const result = getTokenExpiration('valid.token.here')

      expect(result).toBeInstanceOf(Date)
      expect(result!.getTime()).toBe(expTimestamp * 1000)
    })

    it('returns null when no exp claim', async () => {
      const { decodeJwt } = await import('jose')
      vi.mocked(decodeJwt).mockReturnValue({})

      const result = getTokenExpiration('no.exp.token')

      expect(result).toBeNull()
    })

    it('returns null on decode error', async () => {
      const { decodeJwt } = await import('jose')
      vi.mocked(decodeJwt).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = getTokenExpiration('invalid.token')

      expect(result).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('returns false for non-expired token', async () => {
      const { decodeJwt } = await import('jose')
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      vi.mocked(decodeJwt).mockReturnValue({ exp: futureExp })

      const result = isTokenExpired('valid.token.here')

      expect(result).toBe(false)
    })

    it('returns true for expired token', async () => {
      const { decodeJwt } = await import('jose')
      const pastExp = Math.floor(Date.now() / 1000) - 3600
      vi.mocked(decodeJwt).mockReturnValue({ exp: pastExp })

      const result = isTokenExpired('expired.token.here')

      expect(result).toBe(true)
    })

    it('returns true when token has no exp', async () => {
      const { decodeJwt } = await import('jose')
      vi.mocked(decodeJwt).mockReturnValue({})

      const result = isTokenExpired('no.exp.token')

      expect(result).toBe(true)
    })

    it('returns true on decode error', async () => {
      const { decodeJwt } = await import('jose')
      vi.mocked(decodeJwt).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = isTokenExpired('invalid.token')

      expect(result).toBe(true)
    })

    it('returns true when expiration is exactly now', async () => {
      const { decodeJwt } = await import('jose')
      const nowExp = Math.floor(Date.now() / 1000)
      vi.mocked(decodeJwt).mockReturnValue({ exp: nowExp })

      const result = isTokenExpired('expiring.now.token')

      expect(result).toBe(true)
    })
  })

  describe('getTokenPayload', () => {
    it('returns decoded payload', async () => {
      const { decodeJwt } = await import('jose')
      const payload = {
        sub: 'user123',
        exp: 1234567890,
        iat: 1234567800,
        iss: 'test-issuer',
      }
      vi.mocked(decodeJwt).mockReturnValue(payload)

      const result = getTokenPayload('valid.token.here')

      expect(result).toEqual(payload)
    })

    it('returns null on decode error', async () => {
      const { decodeJwt } = await import('jose')
      vi.mocked(decodeJwt).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = getTokenPayload('invalid.token')

      expect(result).toBeNull()
    })

    it('handles complex payload', async () => {
      const { decodeJwt } = await import('jose')
      const payload = {
        sub: 'user456',
        exp: 9999999999,
        permissions: ['read', 'write'],
        role: 'admin',
        metadata: { key: 'value' },
      }
      vi.mocked(decodeJwt).mockReturnValue(payload)

      const result = getTokenPayload('complex.token.here')

      expect(result).toEqual(payload)
      expect(result?.permissions).toEqual(['read', 'write'])
    })
  })
})
