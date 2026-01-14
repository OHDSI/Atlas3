/**
 * Auth Interceptor Tests
 * Tests for fetch interceptor that handles authentication errors
 *
 * NOTE: The interceptor is now simplified - it only handles 401 responses.
 * Token injection is done by the centralized http-client, not the interceptor.
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

    it('should pass through requests to underlying fetch', async () => {
      setupAuthInterceptor()

      await window.fetch('http://api.example.com/data')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://api.example.com/data',
        undefined
      )
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

    it('should NOT attempt token refresh on 403 response (handled by caller)', async () => {
      setupAuthInterceptor()

      const authStore = useAuthStore()
      authStore.setToken('test-token')
      const performRefreshSpy = vi.spyOn(authStore, 'performTokenRefresh')

      mockFetch.mockResolvedValueOnce({
        status: 403,
        ok: false,
      })

      await window.fetch('http://api.example.com/data')

      // 403 is no longer handled by the interceptor - it may mean
      // insufficient permissions, not an expired token
      expect(performRefreshSpy).not.toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
      setupAuthInterceptor()

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(window.fetch('http://api.example.com/data')).rejects.toThrow('Network error')
    })

    it('should handle URL object input', async () => {
      setupAuthInterceptor()

      await window.fetch(new URL('http://api.example.com/data'))

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should handle Request object input', async () => {
      setupAuthInterceptor()

      const request = new Request('http://api.example.com/data')
      await window.fetch(request)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should return response from underlying fetch', async () => {
      setupAuthInterceptor()

      const mockResponse = {
        status: 200,
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const response = await window.fetch('http://api.example.com/data')

      expect(response).toBe(mockResponse)
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
