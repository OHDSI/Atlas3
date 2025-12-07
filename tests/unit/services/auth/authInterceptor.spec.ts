/**
 * Auth Interceptor Tests
 * Tests for fetch interceptor that handles authentication
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock tokenManager to prevent parseToken issues
vi.mock('@/services/auth/tokenManager', () => ({
  tokenManager: {
    parseToken: vi.fn().mockReturnValue({
      subject: 'testuser',
      expirationDate: new Date(Date.now() + 3600000),
      isExpired: false,
      payload: {},
    }),
    isTokenExpired: vi.fn().mockReturnValue(false),
    getExpirationDate: vi.fn().mockReturnValue(new Date(Date.now() + 3600000)),
  },
}))

// Mock dependencies
vi.mock('@/utils/jwt', () => ({
  getTokenExpiration: vi.fn(),
}))

vi.mock('@/services/auth/tokenRefresh', () => ({
  tokenRefreshService: {
    refreshToken: vi.fn(),
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

import { setupAuthInterceptor, addBearerToken } from '@/services/auth/authInterceptor'
import { useAuthStore } from '@/stores/auth'
import { getTokenExpiration } from '@/utils/jwt'
import { tokenRefreshService } from '@/services/auth/tokenRefresh'
import { tokenManager } from '@/services/auth/tokenManager'

describe('AuthInterceptor', () => {
  let originalWindowFetch: typeof fetch
  let originalGlobalFetch: typeof fetch
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
    vi.mocked(tokenManager.getExpirationDate).mockReturnValue(new Date(Date.now() + 3600000))

    // Store original fetch (both window and global in case they differ)
    originalWindowFetch = window.fetch
    originalGlobalFetch = global.fetch

    // Create mock fetch
    mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    })
    // Mock both window.fetch and global.fetch
    window.fetch = mockFetch
    global.fetch = mockFetch
  })

  afterEach(() => {
    // Restore original fetch
    window.fetch = originalWindowFetch
    global.fetch = originalGlobalFetch
    vi.restoreAllMocks()
  })

  describe('setupAuthInterceptor', () => {
    it('should replace window fetch', () => {
      setupAuthInterceptor()

      expect(window.fetch).not.toBe(mockFetch)
    })

    it('should add Authorization header when token is present', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('test-token')

      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 3600000)) // 1 hour from now

      await window.fetch('http://api.example.com/data')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.example.com/data',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      )

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer test-token')
    })

    it('should not add Authorization header when no token', async () => {
      setupAuthInterceptor()

      await window.fetch('http://api.example.com/data')

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers | undefined
      // When no token, headers may not be set at all, or Authorization should not be present
      const authHeader = headers?.get?.('Authorization') ?? null
      expect(authHeader).toBeNull()
    })

    it('should refresh token when expiring soon', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('old-token')

      // Token expires in 3 minutes (less than 5 minute threshold)
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 180000))
      vi.mocked(tokenRefreshService.refreshToken).mockResolvedValue(undefined)

      await window.fetch('http://api.example.com/data')

      expect(tokenRefreshService.refreshToken).toHaveBeenCalled()
    })

    it('should not refresh token for refresh endpoint', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('test-token')

      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 180000)) // Expiring soon

      await window.fetch('http://api.example.com/user/refresh')

      expect(tokenRefreshService.refreshToken).not.toHaveBeenCalled()
    })

    it('should clear auth on 401 response', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('test-token')

      mockFetch.mockResolvedValueOnce({
        status: 401,
        ok: false,
      })

      await window.fetch('http://api.example.com/data')

      expect(authStore.token).toBeNull()
    })

    it('should attempt token refresh on 403 response', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('test-token')
      const performRefreshSpy = vi.spyOn(authStore, 'performTokenRefresh')

      mockFetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
      })

      await window.fetch('http://api.example.com/data')

      expect(performRefreshSpy).toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
      setupAuthInterceptor()

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(window.fetch('http://api.example.com/data')).rejects.toThrow('Network error')
    })

    it('should handle URL object input', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('test-token')

      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 3600000))

      await window.fetch(new URL('http://api.example.com/data'))

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should handle Request object input', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('test-token')

      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 3600000))

      const request = new Request('http://api.example.com/data')
      await window.fetch(request)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should use refreshed token after refresh', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('old-token')

      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 180000))
      vi.mocked(tokenRefreshService.refreshToken).mockImplementation(async () => {
        authStore.setToken('new-token')
      })

      await window.fetch('http://api.example.com/data')

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer new-token')
    })
  })

  describe('addBearerToken', () => {
    it('should add Bearer token to headers when authenticated', () => {
      const authStore = useAuthStore()
      authStore.setToken('test-token')

      const headers = addBearerToken({ 'Content-Type': 'application/json' })

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      })
    })

    it('should return original headers when no token', () => {
      const headers = addBearerToken({ 'Content-Type': 'application/json' })

      expect(headers).toEqual({ 'Content-Type': 'application/json' })
    })

    it('should work with empty headers', () => {
      const authStore = useAuthStore()
      authStore.setToken('test-token')

      const headers = addBearerToken()

      expect(headers).toEqual({
        Authorization: 'Bearer test-token',
      })
    })

    it('should work with default empty object', () => {
      const headers = addBearerToken()

      expect(headers).toEqual({})
    })
  })
})
