/**
 * Refresh Manager Service Tests
 * Tests for token refresh scheduling and backoff logic
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RefreshManager, refreshManager } from '@/services/auth/refreshManager'

// Mock dependencies
vi.mock('@/services/auth/tokenManager', () => ({
  tokenManager: {
    getExpirationDate: vi.fn(),
  },
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { tokenManager } from '@/services/auth/tokenManager'
import { logger } from '@/utils/logger'

describe('RefreshManager', () => {
  let manager: RefreshManager

  beforeEach(() => {
    manager = new RefreshManager()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('refreshWithBackoff', () => {
    it('should return true on successful refresh', async () => {
      const refreshFn = vi.fn().mockResolvedValue(true)

      const result = await manager.refreshWithBackoff(refreshFn)

      expect(result).toBe(true)
      expect(refreshFn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      const refreshFn = vi.fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 100,
        maxRetries: 5,
        jitter: 0, // Disable jitter for deterministic timing
        multiplier: 2,
      })

      // Advance timers for retries (100ms + 200ms)
      await vi.advanceTimersByTimeAsync(100) // First retry delay
      await vi.advanceTimersByTimeAsync(200) // Second retry delay (100 * 2)

      const result = await resultPromise

      expect(result).toBe(true)
      expect(refreshFn).toHaveBeenCalledTimes(3)
    })

    it('should return false after max retries', async () => {
      const refreshFn = vi.fn().mockResolvedValue(false)

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 10,
        maxRetries: 3,
        multiplier: 2,
        jitter: 0,
      })

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(10) // First delay
      await vi.advanceTimersByTimeAsync(20) // Second delay

      const result = await resultPromise

      expect(result).toBe(false)
      expect(refreshFn).toHaveBeenCalledTimes(3)
    })

    it('should log errors on failure', async () => {
      const error = new Error('Network error')
      const refreshFn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(true)

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 10,
        maxRetries: 2,
      })

      await vi.advanceTimersByTimeAsync(10)
      await resultPromise

      expect(logger.error).toHaveBeenCalledWith(
        'RefreshManager',
        'Refresh attempt 1 failed',
        error
      )
    })

    it('should respect max delay', async () => {
      const refreshFn = vi.fn().mockResolvedValue(false)

      const resultPromise = manager.refreshWithBackoff(refreshFn, {
        initialDelay: 1000,
        maxDelay: 2000,
        multiplier: 10,
        maxRetries: 3,
        jitter: 0,
      })

      // First delay should be 1000
      // Second delay would be 10000 but capped at 2000
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)

      await resultPromise

      expect(refreshFn).toHaveBeenCalledTimes(3)
    })

    it('should use default config', async () => {
      const refreshFn = vi.fn().mockResolvedValue(true)

      await manager.refreshWithBackoff(refreshFn)

      expect(refreshFn).toHaveBeenCalled()
    })
  })

  describe('scheduleRefresh', () => {
    it('should schedule refresh for future time', () => {
      const futureDate = new Date(Date.now() + 60000) // 1 minute from now
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(futureDate)
      const refreshFn = vi.fn().mockResolvedValue(true)

      const timeoutId = manager.scheduleRefresh('token', 30000, refreshFn)

      expect(timeoutId).not.toBeNull()
      // In vitest with fake timers, setTimeout returns an object, not a number
      expect(timeoutId).toBeDefined()
    })

    it('should return null for expired token', () => {
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(null)
      const refreshFn = vi.fn()

      const timeoutId = manager.scheduleRefresh('token', 30000, refreshFn)

      expect(timeoutId).toBeNull()
    })

    it('should return null when refresh would be in the past', () => {
      const pastDate = new Date(Date.now() - 1000) // Already expired
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(pastDate)
      const refreshFn = vi.fn()

      const timeoutId = manager.scheduleRefresh('token', 30000, refreshFn)

      expect(timeoutId).toBeNull()
    })

    it('should call refresh function when scheduled time arrives', async () => {
      const futureDate = new Date(Date.now() + 60000) // 1 minute from now
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(futureDate)
      const refreshFn = vi.fn().mockResolvedValue(true)

      manager.scheduleRefresh('token', 30000, refreshFn)

      // Advance to just before refresh time (60s - 30s = 30s)
      await vi.advanceTimersByTimeAsync(29000)
      expect(refreshFn).not.toHaveBeenCalled()

      // Advance past refresh time
      await vi.advanceTimersByTimeAsync(2000)
      expect(refreshFn).toHaveBeenCalled()
    })
  })

  describe('calculateRefreshDelay', () => {
    it('should calculate correct delay', () => {
      const futureDate = new Date(Date.now() + 60000) // 1 minute from now
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(futureDate)

      const delay = manager.calculateRefreshDelay('token', 30000) // 30 second threshold

      // Should be approximately 30 seconds (60s - 30s)
      expect(delay).toBeGreaterThanOrEqual(29000)
      expect(delay).toBeLessThanOrEqual(31000)
    })

    it('should return -1 for null expiration date', () => {
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(null)

      const delay = manager.calculateRefreshDelay('token', 30000)

      expect(delay).toBe(-1)
    })

    it('should return 0 when already past refresh time', () => {
      const nearFuture = new Date(Date.now() + 10000) // 10 seconds from now
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(nearFuture)

      const delay = manager.calculateRefreshDelay('token', 30000) // 30 second threshold

      expect(delay).toBe(0)
    })

    it('should return 0 for already expired token', () => {
      const pastDate = new Date(Date.now() - 1000)
      vi.mocked(tokenManager.getExpirationDate).mockReturnValue(pastDate)

      const delay = manager.calculateRefreshDelay('token', 30000)

      expect(delay).toBe(0)
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(refreshManager).toBeInstanceOf(RefreshManager)
    })
  })
})
