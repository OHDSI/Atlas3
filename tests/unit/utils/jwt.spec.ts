/**
 * JWT Utility Tests
 * Tests for JWT token parsing and validation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { getTokenExpiration, isTokenExpired, getTokenPayload } from '@/utils/jwt'

// Helper to create a valid JWT
function createTestJWT(expiresInSeconds: number): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: 'testuser',
    iat: now,
    exp: now + expiresInSeconds
  }
  const base64Header = btoa(JSON.stringify(header))
  const base64Payload = btoa(JSON.stringify(payload))
  return `${base64Header}.${base64Payload}.test_signature`
}

describe('JWT Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTokenExpiration', () => {
    it('should extract expiration date from valid JWT', () => {
      const token = createTestJWT(3600) // 1 hour from now

      const expiration = getTokenExpiration(token)

      expect(expiration).toBeInstanceOf(Date)
      expect(expiration!.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return null for invalid token', () => {
      const result = getTokenExpiration('invalid-token')

      expect(result).toBeNull()
    })

    it('should return null for token without exp claim', () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'testuser' } // No exp
      const base64Header = btoa(JSON.stringify(header))
      const base64Payload = btoa(JSON.stringify(payload))
      const token = `${base64Header}.${base64Payload}.signature`

      const result = getTokenExpiration(token)

      expect(result).toBeNull()
    })

    it('should return null for token with exp = 0', () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'testuser', exp: 0 } // exp is falsy
      const base64Header = btoa(JSON.stringify(header))
      const base64Payload = btoa(JSON.stringify(payload))
      const token = `${base64Header}.${base64Payload}.signature`

      const result = getTokenExpiration(token)

      expect(result).toBeNull()
    })

    it('should return null for token with null exp', () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'testuser', exp: null } // exp is explicitly null
      const base64Header = btoa(JSON.stringify(header))
      const base64Payload = btoa(JSON.stringify(payload))
      const token = `${base64Header}.${base64Payload}.signature`

      const result = getTokenExpiration(token)

      expect(result).toBeNull()
    })

    it('should handle malformed JSON in payload', () => {
      const token = 'header.notvalidjson.signature'

      const result = getTokenExpiration(token)

      expect(result).toBeNull()
    })

    it('should convert Unix timestamp to Date correctly', () => {
      const expTime = Math.floor(Date.now() / 1000) + 7200 // 2 hours from now
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'testuser', exp: expTime }
      const base64Header = btoa(JSON.stringify(header))
      const base64Payload = btoa(JSON.stringify(payload))
      const token = `${base64Header}.${base64Payload}.signature`

      const result = getTokenExpiration(token)

      expect(result).toBeInstanceOf(Date)
      expect(result!.getTime()).toBe(expTime * 1000)
    })

    it('should log error for parsing failure', async () => {
      const { logger } = vi.mocked(await import('@/utils/logger'))

      getTokenExpiration('invalid-token')

      expect(logger.error).toHaveBeenCalledWith(
        'JWT',
        'Failed to parse JWT',
        expect.any(Error)
      )
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = createTestJWT(3600) // Expires in 1 hour

      const result = isTokenExpired(token)

      expect(result).toBe(false)
    })

    it('should return true for expired token', () => {
      const token = createTestJWT(-3600) // Expired 1 hour ago

      const result = isTokenExpired(token)

      expect(result).toBe(true)
    })

    it('should return true for token expiring right now', () => {
      const token = createTestJWT(0) // Expires at current time

      const result = isTokenExpired(token)

      expect(result).toBe(true)
    })

    it('should return true for invalid token', () => {
      const result = isTokenExpired('invalid-token')

      expect(result).toBe(true)
    })

    it('should return true for token without exp claim', () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'testuser' } // No exp
      const base64Header = btoa(JSON.stringify(header))
      const base64Payload = btoa(JSON.stringify(payload))
      const token = `${base64Header}.${base64Payload}.signature`

      const result = isTokenExpired(token)

      expect(result).toBe(true)
    })

    it('should treat token with null expiration as expired', () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'testuser', exp: null }
      const base64Header = btoa(JSON.stringify(header))
      const base64Payload = btoa(JSON.stringify(payload))
      const token = `${base64Header}.${base64Payload}.signature`

      const result = isTokenExpired(token)

      expect(result).toBe(true)
    })

    it('should return false for token with far future expiration', () => {
      const token = createTestJWT(86400 * 365) // Expires in 1 year

      const result = isTokenExpired(token)

      expect(result).toBe(false)
    })
  })

  describe('getTokenPayload', () => {
    it('should parse and return JWT payload', () => {
      const token = createTestJWT(3600)

      const payload = getTokenPayload(token)

      expect(payload).toBeDefined()
      expect(payload?.sub).toBe('testuser')
      expect(payload?.exp).toBeDefined()
      expect(payload?.iat).toBeDefined()
    })

    it('should return null for invalid token', () => {
      const result = getTokenPayload('invalid-token')

      expect(result).toBeNull()
    })

    it('should return null for malformed token', () => {
      const result = getTokenPayload('not.a.valid.jwt.token')

      expect(result).toBeNull()
    })

    it('should parse token with custom claims', () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        sub: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['admin', 'user'],
        iat: now,
        exp: now + 3600
      }
      const base64Header = btoa(JSON.stringify(header))
      const base64Payload = btoa(JSON.stringify(payload))
      const token = `${base64Header}.${base64Payload}.signature`

      const result = getTokenPayload(token)

      expect(result).toBeDefined()
      expect(result?.sub).toBe('user123')
      expect(result?.name).toBe('Test User')
      expect(result?.email).toBe('test@example.com')
      expect(result?.roles).toEqual(['admin', 'user'])
    })

    it('should handle token without optional claims', () => {
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = { sub: 'minimal' }
      const base64Header = btoa(JSON.stringify(header))
      const base64Payload = btoa(JSON.stringify(payload))
      const token = `${base64Header}.${base64Payload}.signature`

      const result = getTokenPayload(token)

      expect(result).toBeDefined()
      expect(result?.sub).toBe('minimal')
      expect(result?.exp).toBeUndefined()
      expect(result?.iat).toBeUndefined()
    })

    it('should log error for invalid token', async () => {
      const { logger } = vi.mocked(await import('@/utils/logger'))

      getTokenPayload('invalid-token')

      expect(logger.error).toHaveBeenCalledWith(
        'JWT',
        'Failed to parse JWT',
        expect.any(Error)
      )
    })
  })
})
