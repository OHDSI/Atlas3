/**
 * Unit Tests: AuthInterceptor Service
 * Tests for src/services/auth/authInterceptor.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock logger first
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock tokenRefreshService
vi.mock('@/services/auth/tokenRefresh', () => ({
  tokenRefreshService: {
    refreshToken: vi.fn().mockResolvedValue(true),
  },
}))

// Mock jwt utility
vi.mock('@/utils/jwt', () => ({
  getTokenExpiration: vi.fn(),
}))

import { setupAuthInterceptor, addBearerToken } from '@/services/auth/authInterceptor'
import { useAuthStore } from '@/stores/auth'
import { getTokenExpiration } from '@/utils/jwt'

describe('AuthInterceptor', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let realFetch: typeof fetch

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    realFetch = window.fetch
    mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    window.fetch = mockFetch
  })

  afterEach(() => {
    window.fetch = realFetch
  })

  describe('setupAuthInterceptor', () => {
    it('wraps window.fetch', () => {
      const beforeFetch = window.fetch

      setupAuthInterceptor()

      expect(window.fetch).not.toBe(beforeFetch)
    })

    it('adds Authorization header when token exists', async () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token' })

      // Mock getTokenExpiration to return future date (no refresh needed)
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 3600000))

      setupAuthInterceptor()

      await window.fetch('https://api.example.com/data')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      )

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer test-token')
    })

    it('does not add Authorization header when no token', async () => {
      setupAuthInterceptor()

      await window.fetch('https://api.example.com/data')

      expect(mockFetch).toHaveBeenCalled()
    })

    it('triggers token refresh when close to expiry', async () => {
      const { tokenRefreshService } = await import('@/services/auth/tokenRefresh')
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token' })

      // Token expires in 3 minutes (< 5 minute threshold)
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 180000))

      setupAuthInterceptor()

      await window.fetch('https://api.example.com/data')

      expect(tokenRefreshService.refreshToken).toHaveBeenCalled()
    })

    it('does not refresh token when expiry is far away', async () => {
      const { tokenRefreshService } = await import('@/services/auth/tokenRefresh')
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token' })

      // Token expires in 30 minutes (> 5 minute threshold)
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 1800000))

      setupAuthInterceptor()

      await window.fetch('https://api.example.com/data')

      expect(tokenRefreshService.refreshToken).not.toHaveBeenCalled()
    })

    it('does not refresh for refresh endpoint', async () => {
      const { tokenRefreshService } = await import('@/services/auth/tokenRefresh')
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token' })

      // Token expires in 3 minutes
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 180000))

      setupAuthInterceptor()

      await window.fetch('https://api.example.com/user/refresh')

      expect(tokenRefreshService.refreshToken).not.toHaveBeenCalled()
    })

    it('handles 401 response by clearing auth and opening login modal', async () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token', isAuthenticated: true })
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 3600000))

      window.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
      setupAuthInterceptor()

      await window.fetch('https://api.example.com/data')

      expect(authStore.token).toBeNull()
      expect(authStore.loginModalOpen).toBe(true)
    })

    it('handles 403 response by attempting token refresh', async () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token' })
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 3600000))

      window.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }))
      setupAuthInterceptor()

      // Mock performTokenRefresh
      const performRefreshSpy = vi.spyOn(authStore, 'performTokenRefresh').mockResolvedValue()

      await window.fetch('https://api.example.com/data')

      expect(performRefreshSpy).toHaveBeenCalled()
    })

    it('handles URL object input', async () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token' })
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 3600000))

      setupAuthInterceptor()

      await window.fetch(new URL('https://api.example.com/data'))

      expect(mockFetch).toHaveBeenCalled()
    })

    it('handles Request object input', async () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token' })
      vi.mocked(getTokenExpiration).mockReturnValue(new Date(Date.now() + 3600000))

      setupAuthInterceptor()

      const request = new Request('https://api.example.com/data')
      await window.fetch(request)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('propagates fetch errors', async () => {
      const networkError = new Error('Network failure')
      window.fetch = vi.fn().mockRejectedValue(networkError)
      setupAuthInterceptor()

      await expect(window.fetch('https://api.example.com/data')).rejects.toThrow('Network failure')
    })

    it('handles token without expiration', async () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'test-token' })
      vi.mocked(getTokenExpiration).mockReturnValue(null)

      setupAuthInterceptor()

      await window.fetch('https://api.example.com/data')

      // Should still add token header even without expiration info
      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('Authorization')).toBe('Bearer test-token')
    })
  })

  describe('addBearerToken', () => {
    it('adds Authorization header when token exists', () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'my-token' })

      const result = addBearerToken({ 'Content-Type': 'application/json' })

      expect(result).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-token',
      })
    })

    it('returns original headers when no token', () => {
      const headers = { 'Content-Type': 'application/json' }

      const result = addBearerToken(headers)

      expect(result).toEqual(headers)
    })

    it('handles empty headers', () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'my-token' })

      const result = addBearerToken({})

      expect(result).toEqual({ Authorization: 'Bearer my-token' })
    })

    it('handles default undefined headers', () => {
      const authStore = useAuthStore()
      authStore.$patch({ token: 'my-token' })

      const result = addBearerToken()

      expect(result).toEqual({ Authorization: 'Bearer my-token' })
    })
  })
})
