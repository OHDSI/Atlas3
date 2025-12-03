/**
 * Unit Tests: RefreshManager Service
 * Tests for src/services/auth/refreshManager.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RefreshManager, refreshManager } from '@/services/auth/refreshManager'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock tokenManager
vi.mock('@/services/auth/tokenManager', () => ({
  tokenManager: {
    getExpirationDate: vi.fn(),
  },
}))

// Helper to create a valid JWT token for testing
function _createTestJwt(expiresInSeconds = 3600): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds
  const body = btoa(JSON.stringify({ sub: 'test', exp }))
  const signature = btoa('test-signature')
  return `${header}.${body}.${signature}`
}

describe('RefreshManager', () => {
  let manager: RefreshManager

  beforeEach(() => {
    manager = new RefreshManager()
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  describe('refreshWithBackoff', () => {
    it('returns true on first successful attempt', async () => {
      const refreshFn = vi.fn().mockResolvedValue(true)

      const result = await manager.refreshWithBackoff(refreshFn)

      expect(result).toBe(true)
      expect(refreshFn).toHaveBeenCalledTimes(1)
    })

    it('retries on failure and returns true on eventual success', async () => {
      const refreshFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(true)

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 100,
        jitter: 0,
      })

      // Fast-forward through delays
      await vi.advanceTimersByTimeAsync(100)
      await vi.advanceTimersByTimeAsync(200)

      const result = await resultPromise

      expect(result).toBe(true)
      expect(refreshFn).toHaveBeenCalledTimes(3)
    })

    it('returns false after max retries', async () => {
      const refreshFn = vi.fn().mockRejectedValue(new Error('Always fails'))

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 10,
        maxRetries: 3,
        jitter: 0,
      })

      // Fast-forward through all delays
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(1000)
      }

      const result = await resultPromise

      expect(result).toBe(false)
      expect(refreshFn).toHaveBeenCalledTimes(3)
    })

    it('returns false when refreshFn returns false', async () => {
      const refreshFn = vi.fn().mockResolvedValue(false)

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 10,
        maxRetries: 3,
        jitter: 0,
      })

      // Fast-forward through all delays
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(1000)
      }

      const result = await resultPromise

      expect(result).toBe(false)
      expect(refreshFn).toHaveBeenCalledTimes(3)
    })

    it('respects custom config', async () => {
      const refreshFn = vi.fn().mockRejectedValue(new Error('Fail'))

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 50,
        multiplier: 3,
        maxRetries: 2,
        jitter: 0,
      })

      await vi.advanceTimersByTimeAsync(50) // First delay: 50ms
      await vi.advanceTimersByTimeAsync(150) // Second delay: 50 * 3 = 150ms

      const result = await resultPromise

      expect(result).toBe(false)
      expect(refreshFn).toHaveBeenCalledTimes(2)
    })

    it('respects maxDelay', async () => {
      const refreshFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue(true)

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 100,
        multiplier: 100, // Would result in huge delays
        maxDelay: 200, // But capped at 200
        maxRetries: 4,
        jitter: 0,
      })

      await vi.advanceTimersByTimeAsync(100) // First delay
      await vi.advanceTimersByTimeAsync(200) // Second delay (capped)
      await vi.advanceTimersByTimeAsync(200) // Third delay (capped)

      const result = await resultPromise

      expect(result).toBe(true)
    })

    it('logs errors on failed attempts', async () => {
      const { logger } = await import('@/utils/logger')
      const error = new Error('Test error')
      const refreshFn = vi.fn().mockRejectedValue(error)

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        maxRetries: 1,
        jitter: 0,
      })

      await resultPromise

      expect(logger.error).toHaveBeenCalledWith(
        'RefreshManager',
        'Refresh attempt 1 failed',
        error
      )
    })
  })

  describe('scheduleRefresh', () => {
    it('schedules refresh when token will expire after threshold', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager')
      const expirationDate = new Date(Date.now() + 600000) // 10 minutes from now
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expirationDate)

      const refreshFn = vi.fn().mockResolvedValue(true)
      const thresholdMs = 300000 // 5 minutes

      const timerId = manager.scheduleRefresh('test-token', thresholdMs, refreshFn)

      expect(timerId).not.toBeNull()

      // Refresh should be scheduled for 5 minutes from now (10 min expiry - 5 min threshold)
      await vi.advanceTimersByTimeAsync(300000)

      expect(refreshFn).toHaveBeenCalled()
    })

    it('returns null when token already needs refresh', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager')
      const expirationDate = new Date(Date.now() + 60000) // 1 minute from now
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expirationDate)

      const refreshFn = vi.fn()
      const thresholdMs = 300000 // 5 minutes threshold

      const timerId = manager.scheduleRefresh('test-token', thresholdMs, refreshFn)

      expect(timerId).toBeNull()
    })

    it('returns null when token has no expiration', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager')
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(null)

      const refreshFn = vi.fn()

      const timerId = manager.scheduleRefresh('test-token', 300000, refreshFn)

      expect(timerId).toBeNull()
    })
  })

  describe('calculateRefreshDelay', () => {
    it('calculates correct delay', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager')
      const now = Date.now()
      const expirationDate = new Date(now + 600000) // 10 minutes from now
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expirationDate)

      const thresholdMs = 300000 // 5 minutes

      const delay = manager.calculateRefreshDelay('test-token', thresholdMs)

      // Should be ~5 minutes (10 min until expiry - 5 min threshold)
      expect(delay).toBeCloseTo(300000, -3) // Within 1 second
    })

    it('returns 0 when past refresh time', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager')
      const expirationDate = new Date(Date.now() + 60000) // 1 minute from now
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(expirationDate)

      const thresholdMs = 300000 // 5 minutes threshold (past expiry time)

      const delay = manager.calculateRefreshDelay('test-token', thresholdMs)

      expect(delay).toBe(0)
    })

    it('returns -1 when no expiration date', async () => {
      const { tokenManager } = await import('@/services/auth/tokenManager')
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(null)

      const delay = manager.calculateRefreshDelay('test-token', 300000)

      expect(delay).toBe(-1)
    })
  })

  describe('Singleton Export', () => {
    it('exports singleton instance', () => {
      expect(refreshManager).toBeInstanceOf(RefreshManager)
    })
  })
})
