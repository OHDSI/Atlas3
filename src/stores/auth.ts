import { defineStore } from 'pinia'
import type { AuthState, UserInfo } from '@/models/auth.types'
import { emptyEntityAccess } from '@/models/auth.types'
import { storageManager } from '@/services/auth/storageManager'
import { tokenManager } from '@/services/auth/tokenManager'
import { refreshManager } from '@/services/auth/refreshManager'
import { permissionService } from '@/services/auth/permissions'
import { getAuthConfig } from '@/config/auth.config'
import { logger } from '@/utils/logger'

// Storage handler reference for cleanup
let storageHandler: ((e: StorageEvent) => void) | null = null

// Debounce timeout for cross-tab sync
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
const SYNC_DEBOUNCE_MS = 100

let lastModalOpenTime = 0
const MODAL_DEBOUNCE_MS = 500

export const useAuthStore = defineStore('auth', {
  state: (): AuthState & {
    refreshTimeoutId: number | null
    isRunningAs: boolean
    originalUser: UserInfo | null
    sessionExpiryModalOpen: boolean
    sessionExpiresAt: Date | null
  } => ({
    token: null,
    user: null,
    permissions: {},
    entityAccess: emptyEntityAccess(),
    authProvider: null,
    authClient: null,
    tokenExpirationDate: null,
    isAuthenticated: false,
    isRefreshing: false,
    tokenExpired: false,
    loginModalOpen: false,
    errorMessage: null,
    isAuthenticating: false,
    refreshTimeoutId: null,
    isRunningAs: false,
    originalUser: null,
    sessionExpiryModalOpen: false,
    sessionExpiresAt: null,
  }),

  getters: {
    isLoggedIn: state => state.isAuthenticated && !!state.token,
    userDisplayName: state => state.user?.displayName || state.user?.login || 'Guest',
    hasToken: state => !!state.token,
    isTokenValid: state => {
      if (!state.token) return false
      return !tokenManager.isTokenExpired(state.token)
    },
    /** Whether TrexSQL cache feature is enabled on the server */
    trexsqlCacheEnabled: state => state.user?.trexsqlCacheEnabled ?? false,
  },

  actions: {
    setToken(token: string | null) {
      if (!token) {
        this.clearAuth()
        return
      }

      const parsedToken = tokenManager.parseToken(token)
      if (!parsedToken) {
        logger.error('Auth', 'Invalid token format')
        this.clearAuth()
        return
      }

      this.token = token
      this.tokenExpirationDate = parsedToken.expirationDate
      this.tokenExpired = parsedToken.isExpired
      this.isAuthenticated = !parsedToken.isExpired && getAuthConfig().userAuthenticationEnabled

      storageManager.saveToken(token)

      this.scheduleTokenRefresh()
    },

    setUser(user: UserInfo | null) {
      // Clear permission cache BEFORE mutating reactive state. permissionService
      // keys its cache only by the required-permission string, so any value
      // cached against the previous user must be evicted before computeds that
      // depend on `this.user` re-run — otherwise they hit the stale entry and
      // return the wrong answer (most visibly: action buttons stay disabled).
      permissionService.clearCache()

      this.user = user
      if (user) {
        this.permissions = user.permissionIdx || {}
        this.entityAccess = user.entityAccess || emptyEntityAccess()
      } else {
        this.permissions = {}
        this.entityAccess = emptyEntityAccess()
      }
    },

    setAuthProvider(provider: string | null) {
      this.authProvider = provider
    },

    setAuthClient(client: string | null) {
      this.authClient = client
      if (client) {
        storageManager.saveAuthClient(client)
      } else {
        storageManager.clearAuthClient()
      }
    },

    clearAuth() {
      this.token = null
      this.user = null
      this.permissions = {}
      this.entityAccess = emptyEntityAccess()
      this.authProvider = null
      this.authClient = null
      this.tokenExpirationDate = null
      this.isAuthenticated = false
      this.isRefreshing = false
      this.tokenExpired = false
      this.errorMessage = null
      this.isRunningAs = false
      this.originalUser = null
      // The expiry warning is tied to the active session — once auth is
      // cleared (logout, cross-tab sync, refresh failure) the modal must
      // not linger above whatever comes next.
      this.sessionExpiryModalOpen = false
      this.sessionExpiresAt = null

      storageManager.clearAll()
      this.cancelRefreshTimer()

      // Clear permission cache on logout
      permissionService.clearCache()
    },

    setRunAsState(targetUser: UserInfo) {
      // Save original user if not already running as someone
      if (!this.isRunningAs && this.user) {
        this.originalUser = this.user
      }
      this.isRunningAs = true
      this.user = targetUser
    },

    exitRunAsState(originalUser: UserInfo) {
      this.isRunningAs = false
      this.user = originalUser
      this.originalUser = null
    },

    setError(message: string | null) {
      this.errorMessage = message
    },

    setAuthenticating(isAuthenticating: boolean) {
      this.isAuthenticating = isAuthenticating
    },

    setRefreshing(isRefreshing: boolean) {
      this.isRefreshing = isRefreshing
    },

    openLoginModal() {
      // The login modal supersedes the session-expiry warning: once we're
      // forcing re-auth, the "your session is about to expire" prompt is
      // moot. Without this, the two render simultaneously when expiry
      // races with a 401 (authInterceptor, sessionSync, route guard) or
      // when the warning's countdown hits zero and handleExpired fires.
      if (this.sessionExpiryModalOpen) {
        this.sessionExpiryModalOpen = false
      }
      const now = Date.now()
      if (now - lastModalOpenTime < MODAL_DEBOUNCE_MS || this.loginModalOpen) {
        return
      }
      lastModalOpenTime = now
      this.loginModalOpen = true
    },

    closeLoginModal() {
      this.loginModalOpen = false
      this.errorMessage = null
      lastModalOpenTime = 0
    },

    scheduleTokenRefresh() {
      if (!this.token) return

      this.cancelRefreshTimer()

      const timeoutId = refreshManager.scheduleRefresh(
        this.token,
        getAuthConfig().refreshTokenThreshold,
        async () => {
          return await this.performTokenRefresh()
        }
      )

      if (timeoutId !== null) {
        this.refreshTimeoutId = timeoutId
      }
    },

    async performTokenRefresh(): Promise<boolean> {
      logger.debug('Auth', 'Performing token refresh...')
      try {
        const { authService } = await import('@/services/auth/authService')
        const success = await authService.refreshToken()

        if (success) {
          logger.info('Auth', 'Token refreshed successfully')
          // Token is already updated in the store by authService.refreshToken()
          return true
        } else {
          logger.warn('Auth', 'Token refresh failed')
          // If refresh fails, clear auth and show login modal
          this.clearAuth()
          this.openLoginModal()
          this.setError('Your session has expired. Please sign in again.')
          return false
        }
      } catch (error) {
        logger.error('Auth', 'Token refresh error', error)
        this.clearAuth()
        this.openLoginModal()
        this.setError('Your session has expired. Please sign in again.')
        return false
      }
    },

    cancelRefreshTimer() {
      if (this.refreshTimeoutId !== null) {
        clearTimeout(this.refreshTimeoutId)
        this.refreshTimeoutId = null
      }
    },

    /**
     * Synchronous part of auth restoration. Reads the token from
     * localStorage and applies it to the store immediately so route
     * guards see `isAuthenticated = true` on the very first
     * navigation. Must be called BEFORE `app.mount()` — otherwise
     * the initial-route beforeEach fires with an empty store and
     * opens the login modal even though the token is valid.
     */
    hydrateAuth() {
      const token = storageManager.getToken()
      const authClient = storageManager.getAuthClient()

      if (token) {
        this.setToken(token)
      }
      if (authClient) {
        this.setAuthClient(authClient)
      }
    },

    async initializeFromStorage() {
      // Make sure the synchronous hydration has run, in case this
      // path is hit by a caller that didn't hit hydrateAuth() first.
      if (!this.token) {
        this.hydrateAuth()
      }
      const token = this.token

      if (token) {
        // Fetch user info if we have a valid token
        if (!this.tokenExpired && this.isTokenValid) {
          try {
            const { authService } = await import('@/services/auth/authService')
            const userInfo = await authService.fetchUserInfo()
            this.setUser(userInfo)
          } catch (error) {
            logger.error('Auth', 'Failed to fetch user info on init', error)
            this.clearAuth()
            if (getAuthConfig().userAuthenticationEnabled) {
              this.openLoginModal()
            }
          }
        }
      }

      this.setupCrossTabSync()
    },

    setupCrossTabSync() {
      storageHandler = event => {
        if (event.key === 'bearerToken' && event.storageArea === localStorage) {
          if (syncDebounceTimer) {
            clearTimeout(syncDebounceTimer)
          }

          const newValue = event.newValue

          syncDebounceTimer = setTimeout(async () => {
            syncDebounceTimer = null

            if (newValue) {
              if (newValue !== this.token) {
                this.setToken(newValue)
                if (!this.tokenExpired && this.isTokenValid) {
                  try {
                    const { authService } = await import('@/services/auth/authService')
                    const userInfo = await authService.fetchUserInfo()
                    this.setUser(userInfo)
                  } catch (error) {
                    logger.error('Auth', 'Failed to fetch user info on tab sync', error)
                  }
                }
              }
            } else if (this.token) {
              this.clearAuth()
            }
          }, SYNC_DEBOUNCE_MS)
        }
      }
      window.addEventListener('storage', storageHandler)
    },

    showSessionExpiryModal(expiresAt: Date) {
      // If the login modal is already up, the session-expiry warning is
      // redundant — the user is being asked to re-authenticate anyway.
      // Skipping here also prevents the expiry timer from showing the
      // warning after a 401 has already cleared auth.
      if (this.loginModalOpen) return
      this.sessionExpiryModalOpen = true
      this.sessionExpiresAt = expiresAt
    },

    hideSessionExpiryModal() {
      this.sessionExpiryModalOpen = false
    },

    async extendSession(): Promise<void> {
      try {
        const { tokenRefreshService } = await import('@/services/auth/tokenRefresh')
        await tokenRefreshService.refreshToken()
        this.hideSessionExpiryModal()
      } catch (error) {
        logger.error('Auth', 'Failed to extend session', error)
        throw error
      }
    },

    dispose() {
      if (storageHandler) {
        window.removeEventListener('storage', storageHandler)
        storageHandler = null
      }
    },
  },
})
