/**
 * Plugin Auth Service Tests
 * Tests for plugin authentication context creation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock permission service
vi.mock('@/services/auth/permissions', () => ({
  permissionService: {
    hasPermission: vi.fn(),
    clearCache: vi.fn(),
  },
}))

// Mock auth config to enable authentication
vi.mock('@/config/auth.config', () => ({
  authConfig: {
    userAuthenticationEnabled: true,
    refreshTokenThreshold: 1000 * 60 * 60 * 4,
  },
}))

import { PluginAuthService, pluginAuthService } from '@/services/PluginAuthService'
import { useAuthStore } from '@/stores/auth'
import { permissionService } from '@/services/auth/permissions'

// Helper to create a valid JWT token for testing
function createTestJWT(expiresInSeconds = 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { sub: 'testuser', iat: now, exp: now + expiresInSeconds }
  const base64Header = btoa(JSON.stringify(header))
  const base64Payload = btoa(JSON.stringify(payload))
  return `${base64Header}.${base64Payload}.test_signature`
}

describe('PluginAuthService', () => {
  let service: PluginAuthService

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    service = new PluginAuthService()
  })

  describe('createAuthContext', () => {
    it('should create auth context for authenticated user', () => {
      const authStore = useAuthStore()
      const testToken = createTestJWT()
      authStore.setToken(testToken)
      authStore.setUser({
        login: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        permissionIdx: {
          cohort: ['cohort:read', 'cohort:write'],
          conceptset: ['conceptset:read'],
        },
      })

      const context = service.createAuthContext()

      expect(context.isAuthenticated).toBe(true)
      expect(context.token).toBe(testToken)
      expect(context.user).not.toBeNull()
      expect(context.user?.id).toBe('testuser')
      expect(context.user?.username).toBe('Test User')
      expect(context.user?.email).toBe('test@example.com')
      expect(context.user?.permissions).toContain('cohort:read')
      expect(context.user?.permissions).toContain('cohort:write')
      expect(context.user?.permissions).toContain('conceptset:read')
    })

    it('should create auth context for unauthenticated user', () => {
      const context = service.createAuthContext()

      expect(context.isAuthenticated).toBe(false)
      expect(context.token).toBeNull()
      expect(context.user).toBeNull()
    })

    it('should use login as username when displayName is not available', () => {
      const authStore = useAuthStore()
      authStore.setToken(createTestJWT())
      authStore.setUser({
        login: 'testuser',
        displayName: '',
        permissionIdx: {},
      })

      const context = service.createAuthContext()

      expect(context.user?.username).toBe('testuser')
    })

    it('should handle user with no permissions', () => {
      const authStore = useAuthStore()
      authStore.setToken(createTestJWT())
      authStore.setUser({
        login: 'testuser',
        displayName: 'Test User',
        permissionIdx: undefined as unknown as Record<string, string[]>,
      })

      const context = service.createAuthContext()

      expect(context.user?.permissions).toEqual([])
    })

    describe('hasPermission', () => {
      it('should check permission using permission service', () => {
        const authStore = useAuthStore()
        authStore.setToken(createTestJWT())
        authStore.setUser({
          login: 'testuser',
          displayName: 'Test User',
          permissionIdx: {
            cohort: ['cohort:read'],
          },
        })

        vi.mocked(permissionService.hasPermission).mockReturnValue(true)

        const context = service.createAuthContext()
        const result = context.hasPermission('cohort:read')

        expect(result).toBe(true)
        expect(permissionService.hasPermission).toHaveBeenCalledWith(
          'cohort:read',
          ['cohort:read']
        )
      })

      it('should return false when user is not authenticated', () => {
        const context = service.createAuthContext()
        const result = context.hasPermission('cohort:read')

        expect(result).toBe(false)
        expect(permissionService.hasPermission).not.toHaveBeenCalled()
      })
    })
  })

  describe('watchAuthChanges', () => {
    it('should call callback on auth state changes', async () => {
      const callback = vi.fn()

      service.watchAuthChanges(callback)

      const authStore = useAuthStore()
      const testToken = createTestJWT()
      authStore.setToken(testToken)

      // Wait for subscription to fire
      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalled()
      })
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()

      const unsubscribe = service.watchAuthChanges(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should not call callback after unsubscribe', async () => {
      const callback = vi.fn()

      const unsubscribe = service.watchAuthChanges(callback)
      unsubscribe()

      callback.mockClear()

      const authStore = useAuthStore()
      authStore.setToken(createTestJWT())

      // Give some time for potential callback to fire
      await new Promise(r => setTimeout(r, 10))

      expect(callback).not.toHaveBeenCalled()
    })

    it('should pass updated auth context to callback', async () => {
      const callback = vi.fn()

      service.watchAuthChanges(callback)

      const authStore = useAuthStore()
      const testToken = createTestJWT()
      authStore.setToken(testToken)
      authStore.setUser({
        login: 'newuser',
        displayName: 'New User',
        permissionIdx: {},
      })

      // Wait for callback to be called
      await vi.waitFor(() => {
        expect(callback.mock.calls.length).toBeGreaterThan(0)
      })

      // Get the last call's argument
      const lastCall = callback.mock.calls[callback.mock.calls.length - 1]
      const context = lastCall[0]

      expect(context.isAuthenticated).toBe(true)
      expect(context.token).toBe(testToken)
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(pluginAuthService).toBeInstanceOf(PluginAuthService)
    })
  })
})
