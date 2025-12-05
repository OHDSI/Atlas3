/**
 * Auth Store Tests
 * Tests for authentication state management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import type { UserInfo } from '@/models/auth.types'

// Mock dependencies
vi.mock('@/services/auth/storageManager', () => ({
  storageManager: {
    saveToken: vi.fn(),
    getToken: vi.fn(),
    clearAll: vi.fn(),
    saveAuthClient: vi.fn(),
    clearAuthClient: vi.fn(),
    getAuthClient: vi.fn(),
  },
}))

vi.mock('@/services/auth/tokenManager', () => ({
  tokenManager: {
    parseToken: vi.fn(),
    isTokenExpired: vi.fn(),
  },
}))

vi.mock('@/services/auth/refreshManager', () => ({
  refreshManager: {
    scheduleRefresh: vi.fn(),
  },
}))

vi.mock('@/config/auth.config', () => ({
  authConfig: {
    userAuthenticationEnabled: true,
    refreshTokenThreshold: 300000,
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

vi.mock('@/services/auth/permissions', () => ({
  permissionService: {
    clearCache: vi.fn(),
  },
}))

vi.mock('@/services/auth/authService', () => ({
  authService: {
    refreshToken: vi.fn(),
    fetchUserInfo: vi.fn(),
  },
}))

vi.mock('@/services/auth/tokenRefresh', () => ({
  tokenRefreshService: {
    refreshToken: vi.fn(),
  },
}))

import { storageManager } from '@/services/auth/storageManager'
import { tokenManager } from '@/services/auth/tokenManager'
import { refreshManager } from '@/services/auth/refreshManager'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have null token initially', () => {
      const store = useAuthStore()
      expect(store.token).toBeNull()
    })

    it('should not be authenticated initially', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should have empty permissions initially', () => {
      const store = useAuthStore()
      expect(store.permissions).toEqual({})
    })

    it('should not have session expiry modal open initially', () => {
      const store = useAuthStore()
      expect(store.sessionExpiryModalOpen).toBe(false)
    })

    it('should not be running as another user initially', () => {
      const store = useAuthStore()
      expect(store.isRunningAs).toBe(false)
    })
  })

  describe('Getters', () => {
    it('isLoggedIn should return false when no token', () => {
      const store = useAuthStore()
      expect(store.isLoggedIn).toBe(false)
    })

    it('isLoggedIn should return true when authenticated with token', () => {
      const store = useAuthStore()
      store.token = 'test-token'
      store.isAuthenticated = true
      expect(store.isLoggedIn).toBe(true)
    })

    it('userDisplayName should return display name when available', () => {
      const store = useAuthStore()
      store.user = { displayName: 'John Doe', login: 'jdoe' } as UserInfo
      expect(store.userDisplayName).toBe('John Doe')
    })

    it('userDisplayName should return login when no display name', () => {
      const store = useAuthStore()
      store.user = { login: 'jdoe' } as UserInfo
      expect(store.userDisplayName).toBe('jdoe')
    })

    it('userDisplayName should return Guest when no user', () => {
      const store = useAuthStore()
      expect(store.userDisplayName).toBe('Guest')
    })

    it('hasToken should return false when no token', () => {
      const store = useAuthStore()
      expect(store.hasToken).toBe(false)
    })

    it('hasToken should return true when token exists', () => {
      const store = useAuthStore()
      store.token = 'test-token'
      expect(store.hasToken).toBe(true)
    })

    it('isTokenValid should return false when no token', () => {
      const store = useAuthStore()
      expect(store.isTokenValid).toBe(false)
    })

    it('isTokenValid should check token expiration', () => {
      const store = useAuthStore()
      store.token = 'test-token'
      vi.mocked(tokenManager.isTokenExpired).mockReturnValue(false)
      expect(store.isTokenValid).toBe(true)
    })

    it('isTokenValid should return false for expired token', () => {
      const store = useAuthStore()
      store.token = 'expired-token'
      vi.mocked(tokenManager.isTokenExpired).mockReturnValue(true)
      expect(store.isTokenValid).toBe(false)
    })
  })

  describe('setToken Action', () => {
    it('should clear auth when token is null', () => {
      const store = useAuthStore()
      store.token = 'existing-token'
      store.isAuthenticated = true

      store.setToken(null)

      expect(store.token).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should clear auth when token is invalid', () => {
      const store = useAuthStore()
      vi.mocked(tokenManager.parseToken).mockReturnValue(null)

      store.setToken('invalid-token')

      expect(store.token).toBeNull()
    })

    it('should set token when valid', () => {
      const store = useAuthStore()
      const expirationDate = new Date(Date.now() + 3600000)
      vi.mocked(tokenManager.parseToken).mockReturnValue({
        expirationDate,
        isExpired: false,
        payload: {},
      })
      vi.mocked(refreshManager.scheduleRefresh).mockReturnValue(123)

      store.setToken('valid-token')

      expect(store.token).toBe('valid-token')
      expect(store.tokenExpirationDate).toBe(expirationDate)
      expect(store.isAuthenticated).toBe(true)
      expect(storageManager.saveToken).toHaveBeenCalledWith('valid-token')
    })

    it('should mark as not authenticated when token is expired', () => {
      const store = useAuthStore()
      vi.mocked(tokenManager.parseToken).mockReturnValue({
        expirationDate: new Date(Date.now() - 1000),
        isExpired: true,
        payload: {},
      })

      store.setToken('expired-token')

      expect(store.tokenExpired).toBe(true)
      expect(store.isAuthenticated).toBe(false)
    })

    it('should schedule token refresh', () => {
      const store = useAuthStore()
      vi.mocked(tokenManager.parseToken).mockReturnValue({
        expirationDate: new Date(Date.now() + 3600000),
        isExpired: false,
        payload: {},
      })
      vi.mocked(refreshManager.scheduleRefresh).mockReturnValue(456)

      store.setToken('valid-token')

      expect(refreshManager.scheduleRefresh).toHaveBeenCalled()
      expect(store.refreshTimeoutId).toBe(456)
    })
  })

  describe('setUser Action', () => {
    it('should set user and permissions', () => {
      const store = useAuthStore()
      const user: UserInfo = {
        id: 1,
        login: 'jdoe',
        displayName: 'John Doe',
        permissionIdx: { 'cohort:read': true },
      } as UserInfo

      store.setUser(user)

      expect(store.user).toEqual(user)
      expect(store.permissions).toEqual({ 'cohort:read': true })
    })

    it('should clear permissions when user is null', () => {
      const store = useAuthStore()
      store.permissions = { 'cohort:read': true }

      store.setUser(null)

      expect(store.user).toBeNull()
      expect(store.permissions).toEqual({})
    })
  })

  describe('setAuthProvider Action', () => {
    it('should set auth provider', () => {
      const store = useAuthStore()
      store.setAuthProvider('oauth')
      expect(store.authProvider).toBe('oauth')
    })

    it('should allow null provider', () => {
      const store = useAuthStore()
      store.authProvider = 'oauth'
      store.setAuthProvider(null)
      expect(store.authProvider).toBeNull()
    })
  })

  describe('setAuthClient Action', () => {
    it('should set auth client and save to storage', () => {
      const store = useAuthStore()
      store.setAuthClient('test-client')
      expect(store.authClient).toBe('test-client')
      expect(storageManager.saveAuthClient).toHaveBeenCalledWith('test-client')
    })

    it('should clear auth client from storage when null', () => {
      const store = useAuthStore()
      store.setAuthClient(null)
      expect(store.authClient).toBeNull()
      expect(storageManager.clearAuthClient).toHaveBeenCalled()
    })
  })

  describe('clearAuth Action', () => {
    it('should clear all auth state', () => {
      const store = useAuthStore()
      store.token = 'test-token'
      store.user = { login: 'jdoe' } as UserInfo
      store.permissions = { 'cohort:read': true }
      store.isAuthenticated = true
      store.isRunningAs = true

      store.clearAuth()

      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.permissions).toEqual({})
      expect(store.isAuthenticated).toBe(false)
      expect(store.isRunningAs).toBe(false)
      expect(storageManager.clearAll).toHaveBeenCalled()
    })
  })

  describe('Run As State Actions', () => {
    it('setRunAsState should save original user and set target user', () => {
      const store = useAuthStore()
      const originalUser = { login: 'admin' } as UserInfo
      const targetUser = { login: 'testuser' } as UserInfo
      store.user = originalUser

      store.setRunAsState(targetUser)

      expect(store.isRunningAs).toBe(true)
      expect(store.originalUser).toEqual(originalUser)
      expect(store.user).toEqual(targetUser)
    })

    it('setRunAsState should not overwrite original user if already running as', () => {
      const store = useAuthStore()
      const firstOriginal = { login: 'admin' } as UserInfo
      const secondTarget = { login: 'user2' } as UserInfo
      store.user = firstOriginal
      store.setRunAsState({ login: 'user1' } as UserInfo)

      store.setRunAsState(secondTarget)

      expect(store.originalUser).toEqual(firstOriginal)
    })

    it('exitRunAsState should restore original user', () => {
      const store = useAuthStore()
      const originalUser = { login: 'admin' } as UserInfo
      store.isRunningAs = true
      store.originalUser = originalUser
      store.user = { login: 'testuser' } as UserInfo

      store.exitRunAsState(originalUser)

      expect(store.isRunningAs).toBe(false)
      expect(store.user).toEqual(originalUser)
      expect(store.originalUser).toBeNull()
    })
  })

  describe('Error and Status Actions', () => {
    it('setError should set error message', () => {
      const store = useAuthStore()
      store.setError('Test error')
      expect(store.errorMessage).toBe('Test error')
    })

    it('setAuthenticating should set authenticating status', () => {
      const store = useAuthStore()
      store.setAuthenticating(true)
      expect(store.isAuthenticating).toBe(true)
    })

    it('setRefreshing should set refreshing status', () => {
      const store = useAuthStore()
      store.setRefreshing(true)
      expect(store.isRefreshing).toBe(true)
    })
  })

  describe('Login Modal Actions', () => {
    it('openLoginModal should set loginModalOpen to true', () => {
      const store = useAuthStore()
      store.openLoginModal()
      expect(store.loginModalOpen).toBe(true)
    })

    it('closeLoginModal should set loginModalOpen to false and clear error', () => {
      const store = useAuthStore()
      store.loginModalOpen = true
      store.errorMessage = 'Some error'

      store.closeLoginModal()

      expect(store.loginModalOpen).toBe(false)
      expect(store.errorMessage).toBeNull()
    })
  })

  describe('Token Refresh Actions', () => {
    it('scheduleTokenRefresh should do nothing without token', () => {
      const store = useAuthStore()
      store.scheduleTokenRefresh()
      expect(refreshManager.scheduleRefresh).not.toHaveBeenCalled()
    })

    it('cancelRefreshTimer should clear timeout', () => {
      const store = useAuthStore()
      store.refreshTimeoutId = 123
      vi.spyOn(global, 'clearTimeout')

      store.cancelRefreshTimer()

      expect(clearTimeout).toHaveBeenCalledWith(123)
      expect(store.refreshTimeoutId).toBeNull()
    })

    it('performTokenRefresh should handle successful refresh', async () => {
      const store = useAuthStore()
      const { authService } = await import('@/services/auth/authService')
      vi.mocked(authService.refreshToken).mockResolvedValue(true)

      const result = await store.performTokenRefresh()

      expect(result).toBe(true)
    })

    it('performTokenRefresh should handle failed refresh', async () => {
      const store = useAuthStore()
      const { authService } = await import('@/services/auth/authService')
      vi.mocked(authService.refreshToken).mockResolvedValue(false)

      const result = await store.performTokenRefresh()

      expect(result).toBe(false)
      expect(store.loginModalOpen).toBe(true)
    })

    it('performTokenRefresh should handle error', async () => {
      const store = useAuthStore()
      const { authService } = await import('@/services/auth/authService')
      vi.mocked(authService.refreshToken).mockRejectedValue(new Error('Network error'))

      const result = await store.performTokenRefresh()

      expect(result).toBe(false)
      expect(store.loginModalOpen).toBe(true)
    })
  })

  describe('Session Expiry Modal Actions', () => {
    it('showSessionExpiryModal should open modal with expiry time', () => {
      const store = useAuthStore()
      const expiresAt = new Date()

      store.showSessionExpiryModal(expiresAt)

      expect(store.sessionExpiryModalOpen).toBe(true)
      expect(store.sessionExpiresAt).toBe(expiresAt)
    })

    it('hideSessionExpiryModal should close modal', () => {
      const store = useAuthStore()
      store.sessionExpiryModalOpen = true

      store.hideSessionExpiryModal()

      expect(store.sessionExpiryModalOpen).toBe(false)
    })

    it('extendSession should refresh token and hide modal', async () => {
      const store = useAuthStore()
      store.sessionExpiryModalOpen = true
      const { tokenRefreshService } = await import('@/services/auth/tokenRefresh')
      vi.mocked(tokenRefreshService.refreshToken).mockResolvedValue(undefined)

      await store.extendSession()

      expect(tokenRefreshService.refreshToken).toHaveBeenCalled()
      expect(store.sessionExpiryModalOpen).toBe(false)
    })

    it('extendSession should throw error on failure', async () => {
      const store = useAuthStore()
      const { tokenRefreshService } = await import('@/services/auth/tokenRefresh')
      vi.mocked(tokenRefreshService.refreshToken).mockRejectedValue(new Error('Failed'))

      await expect(store.extendSession()).rejects.toThrow('Failed')
    })
  })

  describe('initializeFromStorage Action', () => {
    it('should restore token from storage', async () => {
      const store = useAuthStore()
      vi.mocked(storageManager.getToken).mockReturnValue('stored-token')
      vi.mocked(storageManager.getAuthClient).mockReturnValue('stored-client')
      vi.mocked(tokenManager.parseToken).mockReturnValue({
        expirationDate: new Date(Date.now() + 3600000),
        isExpired: false,
        payload: {},
      })
      vi.mocked(tokenManager.isTokenExpired).mockReturnValue(false)
      const { authService } = await import('@/services/auth/authService')
      vi.mocked(authService.fetchUserInfo).mockResolvedValue({ login: 'jdoe' } as UserInfo)

      await store.initializeFromStorage()

      expect(store.token).toBe('stored-token')
      expect(store.authClient).toBe('stored-client')
    })

    it('should clear auth if user fetch fails', async () => {
      const store = useAuthStore()
      vi.mocked(storageManager.getToken).mockReturnValue('stored-token')
      vi.mocked(tokenManager.parseToken).mockReturnValue({
        expirationDate: new Date(Date.now() + 3600000),
        isExpired: false,
        payload: {},
      })
      vi.mocked(tokenManager.isTokenExpired).mockReturnValue(false)
      const { authService } = await import('@/services/auth/authService')
      vi.mocked(authService.fetchUserInfo).mockRejectedValue(new Error('Network error'))

      await store.initializeFromStorage()

      expect(store.token).toBeNull()
    })
  })
})
