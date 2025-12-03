/**
 * Unit Tests: AuthService
 * Tests for src/services/auth/authService.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Create shared mock store object
const mockAuthStore = {
  token: 'test-token',
  user: null as Record<string, unknown> | null,
  originalUser: null as Record<string, unknown> | null,
  setAuthenticating: vi.fn(),
  setError: vi.fn(),
  setToken: vi.fn(),
  setAuthClient: vi.fn(),
  setUser: vi.fn(),
  clearAuth: vi.fn(),
  closeLoginModal: vi.fn(),
  setRefreshing: vi.fn(),
  setRunAsState: vi.fn(),
  exitRunAsState: vi.fn(),
}

// Mock stores and dependencies before importing the service
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('@/config/auth.config', () => ({
  authConfig: {
    webAPIRoot: 'https://api.example.com/WebAPI',
  },
}))

vi.mock('@/services/auth/storageManager', () => ({
  storageManager: {
    getAuthClient: vi.fn(() => null),
  },
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('AuthService', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let authService: typeof import('@/services/auth/authService').authService

  beforeEach(async () => {
    setActivePinia(createPinia())
    mockFetch = vi.fn()
    global.fetch = mockFetch

    // Reset mock store state
    mockAuthStore.token = 'test-token'
    mockAuthStore.user = null
    mockAuthStore.originalUser = null
    vi.clearAllMocks()

    // Re-import to get fresh instance
    const module = await import('@/services/auth/authService')
    authService = module.authService
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detectIAP', () => {
    it('returns true when IAP header is present', async () => {
      mockFetch.mockResolvedValueOnce({
        headers: new Headers({
          'x-goog-iap-jwt-assertion': 'test-value',
        }),
      })

      const result = await authService.detectIAP()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/WebAPI/info',
        { method: 'HEAD' }
      )
    })

    it('returns false when IAP header is not present', async () => {
      mockFetch.mockResolvedValueOnce({
        headers: new Headers({}),
      })

      const result = await authService.detectIAP()

      expect(result).toBe(false)
    })

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await authService.detectIAP()

      expect(result).toBe(false)
    })
  })

  describe('loginWithIAP', () => {
    it('sets token and fetches user info on successful IAP login', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ Bearer: 'iap-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              login: 'iap-user',
              name: 'IAP User',
              email: 'iap@test.com',
            }),
        })

      await authService.loginWithIAP()

      expect(mockAuthStore.setToken).toHaveBeenCalledWith('iap-token')
      expect(mockAuthStore.setAuthClient).toHaveBeenCalledWith('IAP')
    })

    it('throws error when IAP response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      await expect(authService.loginWithIAP()).rejects.toThrow('IAP authentication failed')
      expect(mockAuthStore.setError).toHaveBeenCalled()
    })

    it('throws error when no token received', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({}),
      })

      await expect(authService.loginWithIAP()).rejects.toThrow(
        'No token received from IAP authentication'
      )
      expect(mockAuthStore.setError).toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('performs credential login successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ Bearer: 'auth-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              login: 'testuser',
              name: 'Test User',
            }),
        })

      await authService.login('user/login/db', {
        username: 'testuser',
        password: 'testpass',
      })

      expect(mockAuthStore.setToken).toHaveBeenCalledWith('auth-token')
      expect(mockAuthStore.setUser).toHaveBeenCalled()
      expect(mockAuthStore.closeLoginModal).toHaveBeenCalled()
    })

    it('redirects for OAuth providers without credentials', async () => {
      const originalLocation = window.location
      delete (window as { location?: Location }).location
      window.location = { href: '', hash: '' } as Location

      await authService.login('user/login/google')

      expect(window.location.href).toContain('user/login/google')

      window.location = originalLocation
    })

    it('throws error on login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        headers: new Headers({ 'x-auth-error': 'Invalid credentials' }),
        text: () => Promise.resolve(''),
      })

      await expect(
        authService.login('user/login/db', {
          username: 'testuser',
          password: 'wrong',
        })
      ).rejects.toThrow('Invalid credentials')

      expect(mockAuthStore.setError).toHaveBeenCalledWith('Invalid credentials')
    })

    it('throws error when no token received', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({}),
      })

      await expect(
        authService.login('user/login/db', {
          username: 'testuser',
          password: 'testpass',
        })
      ).rejects.toThrow('No token received from server')
    })
  })

  describe('logout', () => {
    it('performs standard logout and clears auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await authService.logout()

      expect(mockAuthStore.clearAuth).toHaveBeenCalled()
    })

    it('handles logout with OIDC redirect', async () => {
      const originalLocation = window.location
      delete (window as { location?: Location }).location
      window.location = { href: '' } as Location

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ redirect: 'https://oidc.logout.url' }),
      })

      await authService.logout()

      expect(mockAuthStore.clearAuth).toHaveBeenCalled()
      expect(window.location.href).toBe('https://oidc.logout.url')

      window.location = originalLocation
    })

    it('clears auth even on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await authService.logout()

      expect(mockAuthStore.clearAuth).toHaveBeenCalled()
    })
  })

  describe('refreshToken', () => {
    it('refreshes token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ Bearer: 'new-token' }),
      })

      const result = await authService.refreshToken()

      expect(result).toBe(true)
      expect(mockAuthStore.setToken).toHaveBeenCalledWith('new-token')
      expect(mockAuthStore.setRefreshing).toHaveBeenCalledWith(false)
    })

    it('returns false when no current token', async () => {
      mockAuthStore.token = null

      const result = await authService.refreshToken()

      expect(result).toBe(false)
    })

    it('returns false on refresh failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      const result = await authService.refreshToken()

      expect(result).toBe(false)
    })

    it('returns false when no new token received', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({}),
      })

      const result = await authService.refreshToken()

      expect(result).toBe(false)
    })
  })

  describe('fetchUserInfo', () => {
    it('fetches and returns user info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            login: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            permissions: { admin: ['read', 'write'] },
          }),
      })

      const result = await authService.fetchUserInfo()

      expect(result).toEqual({
        login: 'testuser',
        name: 'Test User',
        displayName: 'Test User',
        email: 'test@example.com',
        permissionIdx: { admin: ['read', 'write'] },
      })
    })

    it('throws error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      await expect(authService.fetchUserInfo()).rejects.toThrow('Failed to fetch user info')
    })
  })

  describe('runAs', () => {
    it('switches to target user successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ Bearer: 'runas-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              login: 'targetuser',
              name: 'Target User',
            }),
        })

      await authService.runAs('targetuser')

      expect(mockAuthStore.setToken).toHaveBeenCalledWith('runas-token')
      expect(mockAuthStore.setRunAsState).toHaveBeenCalled()
    })

    it('throws error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      await expect(authService.runAs('targetuser')).rejects.toThrow('Failed to run as user')
    })
  })

  describe('exitRunAs', () => {
    it('exits run-as mode successfully', async () => {
      mockAuthStore.originalUser = { login: 'originaluser', name: 'Original User' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ Bearer: 'original-token' }),
      })

      await authService.exitRunAs()

      expect(mockAuthStore.setToken).toHaveBeenCalledWith('original-token')
    })

    it('throws error when not in run-as mode', async () => {
      mockAuthStore.originalUser = null

      await expect(authService.exitRunAs()).rejects.toThrow(
        'Not currently running as another user'
      )
    })
  })

  describe('fetchOAuthProviders', () => {
    it('fetches OAuth providers successfully', async () => {
      const mockProviders = [
        { name: 'google', displayName: 'Google', url: '/user/login/google' },
        { name: 'ldap', displayName: 'LDAP', url: '/user/login/ldap' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProviders),
      })

      const result = await authService.fetchOAuthProviders()

      expect(result).toEqual(mockProviders)
    })

    it('returns empty array on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await authService.fetchOAuthProviders()

      expect(result).toEqual([])
    })

    it('returns empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await authService.fetchOAuthProviders()

      expect(result).toEqual([])
    })

    it('returns empty array for non-array response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'not an array' }),
      })

      const result = await authService.fetchOAuthProviders()

      expect(result).toEqual([])
    })
  })
})
