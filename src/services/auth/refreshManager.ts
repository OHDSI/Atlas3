import type { BackoffConfig } from '@/models/auth.types'
import { tokenManager } from './tokenManager'
import { logger } from '@/utils/logger'

export class RefreshManager {
  private readonly defaultConfig: BackoffConfig = {
    initialDelay: 1000,
    multiplier: 2,
    maxDelay: 60000,
    jitter: 0.1,
    maxRetries: 10,
  }

  async refreshWithBackoff(
    refreshFn: () => Promise<boolean>,
    config: Partial<BackoffConfig> = {}
  ): Promise<boolean> {
    const finalConfig = { ...this.defaultConfig, ...config }
    let delay = finalConfig.initialDelay

    for (let attempt = 0; attempt < finalConfig.maxRetries; attempt++) {
      try {
        const success = await refreshFn()
        if (success) {
          return true
        }
      } catch (error) {
        logger.error('RefreshManager', `Refresh attempt ${attempt + 1} failed`, error)
      }

      if (attempt < finalConfig.maxRetries - 1) {
        const jitter = delay * finalConfig.jitter * (Math.random() * 2 - 1)
        const waitTime = Math.min(delay + jitter, finalConfig.maxDelay)
        await this.sleep(waitTime)
        delay *= finalConfig.multiplier
      }
    }

    return false
  }

  scheduleRefresh(
    token: string,
    thresholdMs: number,
    refreshFn: () => Promise<boolean>
  ): number | null {
    const timeUntilRefresh = this.calculateRefreshDelay(token, thresholdMs)

    if (timeUntilRefresh <= 0) {
      return null
    }

    return window.setTimeout(async () => {
      await this.refreshWithBackoff(refreshFn)
    }, timeUntilRefresh)
  }

  calculateRefreshDelay(token: string, thresholdMs: number): number {
    const expirationDate = tokenManager.getExpirationDate(token)
    if (!expirationDate) return -1

    const timeUntilExpiration = expirationDate.getTime() - Date.now()
    const refreshTime = timeUntilExpiration - thresholdMs

    return Math.max(0, refreshTime)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const refreshManager = new RefreshManager()
