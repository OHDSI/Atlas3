/**
 * Token Refresh Service
 * Handles automatic token refresh with retry logic and single in-flight request pattern.
 */
import type { TokenRefreshState, TokenRefreshConfig } from '@/types/auth'
import { logger } from '@/utils/logger'

class TokenRefreshService {
  private state: TokenRefreshState = {
    isRefreshing: false,
    refreshPromise: null,
    retryCount: 0,
    lastRefreshTime: null,
    lastFailureTime: null,
    lastError: null,
  }

  private config: TokenRefreshConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    refreshBufferMinutes: 5,
    refreshEndpoint: '/user/refresh',
    tokenHeader: 'bearer',
  }

  private readonly MIN_REFRESH_INTERVAL_MS = 5000

  async refreshToken(retryCount = 0): Promise<boolean> {
    if (this.state.refreshPromise) {
      logger.debug('TokenRefresh', 'Refresh already in progress, returning existing promise')
      return this.state.refreshPromise
    }

    if (this.state.lastRefreshTime && retryCount === 0) {
      const timeSinceLastRefresh = Date.now() - this.state.lastRefreshTime.getTime()
      if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL_MS) {
        logger.debug(
          'TokenRefresh',
          `Skipping refresh, last refresh was ${timeSinceLastRefresh}ms ago`
        )
        return true
      }
    }

    this.state.isRefreshing = true
    this.state.retryCount = retryCount

    const refreshPromise = this.executeRefresh(retryCount)
    this.state.refreshPromise = refreshPromise

    try {
      return await refreshPromise
    } finally {
      if (this.state.refreshPromise === refreshPromise) {
        this.state.isRefreshing = false
        this.state.refreshPromise = null
      }
    }
  }

  private async executeRefresh(retryCount: number): Promise<boolean> {
    try {
      logger.debug(
        'TokenRefresh',
        `Attempting token refresh (attempt ${retryCount + 1}/${this.config.maxRetries + 1})`
      )

      const { authService } = await import('@/services/auth/authService')
      const success = await authService.refreshToken()

      if (success) {
        this.state.lastRefreshTime = new Date()
        this.state.lastError = null
        this.state.retryCount = 0
        logger.info('TokenRefresh', 'Token refreshed successfully')
        return true
      }

      throw new Error('No token in refresh response')
    } catch (error) {
      this.state.lastFailureTime = new Date()
      this.state.lastError = error as Error

      if (retryCount < this.config.maxRetries) {
        const delayMs = this.config.baseDelayMs * Math.pow(2, retryCount)
        logger.warn(
          'TokenRefresh',
          `Refresh failed, retrying in ${delayMs}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`
        )
        await new Promise(resolve => setTimeout(resolve, delayMs))
        return this.refreshToken(retryCount + 1)
      }

      logger.error('TokenRefresh', 'Token refresh failed after max retries', error)
      return false
    }
  }

  getState(): TokenRefreshState {
    return { ...this.state }
  }

  resetState(): void {
    this.state = {
      isRefreshing: false,
      refreshPromise: null,
      retryCount: 0,
      lastRefreshTime: null,
      lastFailureTime: null,
      lastError: null,
    }
  }
}

export const tokenRefreshService = new TokenRefreshService()
