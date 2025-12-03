/**
 * Unit Tests: TokenManager Service
 * Tests for src/services/auth/tokenManager.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenManager, tokenManager } from '@/services/auth/tokenManager'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Helper to create a valid JWT token
function createTestJwt(payload: Record<string, unknown>, expiresInSeconds = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const body = btoa(JSON.stringify({ ...payload, exp }))
  const signature = btoa('test-signature')
  return `${header}.${body}.${signature}`
}

function createExpiredJwt(payload: Record<string, unknown> = {}): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const exp = Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
  const body = btoa(JSON.stringify({ ...payload, exp }))
  const signature = btoa('test-signature')
  return `${header}.${body}.${signature}`
}

describe('TokenManager', () => {
  let manager: TokenManager

  beforeEach(() => {
    manager = new TokenManager()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('isValidJWT', () => {
    it('returns true for valid JWT format', () => {
      const token = createTestJwt({ sub: 'user1' })

      expect(manager.isValidJWT(token)).toBe(true)
    })

    it('returns false for token with wrong number of parts', () => {
      expect(manager.isValidJWT('part1.part2')).toBe(false)
      expect(manager.isValidJWT('part1')).toBe(false)
      expect(manager.isValidJWT('part1.part2.part3.part4')).toBe(false)
    })

    it('returns false for token with empty parts', () => {
      expect(manager.isValidJWT('..')).toBe(false)
      expect(manager.isValidJWT('header..signature')).toBe(false)
      expect(manager.isValidJWT('.body.signature')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(manager.isValidJWT('')).toBe(false)
    })
  })

  describe('parseToken', () => {
    it('parses valid token correctly', () => {
      const token = createTestJwt({ sub: 'user123', name: 'Test User' })

      const result = manager.parseToken(token)

      expect(result).not.toBeNull()
      expect(result!.token).toBe(token)
      expect(result!.payload.sub).toBe('user123')
      expect(result!.payload.name).toBe('Test User')
      expect(result!.isExpired).toBe(false)
      expect(result!.expirationDate).toBeInstanceOf(Date)
    })

    it('returns null for invalid JWT format', () => {
      const result = manager.parseToken('invalid-token')

      expect(result).toBeNull()
    })

    it('correctly identifies expired tokens', () => {
      const token = createExpiredJwt({ sub: 'user1' })

      const result = manager.parseToken(token)

      expect(result).not.toBeNull()
      expect(result!.isExpired).toBe(true)
    })

    it('handles token without exp claim', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const body = btoa(JSON.stringify({ sub: 'user1' })) // No exp
      const signature = btoa('test-signature')
      const token = `${header}.${body}.${signature}`

      const result = manager.parseToken(token)

      expect(result).not.toBeNull()
      // Without exp, expiration date defaults to epoch
      expect(result!.expirationDate.getTime()).toBe(0)
    })

    it('logs error and returns null on parse failure', async () => {
      const { logger } = await import('@/utils/logger')

      // Create token with invalid base64 in body
      const result = manager.parseToken('valid.!!!invalid!!!.sig')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith(
        'TokenManager',
        'Failed to parse token',
        expect.any(Error)
      )
    })
  })

  describe('isTokenExpired', () => {
    it('returns false for valid non-expired token', () => {
      const token = createTestJwt({ sub: 'user1' }, 3600)

      expect(manager.isTokenExpired(token)).toBe(false)
    })

    it('returns true for expired token', () => {
      const token = createExpiredJwt()

      expect(manager.isTokenExpired(token)).toBe(true)
    })

    it('returns true for token without exp claim', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const body = btoa(JSON.stringify({ sub: 'user1' }))
      const signature = btoa('test')
      const token = `${header}.${body}.${signature}`

      expect(manager.isTokenExpired(token)).toBe(true)
    })

    it('returns true for invalid token', () => {
      expect(manager.isTokenExpired('invalid')).toBe(true)
    })
  })

  describe('getExpirationDate', () => {
    it('returns correct expiration date', () => {
      vi.useRealTimers()
      const now = Date.now()
      const expiresIn = 3600
      const token = createTestJwt({}, expiresIn)

      const result = manager.getExpirationDate(token)

      expect(result).toBeInstanceOf(Date)
      // Should be approximately 1 hour from now
      expect(result!.getTime()).toBeGreaterThan(now + 3500000)
      expect(result!.getTime()).toBeLessThan(now + 3700000)
    })

    it('returns null for token without exp', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const body = btoa(JSON.stringify({ sub: 'user1' }))
      const signature = btoa('test')
      const token = `${header}.${body}.${signature}`

      expect(manager.getExpirationDate(token)).toBeNull()
    })

    it('returns null for invalid token', () => {
      expect(manager.getExpirationDate('invalid')).toBeNull()
    })
  })

  describe('getTimeUntilExpiration', () => {
    it('returns positive time for non-expired token', () => {
      vi.useRealTimers()
      const token = createTestJwt({}, 3600)

      const result = manager.getTimeUntilExpiration(token)

      // Should be close to 1 hour in milliseconds
      expect(result).toBeGreaterThan(3500000)
      expect(result).toBeLessThanOrEqual(3600000)
    })

    it('returns 0 for expired token', () => {
      vi.useRealTimers()
      const token = createExpiredJwt()

      expect(manager.getTimeUntilExpiration(token)).toBe(0)
    })

    it('returns 0 for invalid token', () => {
      expect(manager.getTimeUntilExpiration('invalid')).toBe(0)
    })
  })

  describe('shouldRefresh', () => {
    it('returns true when token expires within threshold', () => {
      vi.useRealTimers()
      const token = createTestJwt({}, 300) // Expires in 5 minutes
      const threshold = 10 * 60 * 1000 // 10 minute threshold

      expect(manager.shouldRefresh(token, threshold)).toBe(true)
    })

    it('returns false when token expires beyond threshold', () => {
      vi.useRealTimers()
      const token = createTestJwt({}, 3600) // Expires in 1 hour
      const threshold = 10 * 60 * 1000 // 10 minute threshold

      expect(manager.shouldRefresh(token, threshold)).toBe(false)
    })

    it('returns false for already expired token', () => {
      vi.useRealTimers()
      const token = createExpiredJwt()
      const threshold = 10 * 60 * 1000

      expect(manager.shouldRefresh(token, threshold)).toBe(false)
    })

    it('returns false for invalid token', () => {
      expect(manager.shouldRefresh('invalid', 10000)).toBe(false)
    })
  })

  describe('Singleton Export', () => {
    it('exports singleton instance', () => {
      expect(tokenManager).toBeInstanceOf(TokenManager)
    })
  })
})
