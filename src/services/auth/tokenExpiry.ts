/**
 * Token Expiry Detection Service
 *
 * Manages timers for proactive token expiry warnings.
 * Shows warning modal 5 minutes before token expires.
 */

import { getTokenExpiration } from '@/utils/jwt'
import type { ExpiryTimer, ExpiryDetectionConfig } from '@/types/auth'
import { logger } from '@/utils/logger'

// setTimeout uses a 32-bit signed int for its delay; values above this
// silently overflow and fire immediately. Skip scheduling for tokens that
// expire beyond this horizon (~24.8 days from now).
const MAX_TIMEOUT_MS = 2_147_483_647

class TokenExpiryService {
  private timer: ExpiryTimer = {
    timerId: null,
    expirationTime: null,
    warningTime: null,
    warningShown: false,
    modalOpen: false,
  }

  private config: ExpiryDetectionConfig = {
    warningMinutes: 5,
    autoLogoutOnExpiry: true,
    autoRefreshBeforeWarning: true,
  }

  /**
   * Setup expiry warning timer for a token
   *
   * Calculates when to show warning (5 minutes before expiration)
   * and schedules a setTimeout to trigger the modal.
   *
   * @param token - JWT token string
   */
  setupExpiryWarning(token: string): void {
    // Clear existing timer
    this.cancelExpiryWarning()

    const expiration = getTokenExpiration(token)
    if (!expiration) {
      logger.warn('TokenExpiry', 'Cannot setup expiry warning: invalid token')
      return
    }

    this.timer.expirationTime = expiration
    const now = Date.now()
    const expiresAt = expiration.getTime()
    const warningTime = expiresAt - this.config.warningMinutes * 60 * 1000
    this.timer.warningTime = new Date(warningTime)

    // If already past warning time, show immediately
    if (warningTime <= now) {
      logger.info('TokenExpiry', 'Token expires soon, showing warning immediately')
      this.showExpiryWarning(expiration)
      return
    }

    // Set timer for warning
    const delay = warningTime - now

    if (delay > MAX_TIMEOUT_MS) {
      logger.debug(
        'TokenExpiry',
        `Token expires too far in the future (${(delay / 86400000).toFixed(1)} days), skipping warning timer`
      )
      return
    }

    logger.debug(
      'TokenExpiry',
      `Expiry warning scheduled for ${new Date(warningTime).toLocaleTimeString()} (in ${(delay / 60000).toFixed(1)} minutes)`
    )

    this.timer.timerId = setTimeout(() => {
      this.showExpiryWarning(expiration)
    }, delay)
  }

  /**
   * Show the session expiry warning modal
   *
   * @param expiresAt - When the token will expire
   */
  showExpiryWarning(expiresAt: Date): void {
    if (this.timer.warningShown) {
      logger.debug('TokenExpiry', 'Expiry warning already shown, skipping')
      return
    }

    logger.info('TokenExpiry', 'Showing session expiry warning')
    this.timer.warningShown = true
    this.timer.modalOpen = true

    // Import auth store dynamically to avoid circular dependency
    import('@/stores/auth').then(({ useAuthStore }) => {
      const authStore = useAuthStore()
      authStore.showSessionExpiryModal(expiresAt)
    })
  }

  /**
   * Cancel the expiry warning timer
   *
   * Called when token changes (login, logout, refresh)
   */
  cancelExpiryWarning(): void {
    if (this.timer.timerId) {
      clearTimeout(this.timer.timerId)
      this.timer.timerId = null
    }
    this.timer.warningShown = false
    this.timer.modalOpen = false
    this.timer.expirationTime = null
    this.timer.warningTime = null
  }

  /**
   * Dismiss the expiry warning modal
   *
   * Called when user dismisses modal or extends session
   */
  dismissExpiryWarning(): void {
    this.timer.modalOpen = false

    // Import auth store dynamically to avoid circular dependency
    import('@/stores/auth').then(({ useAuthStore }) => {
      const authStore = useAuthStore()
      authStore.hideSessionExpiryModal()
    })
  }

  /**
   * Get current timer state for debugging
   *
   * @returns Copy of current expiry timer state
   */
  getTimerState(): ExpiryTimer {
    return { ...this.timer }
  }
}

export const tokenExpiryService = new TokenExpiryService()
