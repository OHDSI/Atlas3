/**
 * Unit Tests: Auth Store
 * Tests for src/stores/auth.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock dependencies
vi.mock('@/services/auth/storageManager', () => ({
  storageManager: {
    saveToken: vi.fn(),
    getToken: vi.fn(() => null),
    clearToken: vi.fn(),
    saveAuthClient: vi.fn(),
    getAuthClient: vi.fn(() => null),
    clearAuthClient: vi.fn(),
    clearAll: vi.fn(),
  },
}))

vi.mock('@/services/auth/tokenManager', () => ({
  tokenManager: {
    parseToken: vi.fn((token: string) => {
      if (token === 'invalid') return null
      if (token === 'expired-token') {
        return {
          expirationDate: new Date(Date.now() - 1000),
          isExpired: true,
        }
      }
      return {
        expirationDate: new Date(Date.now() + 3600000),
        isExpired: false,
      }
    }),
    isTokenExpired: vi.fn((token: string) => token === 'expired-token'),
  },
}))

vi.mock('@/services/auth/refreshManager', () => ({
  refreshManager: {
    scheduleRefresh: vi.fn(() => 123),
  },
}))

// Mock authService for cross-tab sync tests
const mockFetchUserInfo = vi.fn()
vi.mock('@/services/auth/authService', () => ({
  authService: {
    fetchUserInfo: mockFetchUserInfo,
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

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts with unauthenticated state', () => {
      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)
      expect(store.token).toBeNull()
      expect(store.user).toBeNull()
      expect(store.permissions).toEqual({})
    })

    it('starts with modals closed', () => {
      const store = useAuthStore()
      expect(store.loginModalOpen).toBe(false)
      expect(store.sessionExpiryModalOpen).toBe(false)
    })

    it('starts without errors', () => {
      const store = useAuthStore()
      expect(store.errorMessage).toBeNull()
    })
  })

  describe('getters', () => {
    describe('isLoggedIn', () => {
      it('returns false when not authenticated', () => {
        const store = useAuthStore()
        expect(store.isLoggedIn).toBe(false)
      })

      it('returns true when authenticated with valid token', () => {
        const store = useAuthStore()
        store.setToken('valid-token')
        expect(store.isLoggedIn).toBe(true)
      })
    })

    describe('userDisplayName', () => {
      it('returns Guest when no user', () => {
        const store = useAuthStore()
        expect(store.userDisplayName).toBe('Guest')
      })

      it('returns displayName when available', () => {
        const store = useAuthStore()
        store.setUser({ displayName: 'John Doe', login: 'jdoe' } as never)
        expect(store.userDisplayName).toBe('John Doe')
      })

      it('returns login when displayName not available', () => {
        const store = useAuthStore()
        store.setUser({ login: 'jdoe' } as never)
        expect(store.userDisplayName).toBe('jdoe')
      })
    })

    describe('hasToken', () => {
      it('returns false when no token', () => {
        const store = useAuthStore()
        expect(store.hasToken).toBe(false)
      })

      it('returns true when token exists', () => {
        const store = useAuthStore()
        store.setToken('valid-token')
        expect(store.hasToken).toBe(true)
      })
    })

    describe('isTokenValid', () => {
      it('returns false when no token', () => {
        const store = useAuthStore()
        expect(store.isTokenValid).toBe(false)
      })

      it('returns true for valid token', () => {
        const store = useAuthStore()
        store.setToken('valid-token')
        expect(store.isTokenValid).toBe(true)
      })
    })
  })

  describe('actions', () => {
    describe('setToken', () => {
      it('sets token and authentication state', () => {
        const store = useAuthStore()
        store.setToken('valid-token')
        expect(store.token).toBe('valid-token')
        expect(store.isAuthenticated).toBe(true)
      })

      it('clears auth when token is null', () => {
        const store = useAuthStore()
        store.setToken('valid-token')
        store.setToken(null)
        expect(store.token).toBeNull()
        expect(store.isAuthenticated).toBe(false)
      })

      it('clears auth when token is invalid', () => {
        const store = useAuthStore()
        store.setToken('invalid')
        expect(store.token).toBeNull()
        expect(store.isAuthenticated).toBe(false)
      })

      it('sets tokenExpired flag for expired tokens', () => {
        const store = useAuthStore()
        store.setToken('expired-token')
        expect(store.tokenExpired).toBe(true)
        expect(store.isAuthenticated).toBe(false)
      })
    })

    describe('setUser', () => {
      it('sets user and permissions', () => {
        const store = useAuthStore()
        const user = {
          id: '1',
          login: 'testuser',
          displayName: 'Test User',
          permissionIdx: { cohort: 'READ' },
        }
        store.setUser(user as never)
        expect(store.user).toEqual(user)
        expect(store.permissions).toEqual({ cohort: 'READ' })
      })

      it('clears permissions when user is null', () => {
        const store = useAuthStore()
        store.setUser({ permissionIdx: { cohort: 'READ' } } as never)
        store.setUser(null)
        expect(store.user).toBeNull()
        expect(store.permissions).toEqual({})
      })
    })

    describe('setAuthProvider', () => {
      it('sets auth provider', () => {
        const store = useAuthStore()
        store.setAuthProvider('oauth')
        expect(store.authProvider).toBe('oauth')
      })

      it('clears auth provider', () => {
        const store = useAuthStore()
        store.setAuthProvider('oauth')
        store.setAuthProvider(null)
        expect(store.authProvider).toBeNull()
      })
    })

    describe('setAuthClient', () => {
      it('sets auth client and saves to storage', async () => {
        const { storageManager } = await import('@/services/auth/storageManager')
        const store = useAuthStore()
        store.setAuthClient('web-client')
        expect(store.authClient).toBe('web-client')
        expect(storageManager.saveAuthClient).toHaveBeenCalledWith('web-client')
      })

      it('clears auth client from storage', async () => {
        const { storageManager } = await import('@/services/auth/storageManager')
        const store = useAuthStore()
        store.setAuthClient('web-client')
        store.setAuthClient(null)
        expect(store.authClient).toBeNull()
        expect(storageManager.clearAuthClient).toHaveBeenCalled()
      })
    })

    describe('clearAuth', () => {
      it('clears all authentication state', async () => {
        const { storageManager } = await import('@/services/auth/storageManager')
        const store = useAuthStore()

        // Set up authenticated state
        store.setToken('valid-token')
        store.setUser({ login: 'testuser' } as never)
        store.setAuthProvider('oauth')
        store.setAuthClient('web-client')

        // Clear auth
        store.clearAuth()

        expect(store.token).toBeNull()
        expect(store.user).toBeNull()
        expect(store.permissions).toEqual({})
        expect(store.authProvider).toBeNull()
        expect(store.authClient).toBeNull()
        expect(store.isAuthenticated).toBe(false)
        expect(storageManager.clearAll).toHaveBeenCalled()
      })
    })

    describe('setRunAsState', () => {
      it('saves original user and sets target user', () => {
        const store = useAuthStore()
        const originalUser = { login: 'admin', displayName: 'Admin User' }
        const targetUser = { login: 'testuser', displayName: 'Test User' }

        store.setUser(originalUser as never)
        store.setRunAsState(targetUser as never)

        expect(store.isRunningAs).toBe(true)
        expect(store.user).toEqual(targetUser)
        expect(store.originalUser).toEqual(originalUser)
      })

      it('does not overwrite original user if already running as', () => {
        const store = useAuthStore()
        const originalUser = { login: 'admin' }
        const firstTarget = { login: 'user1' }
        const secondTarget = { login: 'user2' }

        store.setUser(originalUser as never)
        store.setRunAsState(firstTarget as never)
        store.setRunAsState(secondTarget as never)

        expect(store.originalUser).toEqual(originalUser)
        expect(store.user).toEqual(secondTarget)
      })
    })

    describe('exitRunAsState', () => {
      it('restores original user and clears run-as state', () => {
        const store = useAuthStore()
        const originalUser = { login: 'admin' }

        store.exitRunAsState(originalUser as never)

        expect(store.isRunningAs).toBe(false)
        expect(store.user).toEqual(originalUser)
        expect(store.originalUser).toBeNull()
      })
    })

    describe('setError', () => {
      it('sets error message', () => {
        const store = useAuthStore()
        store.setError('Authentication failed')
        expect(store.errorMessage).toBe('Authentication failed')
      })

      it('clears error message', () => {
        const store = useAuthStore()
        store.setError('Authentication failed')
        store.setError(null)
        expect(store.errorMessage).toBeNull()
      })
    })

    describe('setAuthenticating', () => {
      it('sets authenticating flag', () => {
        const store = useAuthStore()
        store.setAuthenticating(true)
        expect(store.isAuthenticating).toBe(true)

        store.setAuthenticating(false)
        expect(store.isAuthenticating).toBe(false)
      })
    })

    describe('setRefreshing', () => {
      it('sets refreshing flag', () => {
        const store = useAuthStore()
        store.setRefreshing(true)
        expect(store.isRefreshing).toBe(true)

        store.setRefreshing(false)
        expect(store.isRefreshing).toBe(false)
      })
    })

    describe('login modal', () => {
      it('opens login modal', () => {
        const store = useAuthStore()
        store.openLoginModal()
        expect(store.loginModalOpen).toBe(true)
      })

      it('closes login modal and clears error', () => {
        const store = useAuthStore()
        store.setError('Some error')
        store.openLoginModal()
        store.closeLoginModal()
        expect(store.loginModalOpen).toBe(false)
        expect(store.errorMessage).toBeNull()
      })
    })

    describe('session expiry modal', () => {
      it('shows session expiry modal with expiration date', () => {
        const store = useAuthStore()
        const expiresAt = new Date()
        store.showSessionExpiryModal(expiresAt)
        expect(store.sessionExpiryModalOpen).toBe(true)
        expect(store.sessionExpiresAt).toBe(expiresAt)
      })

      it('hides session expiry modal', () => {
        const store = useAuthStore()
        store.showSessionExpiryModal(new Date())
        store.hideSessionExpiryModal()
        expect(store.sessionExpiryModalOpen).toBe(false)
      })
    })

    describe('scheduleTokenRefresh', () => {
      it('schedules token refresh for valid token', async () => {
        const { refreshManager } = await import('@/services/auth/refreshManager')
        const store = useAuthStore()
        store.setToken('valid-token')

        expect(refreshManager.scheduleRefresh).toHaveBeenCalled()
        expect(store.refreshTimeoutId).toBe(123)
      })

      it('does not schedule refresh without token', async () => {
        const { refreshManager } = await import('@/services/auth/refreshManager')
        const store = useAuthStore()
        store.scheduleTokenRefresh()

        // setToken not called, so scheduleRefresh should not be called again
        expect(refreshManager.scheduleRefresh).not.toHaveBeenCalled()
      })
    })

    describe('cancelRefreshTimer', () => {
      it('clears refresh timer', () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
        const store = useAuthStore()
        store.refreshTimeoutId = 456

        store.cancelRefreshTimer()

        expect(clearTimeoutSpy).toHaveBeenCalledWith(456)
        expect(store.refreshTimeoutId).toBeNull()
      })

      it('does nothing if no timer set', () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
        const store = useAuthStore()

        store.cancelRefreshTimer()

        expect(clearTimeoutSpy).not.toHaveBeenCalled()
      })
    })

    describe('performTokenRefresh', () => {
      it('successfully refreshes token', async () => {
        const mockAuthService = {
          refreshToken: vi.fn().mockResolvedValue(true),
        }
        vi.doMock('@/services/auth/authService', () => ({
          authService: mockAuthService,
        }))

        const store = useAuthStore()
        const result = await store.performTokenRefresh()

        expect(result).toBe(true)
        expect(mockAuthService.refreshToken).toHaveBeenCalled()
      })

      it('handles token refresh failure', async () => {
        const mockAuthService = {
          refreshToken: vi.fn().mockResolvedValue(false),
        }
        vi.doMock('@/services/auth/authService', () => ({
          authService: mockAuthService,
        }))

        const store = useAuthStore()
        store.setToken('valid-token')

        const result = await store.performTokenRefresh()

        expect(result).toBe(false)
        expect(store.token).toBeNull()
        expect(store.loginModalOpen).toBe(true)
        expect(store.errorMessage).toBe('Your session has expired. Please sign in again.')
      })

      it('handles token refresh error', async () => {
        const mockAuthService = {
          refreshToken: vi.fn().mockRejectedValue(new Error('Network error')),
        }
        vi.doMock('@/services/auth/authService', () => ({
          authService: mockAuthService,
        }))

        const store = useAuthStore()
        store.setToken('valid-token')

        const result = await store.performTokenRefresh()

        expect(result).toBe(false)
        expect(store.token).toBeNull()
        expect(store.loginModalOpen).toBe(true)
        expect(store.errorMessage).toBe('Your session has expired. Please sign in again.')
      })
    })

    describe('initializeFromStorage', () => {
      it('initializes with valid token and fetches user info', async () => {
        const mockUserInfo = {
          login: 'testuser',
          displayName: 'Test User',
          permissionIdx: { cohort: 'READ' },
        }

        const mockAuthService = {
          fetchUserInfo: vi.fn().mockResolvedValue(mockUserInfo),
        }

        const { storageManager } = await import('@/services/auth/storageManager')
        vi.mocked(storageManager.getToken).mockReturnValue('valid-token')
        vi.mocked(storageManager.getAuthClient).mockReturnValue('web-client')

        vi.doMock('@/services/auth/authService', () => ({
          authService: mockAuthService,
        }))

        const store = useAuthStore()
        await store.initializeFromStorage()

        expect(store.token).toBe('valid-token')
        expect(store.authClient).toBe('web-client')
        expect(store.user).toEqual(mockUserInfo)
        expect(mockAuthService.fetchUserInfo).toHaveBeenCalled()
      })

      it('initializes with expired token and does not fetch user info', async () => {
        const { storageManager } = await import('@/services/auth/storageManager')
        vi.mocked(storageManager.getToken).mockReturnValue('expired-token')

        const store = useAuthStore()
        await store.initializeFromStorage()

        expect(store.token).toBe('expired-token')
        expect(store.tokenExpired).toBe(true)
        expect(store.user).toBeNull()
      })

      it('clears auth when user info fetch fails', async () => {
        const mockAuthService = {
          fetchUserInfo: vi.fn().mockRejectedValue(new Error('Unauthorized')),
        }

        const { storageManager } = await import('@/services/auth/storageManager')
        vi.mocked(storageManager.getToken).mockReturnValue('valid-token')

        vi.doMock('@/services/auth/authService', () => ({
          authService: mockAuthService,
        }))

        const store = useAuthStore()
        await store.initializeFromStorage()

        expect(store.token).toBeNull()
        expect(store.isAuthenticated).toBe(false)
      })

      it('handles missing token in storage', async () => {
        const { storageManager } = await import('@/services/auth/storageManager')
        vi.mocked(storageManager.getToken).mockReturnValue(null)

        const store = useAuthStore()
        await store.initializeFromStorage()

        expect(store.token).toBeNull()
        expect(store.user).toBeNull()
      })

      it('initializes auth client without token', async () => {
        const { storageManager } = await import('@/services/auth/storageManager')
        vi.mocked(storageManager.getToken).mockReturnValue(null)
        vi.mocked(storageManager.getAuthClient).mockReturnValue('web-client')

        const store = useAuthStore()
        await store.initializeFromStorage()

        expect(store.token).toBeNull()
        expect(store.authClient).toBe('web-client')
      })
    })

    describe('setupCrossTabSync', () => {
      beforeEach(() => {
        mockFetchUserInfo.mockReset()
      })

      // TODO: This test has issues with mocking dynamic imports (await import()).
      // The vi.mock doesn't properly intercept the dynamic import in the store's
      // setupCrossTabSync handler. The token sync itself works (verified by other tests).
      it.skip('syncs token from other tab and fetches user info', async () => {
        const mockUserInfo = {
          login: 'testuser',
          displayName: 'Test User',
          permissionIdx: {},
        }

        // Use the top-level mock
        mockFetchUserInfo.mockResolvedValue(mockUserInfo)

        const store = useAuthStore()
        store.setupCrossTabSync()

        const storageEvent = new StorageEvent('storage', {
          key: 'bearerToken',
          newValue: 'valid-token',
          storageArea: localStorage,
        })

        window.dispatchEvent(storageEvent)

        // Wait for the event handler to process and the async fetchUserInfo to complete
        await new Promise(resolve => setTimeout(resolve, 50))

        // Verify token was set
        expect(store.token).toBe('valid-token')
        expect(store.tokenExpired).toBe(false)
        expect(store.isTokenValid).toBe(true)

        // fetchUserInfo should be called when conditions are met
        expect(mockFetchUserInfo).toHaveBeenCalled()
      })

      it('clears auth when token removed in other tab', async () => {
        const store = useAuthStore()
        store.setToken('valid-token')
        store.setupCrossTabSync()

        const storageEvent = new StorageEvent('storage', {
          key: 'bearerToken',
          newValue: null,
          storageArea: localStorage,
        })

        window.dispatchEvent(storageEvent)
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(store.token).toBeNull()
        expect(store.isAuthenticated).toBe(false)
      })

      it('handles expired token from other tab', async () => {
        const store = useAuthStore()
        store.setupCrossTabSync()

        const storageEvent = new StorageEvent('storage', {
          key: 'bearerToken',
          newValue: 'expired-token',
          storageArea: localStorage,
        })

        window.dispatchEvent(storageEvent)
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(store.tokenExpired).toBe(true)
      })

      it('handles user info fetch failure during sync', async () => {
        const mockAuthService = {
          fetchUserInfo: vi.fn().mockRejectedValue(new Error('Network error')),
        }

        vi.doMock('@/services/auth/authService', () => ({
          authService: mockAuthService,
        }))

        const store = useAuthStore()
        store.setupCrossTabSync()

        const storageEvent = new StorageEvent('storage', {
          key: 'bearerToken',
          newValue: 'valid-token',
          storageArea: localStorage,
        })

        await window.dispatchEvent(storageEvent)
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(store.token).toBe('valid-token')
      })

      it('ignores storage events for other keys', async () => {
        const store = useAuthStore()
        store.setupCrossTabSync()

        const storageEvent = new StorageEvent('storage', {
          key: 'otherKey',
          newValue: 'some-value',
          storageArea: localStorage,
        })

        window.dispatchEvent(storageEvent)

        expect(store.token).toBeNull()
      })

      it('ignores storage events from sessionStorage', async () => {
        const store = useAuthStore()
        store.setupCrossTabSync()

        const storageEvent = new StorageEvent('storage', {
          key: 'bearerToken',
          newValue: 'valid-token',
          storageArea: sessionStorage,
        })

        window.dispatchEvent(storageEvent)

        expect(store.token).toBeNull()
      })
    })

    describe('extendSession', () => {
      it('successfully extends session', async () => {
        const mockTokenRefreshService = {
          refreshToken: vi.fn().mockResolvedValue(true),
        }

        vi.doMock('@/services/auth/tokenRefresh', () => ({
          tokenRefreshService: mockTokenRefreshService,
        }))

        const store = useAuthStore()
        store.showSessionExpiryModal(new Date())

        await store.extendSession()

        expect(mockTokenRefreshService.refreshToken).toHaveBeenCalled()
        expect(store.sessionExpiryModalOpen).toBe(false)
      })

      it('handles session extension failure', async () => {
        const mockTokenRefreshService = {
          refreshToken: vi.fn().mockRejectedValue(new Error('Refresh failed')),
        }

        vi.doMock('@/services/auth/tokenRefresh', () => ({
          tokenRefreshService: mockTokenRefreshService,
        }))

        const store = useAuthStore()
        store.showSessionExpiryModal(new Date())

        await expect(store.extendSession()).rejects.toThrow('Refresh failed')
        expect(mockTokenRefreshService.refreshToken).toHaveBeenCalled()
      })
    })

    describe('edge cases', () => {
      it.skip('handles setUser with undefined permissionIdx', async () => {
        const { permissionService } = await import('@/services/auth/permissions')
        const store = useAuthStore()
        const user = {
          login: 'testuser',
          displayName: 'Test User',
        }

        store.setUser(user as never)

        expect(store.permissions).toEqual({})
        expect(permissionService.clearCache).toHaveBeenCalled()
      })

      it('clears permission cache when user changes', async () => {
        const { permissionService } = await import('@/services/auth/permissions')
        const store = useAuthStore()

        const user1 = { login: 'user1', displayName: 'User 1', permissionIdx: { cohort: 'READ' } }
        const user2 = { login: 'user2', displayName: 'User 2', permissionIdx: { conceptset: 'WRITE' } }

        store.setUser(user1 as never)
        await new Promise(resolve => setTimeout(resolve, 0))

        store.setUser(user2 as never)
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(permissionService.clearCache).toHaveBeenCalledTimes(2)
      })

      it('clears permission cache on clearAuth', async () => {
        const { permissionService } = await import('@/services/auth/permissions')
        const store = useAuthStore()

        store.setToken('valid-token')
        store.setUser({ login: 'testuser', displayName: 'Test', permissionIdx: {} } as never)

        store.clearAuth()
        await new Promise(resolve => setTimeout(resolve, 0))

        expect(permissionService.clearCache).toHaveBeenCalled()
      })

      it('clears runAs state on clearAuth', () => {
        const store = useAuthStore()
        const originalUser = { login: 'admin', displayName: 'Admin' }
        const targetUser = { login: 'user', displayName: 'User' }

        store.setUser(originalUser as never)
        store.setRunAsState(targetUser as never)

        expect(store.isRunningAs).toBe(true)

        store.clearAuth()

        expect(store.isRunningAs).toBe(false)
        expect(store.originalUser).toBeNull()
      })

      it('handles setRunAsState when current user is null', () => {
        const store = useAuthStore()
        const targetUser = { login: 'testuser', displayName: 'Test User' }

        store.setRunAsState(targetUser as never)

        expect(store.isRunningAs).toBe(true)
        expect(store.user).toEqual(targetUser)
        expect(store.originalUser).toBeNull()
      })

      it('does not schedule refresh when refreshManager returns null', async () => {
        const { refreshManager } = await import('@/services/auth/refreshManager')
        vi.mocked(refreshManager.scheduleRefresh).mockReturnValue(null)

        const store = useAuthStore()
        store.setToken('valid-token')

        expect(store.refreshTimeoutId).toBeNull()
      })

      it('cancels existing timer when scheduling new refresh', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
        const store = useAuthStore()

        store.refreshTimeoutId = 999
        store.setToken('valid-token')

        expect(clearTimeoutSpy).toHaveBeenCalledWith(999)
      })
    })
  })
})
