/**
 * Auth Service Tests
 * Tests for authentication operations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock dependencies before importing authService
vi.mock('@/config/auth.config', () => ({
  authConfig: {
    webAPIRoot: 'http://test-api.com',
    userAuthenticationEnabled: true,
    refreshTokenThreshold: 300000,
  },
}))

vi.mock('@/services/auth/storageManager', () => ({
  storageManager: {
    getAuthClient: vi.fn(),
    saveAuthClient: vi.fn(),
    clearAuthClient: vi.fn(),
    clearAll: vi.fn(),
    saveToken: vi.fn(),
    getToken: vi.fn(),
    getLogoutUrl: vi.fn(),
  },
}))

vi.mock('@/services/auth/tokenManager', () => ({
  tokenManager: {
    parseToken: vi.fn().mockReturnValue({
      subject: 'testuser',
      expirationDate: new Date(Date.now() + 3600000),
      isExpired: false,
    }),
    isTokenExpired: vi.fn().mockReturnValue(false),
  },
}))

vi.mock('@/services/auth/refreshManager', () => ({
  refreshManager: {
    scheduleRefresh: vi.fn(),
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

import { authService } from '@/services/auth/authService'
import { storageManager } from '@/services/auth/storageManager'
import { tokenManager } from '@/services/auth/tokenManager'
import { useAuthStore } from '@/stores/auth'

// Helper to create a proper headers mock with all required methods
function createHeadersMock(headersMap: Record<string, string> = {}): Headers {
  const map = new Map(Object.entries(headersMap))
  return {
    has: (name: string) => map.has(name),
    get: (name: string) => map.get(name) || null,
    entries: () => map.entries(),
    [Symbol.iterator]: () => map.entries(),
  } as unknown as Headers
}

describe('AuthService', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Re-setup tokenManager mock after clearAllMocks
    vi.mocked(tokenManager.parseToken).mockReturnValue({
      subject: 'testuser',
      expirationDate: new Date(Date.now() + 3600000),
      isExpired: false,
      payload: {},
    })
    vi.mocked(tokenManager.isTokenExpired).mockReturnValue(false)

    // Mock fetch globally
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectIAP', () => {
    it('should return true when IAP header is present', async () => {
      mockFetch.mockResolvedValueOnce({
        headers: createHeadersMock({ 'x-goog-iap-jwt-assertion': 'token' }),
      })

      const result = await authService.detectIAP()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/info', {
        method: 'HEAD',
      })
    })

    it('should return false when IAP header is not present', async () => {
      mockFetch.mockResolvedValueOnce({
        headers: createHeadersMock({}),
      })

      const result = await authService.detectIAP()

      expect(result).toBe(false)
    })

    it('should return false on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await authService.detectIAP()

      expect(result).toBe(false)
    })
  })

  describe('loginWithIAP', () => {
    it('should authenticate via IAP and set user', async () => {
      const mockToken = 'iap-token'
      const mockUserInfo = {
        login: 'iapuser',
        name: 'IAP User',
        email: 'iap@example.com',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({ 'Bearer': mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({}),
          json: () => Promise.resolve(mockUserInfo),
        })

      await authService.loginWithIAP()

      const authStore = useAuthStore()
      expect(authStore.token).toBe(mockToken)
      expect(authStore.authClient).toBe('IAP')
      expect(authStore.user?.login).toBe('iapuser')
    })

    it('should throw error on IAP authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        headers: createHeadersMock({}),
      })

      await expect(authService.loginWithIAP()).rejects.toThrow('IAP authentication failed')
    })

    it('should throw error when no token received from IAP', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
      })

      await expect(authService.loginWithIAP()).rejects.toThrow('No token received from IAP authentication')
    })
  })

  describe('login', () => {
    it('should authenticate with credentials', async () => {
      const mockToken = 'test-token'
      const mockUserInfo = {
        login: 'testuser',
        name: 'Test User',
        email: 'test@example.com',
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({ 'Bearer': mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({}),
          json: () => Promise.resolve(mockUserInfo),
        })

      await authService.login('user/login/db', {
        username: 'testuser',
        password: 'password123',
      })

      const authStore = useAuthStore()
      expect(authStore.token).toBe(mockToken)
      expect(authStore.user?.login).toBe('testuser')
    })

    it('should redirect for OAuth provider without credentials', async () => {
      const originalLocation = window.location
      delete (window as unknown as { location: unknown }).location
      window.location = { href: '', hash: '#/home' } as Location

      await authService.login('user/login/google')

      expect(window.location.href).toContain('user/login/google')
      expect(window.location.href).toContain('redirectUrl=')

      window.location = originalLocation
    })

    it('should throw error on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: createHeadersMock({ 'x-auth-error': 'Invalid credentials' }),
        text: () => Promise.resolve(''),
      })

      await expect(
        authService.login('user/login/db', {
          username: 'testuser',
          password: 'wrong',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should throw error when no token received', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
      })

      await expect(
        authService.login('user/login/db', {
          username: 'testuser',
          password: 'password',
        })
      ).rejects.toThrow('No token received from server')
    })
  })

  describe('logout', () => {
    beforeEach(() => {
      const authStore = useAuthStore()
      authStore.setToken('existing-token')
    })

    it('should perform standard logout', async () => {
      vi.mocked(storageManager.getAuthClient).mockReturnValue('DB')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await authService.logout()

      const authStore = useAuthStore()
      expect(authStore.token).toBeNull()
    })

    it('should redirect for IAP logout', async () => {
      vi.mocked(storageManager.getAuthClient).mockReturnValue('IAP')

      // Mock fetch for the initial logout call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      // Create a location mock with setter tracking
      let capturedHref = ''
      const locationMock = {
        get href() { return capturedHref },
        set href(val: string) { capturedHref = val },
        origin: 'http://localhost:3000',
        pathname: '/',
      }

      // Store original and replace
      const originalLocation = window.location
      // @ts-expect-error - Replacing location for testing
      delete window.location
      // @ts-expect-error - Assigning mock location
      window.location = locationMock

      await authService.logout()

      expect(capturedHref).toBe('/_gcp_iap/clear_login_cookie')

      // Restore original
      // @ts-expect-error - Restoring original location
      window.location = originalLocation
    })

    it('should perform SAML logout', async () => {
      vi.mocked(storageManager.getAuthClient).mockReturnValue('SAML')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await authService.logout()

      const authStore = useAuthStore()
      expect(authStore.token).toBeNull()
    })

    it('should handle OIDC redirect in logout response', async () => {
      vi.mocked(storageManager.getAuthClient).mockReturnValue('OIDC')
      vi.mocked(storageManager.getLogoutUrl).mockReturnValue('https://oidc.example.com/logout')

      // Mock fetch for the initial logout call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      // Create a location mock with setter tracking
      let capturedHref = ''
      const locationMock = {
        get href() { return capturedHref },
        set href(val: string) { capturedHref = val },
        origin: 'http://localhost:3000',
        pathname: '/',
      }

      // Store original and replace
      const originalLocation = window.location
      // @ts-expect-error - Replacing location for testing
      delete window.location
      // @ts-expect-error - Assigning mock location
      window.location = locationMock

      await authService.logout()

      // The OIDC logout appends post_logout_redirect_uri parameter
      expect(capturedHref).toContain('https://oidc.example.com/logout')
      expect(capturedHref).toContain('post_logout_redirect_uri=')

      // Restore original
      // @ts-expect-error - Restoring original location
      window.location = originalLocation
    })

    it('should clear auth even on logout API failure', async () => {
      vi.mocked(storageManager.getAuthClient).mockReturnValue('DB')

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await authService.logout()

      const authStore = useAuthStore()
      expect(authStore.token).toBeNull()
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const authStore = useAuthStore()
      authStore.setToken('old-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({ 'Bearer': 'new-token' }),
      })

      const result = await authService.refreshToken()

      expect(result).toBe(true)
      expect(authStore.token).toBe('new-token')
    })

    it('should return false when no current token', async () => {
      const result = await authService.refreshToken()
      expect(result).toBe(false)
    })

    it('should return false on refresh failure', async () => {
      const authStore = useAuthStore()
      authStore.setToken('old-token')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        headers: createHeadersMock({}),
      })

      const result = await authService.refreshToken()

      expect(result).toBe(false)
    })

    it('should return false when no new token received', async () => {
      const authStore = useAuthStore()
      authStore.setToken('old-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
      })

      const result = await authService.refreshToken()

      expect(result).toBe(false)
    })

    it('should return false on network error', async () => {
      const authStore = useAuthStore()
      authStore.setToken('old-token')

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await authService.refreshToken()

      expect(result).toBe(false)
    })

    it('should send GET (not POST) to /user/refresh', async () => {
      const authStore = useAuthStore()
      authStore.setToken('old-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({ 'Bearer': 'new-token' }),
      })

      await authService.refreshToken()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('user/refresh'),
        expect.objectContaining({ method: 'GET' })
      )
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.body).toBeUndefined()
    })

    it('should fall back to body.jwt when Bearer header is absent (WebAPI 3.0)', async () => {
      const authStore = useAuthStore()
      authStore.setToken('old-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
        clone: () => ({
          json: () =>
            Promise.resolve({
              login: 'admin',
              jwt: 'new-token-from-body',
              roles: [],
              message: 'Refreshed Token in for session',
            }),
        }),
      })

      const result = await authService.refreshToken()

      expect(result).toBe(true)
      expect(authStore.token).toBe('new-token-from-body')
    })
  })

  describe('fetchUserInfo', () => {
    it('should fetch user info successfully', async () => {
      const authStore = useAuthStore()
      authStore.setToken('valid-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            login: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            permissions: { admin: ['*'] },
          }),
      })

      const userInfo = await authService.fetchUserInfo()

      expect(userInfo.login).toBe('testuser')
      expect(userInfo.displayName).toBe('Test User')
      expect(userInfo.email).toBe('test@example.com')
      expect(userInfo.permissionIdx).toEqual({ admin: ['*'] })
    })

    it('should use login as displayName when name is not provided', async () => {
      const authStore = useAuthStore()
      authStore.setToken('valid-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            login: 'testuser',
          }),
      })

      const userInfo = await authService.fetchUserInfo()

      expect(userInfo.displayName).toBe('testuser')
    })

    it('should throw error on fetch failure', async () => {
      const authStore = useAuthStore()
      authStore.setToken('valid-token')

      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      await expect(authService.fetchUserInfo()).rejects.toThrow('Failed to fetch user info')
    })
  })

  describe('runAs', () => {
    it('should run as another user successfully', async () => {
      const authStore = useAuthStore()
      authStore.setToken('admin-token')
      authStore.setUser({
        login: 'admin',
        displayName: 'Admin User',
        email: 'admin@example.com',
        permissionIdx: {},
      })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({ 'Bearer': 'impersonated-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({}),
          json: () =>
            Promise.resolve({
              login: 'targetuser',
              name: 'Target User',
            }),
        })

      await authService.runAs('targetuser')

      expect(authStore.token).toBe('impersonated-token')
    })

    it('should throw error on run-as failure', async () => {
      const authStore = useAuthStore()
      authStore.setToken('admin-token')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        headers: createHeadersMock({}),
      })

      await expect(authService.runAs('targetuser')).rejects.toThrow('Failed to run as user')
    })

    it('should throw error when no token received from run-as', async () => {
      const authStore = useAuthStore()
      authStore.setToken('admin-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
      })

      await expect(authService.runAs('targetuser')).rejects.toThrow('No token received from run-as')
    })
  })

  describe('exitRunAs', () => {
    it('should exit run-as successfully', async () => {
      const authStore = useAuthStore()
      authStore.setToken('impersonated-token')
      authStore.setUser({ login: 'targetuser', displayName: 'Target', permissionIdx: {} })
      authStore.setRunAsState({
        login: 'targetuser',
        displayName: 'Target User',
        permissionIdx: {},
      })
      // Manually set originalUser since setRunAsState works differently
      ;(authStore as unknown as { originalUser: unknown }).originalUser = {
        login: 'admin',
        displayName: 'Admin User',
        permissionIdx: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({ 'Bearer': 'original-token' }),
      })

      await authService.exitRunAs()

      expect(authStore.token).toBe('original-token')
    })

    it('should throw error when not running as another user', async () => {
      const authStore = useAuthStore()
      authStore.setToken('regular-token')

      await expect(authService.exitRunAs()).rejects.toThrow('Not currently running as another user')
    })

    it('should throw error on exit run-as API failure', async () => {
      const authStore = useAuthStore()
      authStore.setToken('impersonated-token')
      ;(authStore as unknown as { originalUser: unknown }).originalUser = {
        login: 'admin',
        displayName: 'Admin User',
        permissionIdx: {},
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        headers: createHeadersMock({}),
      })

      await expect(authService.exitRunAs()).rejects.toThrow('Failed to exit run-as')
    })
  })

  describe('fetchOAuthProviders', () => {
    it('should fetch OAuth providers successfully', async () => {
      const mockProviders = [
        { name: 'google', url: '/user/login/google' },
        { name: 'github', url: '/user/login/github' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProviders),
      })

      const providers = await authService.fetchOAuthProviders()

      // Check core properties, allowing for additional default fields
      expect(providers).toHaveLength(2)
      expect(providers[0].name).toBe('google')
      expect(providers[0].url).toBe('/user/login/google')
      expect(providers[1].name).toBe('github')
      expect(providers[1].url).toBe('/user/login/github')
    })

    it('should return empty array on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const providers = await authService.fetchOAuthProviders()

      expect(providers).toEqual([])
    })

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const providers = await authService.fetchOAuthProviders()

      expect(providers).toEqual([])
    })

    it('should return empty array for non-array response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ providers: [] }),
      })

      const providers = await authService.fetchOAuthProviders()

      expect(providers).toEqual([])
    })
  })
})
