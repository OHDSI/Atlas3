/**
 * Token Manager Service Tests
 * Tests for JWT token parsing and validation
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TokenManager, tokenManager } from '@/services/auth/tokenManager'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '@/utils/logger'

// Helper to create a valid JWT token structure (not cryptographically signed)
function createTestJWT(payload: Record<string, unknown>, expiresInSeconds = 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    sub: 'testuser',
    iat: now,
    exp: now + expiresInSeconds,
    ...payload,
  }

  const base64Header = btoa(JSON.stringify(header))
  const base64Payload = btoa(JSON.stringify(fullPayload))
  const signature = 'test_signature'

  return `${base64Header}.${base64Payload}.${signature}`
}

describe('TokenManager', () => {
  let manager: TokenManager

  beforeEach(() => {
    manager = new TokenManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isValidJWT', () => {
    it('should return true for valid JWT structure', () => {
      const token = createTestJWT({})
      expect(manager.isValidJWT(token)).toBe(true)
    })

    it('should return true for standard 3-part token', () => {
      expect(manager.isValidJWT('header.payload.signature')).toBe(true)
    })

    it('should return false for 2-part token', () => {
      expect(manager.isValidJWT('header.payload')).toBe(false)
    })

    it('should return false for single-part token', () => {
      expect(manager.isValidJWT('onlyonepart')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(manager.isValidJWT('')).toBe(false)
    })

    it('should return false for token with empty parts', () => {
      expect(manager.isValidJWT('..signature')).toBe(false)
    })
  })

  describe('parseToken', () => {
    it('should parse a valid token', () => {
      const token = createTestJWT({ sub: 'user123' })
      const result = manager.parseToken(token)

      expect(result).not.toBeNull()
      expect(result?.token).toBe(token)
      expect(result?.payload.sub).toBe('user123')
      expect(result?.expirationDate).toBeInstanceOf(Date)
    })

    it('should return null for invalid token structure', () => {
      const result = manager.parseToken('invalid-token')
      expect(result).toBeNull()
    })

    it('should correctly detect expired tokens', () => {
      const token = createTestJWT({}, -3600) // Expired 1 hour ago
      const result = manager.parseToken(token)

      expect(result).not.toBeNull()
      expect(result?.isExpired).toBe(true)
    })

    it('should correctly detect valid tokens', () => {
      const token = createTestJWT({}, 3600) // Expires in 1 hour
      const result = manager.parseToken(token)

      expect(result).not.toBeNull()
      expect(result?.isExpired).toBe(false)
    })

    it('should handle parsing error', () => {
      // Create a token with invalid base64 in payload
      const result = manager.parseToken('eyJhbGciOiJIUzI1NiJ9.!!!invalid!!!.signature')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const token = createTestJWT({}, 3600) // Expires in 1 hour
      expect(manager.isTokenExpired(token)).toBe(false)
    })

    it('should return true for expired token', () => {
      const token = createTestJWT({}, -3600) // Expired 1 hour ago
      expect(manager.isTokenExpired(token)).toBe(true)
    })

    it('should return true for token without exp claim', () => {
      // Create token with no exp
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'testuser' } // No exp
      const token = `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(payload))}.signature`

      expect(manager.isTokenExpired(token)).toBe(true)
    })

    it('should return true for invalid token', () => {
      expect(manager.isTokenExpired('invalid')).toBe(true)
    })
  })

  describe('getExpirationDate', () => {
    it('should return expiration date for valid token', () => {
      const token = createTestJWT({}, 3600)
      const result = manager.getExpirationDate(token)

      expect(result).toBeInstanceOf(Date)
      // Should be approximately 1 hour from now
      const expectedTime = Date.now() + 3600 * 1000
      expect(Math.abs(result!.getTime() - expectedTime)).toBeLessThan(1000)
    })

    it('should return null for token without exp', () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'testuser' }
      const token = `${btoa(JSON.stringify(header))}.${btoa(JSON.stringify(payload))}.signature`

      expect(manager.getExpirationDate(token)).toBeNull()
    })

    it('should return null for invalid token', () => {
      expect(manager.getExpirationDate('invalid')).toBeNull()
    })
  })

  describe('getTimeUntilExpiration', () => {
    it('should return positive value for non-expired token', () => {
      const token = createTestJWT({}, 3600) // Expires in 1 hour
      const result = manager.getTimeUntilExpiration(token)

      // Should be approximately 1 hour (3600 seconds) in milliseconds
      expect(result).toBeGreaterThan(3590 * 1000) // Allow some tolerance
      expect(result).toBeLessThanOrEqual(3600 * 1000)
    })

    it('should return 0 for expired token', () => {
      const token = createTestJWT({}, -3600) // Expired
      expect(manager.getTimeUntilExpiration(token)).toBe(0)
    })

    it('should return 0 for invalid token', () => {
      expect(manager.getTimeUntilExpiration('invalid')).toBe(0)
    })
  })

  describe('shouldRefresh', () => {
    it('should return true when within threshold', () => {
      // Token expires in 5 minutes
      const token = createTestJWT({}, 300)
      // Should refresh if within 10 minutes of expiration
      expect(manager.shouldRefresh(token, 600 * 1000)).toBe(true)
    })

    it('should return false when not within threshold', () => {
      // Token expires in 1 hour
      const token = createTestJWT({}, 3600)
      // Should not refresh if only checking 5 minute threshold
      expect(manager.shouldRefresh(token, 300 * 1000)).toBe(false)
    })

    it('should return false for expired token', () => {
      const token = createTestJWT({}, -3600)
      expect(manager.shouldRefresh(token, 600 * 1000)).toBe(false)
    })

    it('should return false for invalid token', () => {
      expect(manager.shouldRefresh('invalid', 600 * 1000)).toBe(false)
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(tokenManager).toBeInstanceOf(TokenManager)
    })
  })
})
