import { defineStore } from 'pinia'
import type { AuthState, UserInfo } from '@/models/auth.types'
import { storageManager } from '@/services/auth/storageManager'
import { tokenManager } from '@/services/auth/tokenManager'
import { refreshManager } from '@/services/auth/refreshManager'
import { authConfig } from '@/config/auth.config'
import { logger } from '@/utils/logger'

// Storage handler reference for cleanup
let storageHandler: ((e: StorageEvent) => void) | null = null

export const useAuthStore = defineStore('auth', {
  state: (): AuthState & { refreshTimeoutId: number | null; isRunningAs: boolean; originalUser: UserInfo | null; sessionExpiryModalOpen: boolean; sessionExpiresAt: Date | null } => ({
    token: null,
    user: null,
    permissions: {},
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
    isLoggedIn: (state) => state.isAuthenticated && !!state.token,
    userDisplayName: (state) => state.user?.displayName || state.user?.login || 'Guest',
    hasToken: (state) => !!state.token,
    isTokenValid: (state) => {
      if (!state.token) return false
      return !tokenManager.isTokenExpired(state.token)
    },
    /** Whether TrexSQL cache feature is enabled on the server */
    trexsqlCacheEnabled: (state) => state.user?.trexsqlCacheEnabled ?? false,
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
      this.isAuthenticated = !parsedToken.isExpired && authConfig.userAuthenticationEnabled

      storageManager.saveToken(token)

      this.scheduleTokenRefresh()
    },

    setUser(user: UserInfo | null) {
      this.user = user
      if (user) {
        this.permissions = user.permissionIdx || {}
        
        // Clear permission cache when user changes
        import('@/services/auth/permissions').then(({ permissionService }) => {
          permissionService.clearCache()
        })
      } else {
        this.permissions = {}
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
      this.authProvider = null
      this.authClient = null
      this.tokenExpirationDate = null
      this.isAuthenticated = false
      this.isRefreshing = false
      this.tokenExpired = false
      this.errorMessage = null
      this.isRunningAs = false
      this.originalUser = null

      storageManager.clearAll()
      this.cancelRefreshTimer()
      
      // Clear permission cache on logout
      import('@/services/auth/permissions').then(({ permissionService }) => {
        permissionService.clearCache()
      })
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
      this.loginModalOpen = true
    },

    closeLoginModal() {
      this.loginModalOpen = false
      this.errorMessage = null
    },

    scheduleTokenRefresh() {
      if (!this.token) return

      this.cancelRefreshTimer()

      const timeoutId = refreshManager.scheduleRefresh(
        this.token,
        authConfig.refreshTokenThreshold,
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

    async initializeFromStorage() {
      const token = storageManager.getToken()
      const authClient = storageManager.getAuthClient()

      if (token) {
        this.setToken(token)
        
        // Fetch user info if we have a valid token
        if (!this.tokenExpired && this.isTokenValid) {
          try {
            const { authService } = await import('@/services/auth/authService')
            const userInfo = await authService.fetchUserInfo()
            this.setUser(userInfo)
          } catch (error) {
            logger.error('Auth', 'Failed to fetch user info on init', error)
            // Token might be invalid, clear auth
            this.clearAuth()
          }
        }
      }

      if (authClient) {
        this.setAuthClient(authClient)
      }

      this.setupCrossTabSync()
    },

    setupCrossTabSync() {
      storageHandler = async (event) => {
        if (event.key === 'bearerToken' && event.storageArea === localStorage) {
          if (event.newValue) {
            this.setToken(event.newValue)

            // Fetch user info for the new token
            if (!this.tokenExpired && this.isTokenValid) {
              try {
                const { authService } = await import('@/services/auth/authService')
                const userInfo = await authService.fetchUserInfo()
                this.setUser(userInfo)
              } catch (error) {
                logger.error('Auth', 'Failed to fetch user info on tab sync', error)
              }
            }
          } else {
            this.clearAuth()
          }
        }
      }
      window.addEventListener('storage', storageHandler)
    },

    showSessionExpiryModal(expiresAt: Date) {
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
