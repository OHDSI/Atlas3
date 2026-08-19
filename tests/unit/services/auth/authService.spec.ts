/**
 * Auth Service Tests
 * Tests for authentication operations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock dependencies before importing authService
vi.mock('@/config/auth.config', () => ({
  getAuthConfig: () => ({
    webAPIRoot: 'http://test-api.com',
    userAuthenticationEnabled: true,
    refreshTokenThreshold: 300000,
  }),
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
import type { AuthProvider } from '@/models/auth.types'

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

const credentialsProvider: AuthProvider = {
  name: 'Database',
  url: 'user/login/db',
  ajax: true,
  icon: 'mdi-database',
  isUseCredentialsForm: true,
}

const redirectProvider: AuthProvider = {
  name: 'Google',
  url: 'user/login/google',
  ajax: false,
  icon: 'mdi-google',
  isUseCredentialsForm: false,
}

const ajaxProvider: AuthProvider = {
  name: 'Windows',
  url: 'user/login/windows',
  ajax: true,
  icon: 'mdi-microsoft-windows',
  isUseCredentialsForm: false,
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
          headers: createHeadersMock({}),
          json: () => Promise.resolve({ login: 'testuser', jwt: mockToken, roles: [], message: 'Login successful' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({}),
          json: () => Promise.resolve(mockUserInfo),
        })

      await authService.login(credentialsProvider, {
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

      await authService.login(redirectProvider)

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
        authService.login(credentialsProvider, {
          username: 'testuser',
          password: 'wrong',
        })
      ).rejects.toThrow('Invalid credentials')
    })

    it('should throw error when no token received', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
        json: () => Promise.resolve({ login: null, jwt: null, roles: null, message: 'User not found' }),
      })

      await expect(
        authService.login(credentialsProvider, {
          username: 'testuser',
          password: 'password',
        })
      ).rejects.toThrow('User not found')
    })

    it('should authenticate via AJAX provider using Bearer header token', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: createHeadersMock({ Bearer: 'ajax-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({}),
          json: () => Promise.resolve({ login: 'ajaxuser', name: 'Ajax User' }),
        })

      await authService.login(ajaxProvider)

      const authStore = useAuthStore()
      expect(authStore.token).toBe('ajax-token')
      expect(authStore.user?.login).toBe('ajaxuser')
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://test-api.com/user/login/windows',
        expect.objectContaining({ method: 'GET', credentials: 'include' })
      )
    })

    it('should authenticate via AJAX provider using JSON jwt fallback', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: createHeadersMock({}),
          json: () => Promise.resolve({ jwt: 'body-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: createHeadersMock({}),
          json: () => Promise.resolve({ login: 'ajaxuser', name: 'Ajax User' }),
        })

      await authService.login(ajaxProvider)

      const authStore = useAuthStore()
      expect(authStore.token).toBe('body-token')
      expect(authStore.user?.login).toBe('ajaxuser')
    })

    it('should throw error on ajax login failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: createHeadersMock({ 'x-auth-error': 'Integrated auth failed' }),
        text: () => Promise.resolve(''),
      })

      await expect(authService.login(ajaxProvider)).rejects.toThrow('Integrated auth failed')
    })

    it('should throw error when ajax login returns no token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: createHeadersMock({}),
        json: () => Promise.resolve({}),
      })

      await expect(authService.login(ajaxProvider)).rejects.toThrow(
        'No token received from server'
      )
    })

    it('should throw when credentials provider is invoked without credentials', async () => {
      await expect(authService.login(credentialsProvider)).rejects.toThrow(
        'Credentials are required for this authentication provider'
      )
    })
  })

  describe('redeemOTC (#256)', () => {
    it('exchanges the one-time code for a JWT via /user/login/otc', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
        json: () =>
          Promise.resolve({ login: 'oidcuser', jwt: 'otc-jwt-token', roles: null, message: 'OTC redeemed successfully.' }),
      })

      const token = await authService.redeemOTC('the-otc-code')

      expect(token).toBe('otc-jwt-token')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/user/login/otc?code=the-otc-code',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('URL-encodes the code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
        json: () => Promise.resolve({ jwt: 'token' }),
      })

      await authService.redeemOTC('a code/with?special&chars')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api.com/user/login/otc?code=a%20code%2Fwith%3Fspecial%26chars',
        expect.anything()
      )
    })

    it('throws the server error message when the exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: createHeadersMock({ 'x-auth-error': 'OTC code invalid or expired' }),
        text: () => Promise.resolve(''),
      })

      await expect(authService.redeemOTC('expired-code')).rejects.toThrow(
        'OTC code invalid or expired'
      )
    })

    it('throws when the response has no jwt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: createHeadersMock({}),
        json: () => Promise.resolve({ login: null, jwt: null, message: 'OTC code invalid or expired' }),
      })

      await expect(authService.redeemOTC('expired-code')).rejects.toThrow(
        'OTC code invalid or expired'
      )
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

    it('should send an Authorization header when a token is present', async () => {
      vi.mocked(storageManager.getAuthClient).mockReturnValue('DB')
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

      await authService.logout()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('user/logout'),
        expect.objectContaining({ headers: { Authorization: 'Bearer existing-token' } })
      )
    })

    it('should omit the Authorization header when there is no token', async () => {
      const authStore = useAuthStore()
      authStore.clearAuth()
      vi.mocked(storageManager.getAuthClient).mockReturnValue('SAML')
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })

      await authService.logout()

      for (const call of mockFetch.mock.calls) {
        expect(call[1]?.headers).toEqual({})
      }
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const authStore = useAuthStore()
      authStore.setToken('old-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ login: 'admin', jwt: 'new-token', roles: [], message: 'Refreshed' }),
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
        json: () => Promise.resolve({ login: null, jwt: null, roles: null, message: 'No session.' }),
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
        json: () => Promise.resolve({ login: 'admin', jwt: 'new-token', roles: [], message: 'Refreshed' }),
      })

      await authService.refreshToken()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('user/refresh'),
        expect.objectContaining({ method: 'GET' })
      )
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect(init.body).toBeUndefined()
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

    it('parses the WebAPI 3.0 {user, authz} shape', async () => {
      const authStore = useAuthStore()
      authStore.setToken('valid-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: 1, login: 'ohdsi', name: 'OHDSI User' },
            authz: {
              permissions: [
                'read:cohort-definition',
                'write:cohort-definition',
                'create:conceptset',
                'admin:tags',
                'trexsql:d2e:*',
              ],
              cohortDefinitionAccess: { '7': { accessTypes: ['WRITE'], isOwner: true } },
              conceptSetAccess: {},
              cohortCharacterizationAccess: {},
              feAnalysisAccess: {},
              pathwayAccess: {},
              incidenceRateAccess: {},
              reusableAccess: {},
              sourceAccess: { sample: ['WRITE'] },
            },
          }),
      })

      const userInfo = await authService.fetchUserInfo()

      expect(userInfo.login).toBe('ohdsi')
      expect(userInfo.displayName).toBe('OHDSI User')
      // Permissions are bucketed by first colon segment (verb).
      expect(userInfo.permissionIdx.read).toContain('read:cohort-definition')
      expect(userInfo.permissionIdx.write).toContain('write:cohort-definition')
      expect(userInfo.permissionIdx.admin).toContain('admin:tags')
      // trexsqlCacheEnabled is derived from any trexsql:* permission.
      expect(userInfo.trexsqlCacheEnabled).toBe(true)
      expect(userInfo.entityAccess?.cohortDefinition['7']).toEqual({
        accessTypes: ['WRITE'],
        isOwner: true,
      })
      expect(userInfo.entityAccess?.source.sample).toEqual(['WRITE'])
    })

    it('falls back to legacy top-level shape', async () => {
      const authStore = useAuthStore()
      authStore.setToken('valid-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            login: 'legacy',
            name: 'Legacy User',
            permissions: { admin: ['admin:security'] },
          }),
      })

      const userInfo = await authService.fetchUserInfo()
      expect(userInfo.login).toBe('legacy')
      expect(userInfo.permissionIdx).toEqual({ admin: ['admin:security'] })
      // No trexsql:* perms, no explicit flag → false.
      expect(userInfo.trexsqlCacheEnabled).toBe(false)
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
          json: () => Promise.resolve({ login: 'targetuser', jwt: 'impersonated-token', roles: [], message: 'Login successful' }),
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
        json: () => Promise.resolve({ login: null, jwt: null, roles: null, message: 'User not found' }),
      })

      await expect(authService.runAs('targetuser')).rejects.toThrow('User not found')
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
