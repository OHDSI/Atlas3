/**
 * Unit Tests: PluginAuthService
 * Tests for src/services/PluginAuthService.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock dependencies
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    token: null,
    isAuthenticated: false,
    $subscribe: vi.fn(() => vi.fn()),
  })),
}))

vi.mock('@/services/auth/permissions', () => ({
  permissionService: {
    hasPermission: vi.fn((permission: string, userPermissions: string[]) => {
      return userPermissions.includes(permission) || userPermissions.includes('*')
    }),
  },
}))

describe('PluginAuthService', () => {
  let PluginAuthService: typeof import('@/services/PluginAuthService').PluginAuthService
  let pluginAuthService: import('@/services/PluginAuthService').PluginAuthService

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Re-import to get fresh instance
    const module = await import('@/services/PluginAuthService')
    PluginAuthService = module.PluginAuthService
    pluginAuthService = new PluginAuthService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createAuthContext', () => {
    it('returns null user when not authenticated', async () => {
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        $subscribe: vi.fn(),
      } as ReturnType<typeof useAuthStore>)

      const context = pluginAuthService.createAuthContext()

      expect(context.user).toBeNull()
      expect(context.token).toBeNull()
      expect(context.isAuthenticated).toBe(false)
    })

    it('returns user context when authenticated', async () => {
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          login: 'testuser',
          displayName: 'Test User',
          email: 'test@example.com',
          permissionIdx: {
            admin: ['read', 'write'],
            cohort: ['execute'],
          },
        },
        token: 'test-token',
        isAuthenticated: true,
        $subscribe: vi.fn(),
      } as ReturnType<typeof useAuthStore>)

      const context = pluginAuthService.createAuthContext()

      expect(context.user).not.toBeNull()
      expect(context.user?.id).toBe('testuser')
      expect(context.user?.username).toBe('Test User')
      expect(context.user?.email).toBe('test@example.com')
      expect(context.token).toBe('test-token')
      expect(context.isAuthenticated).toBe(true)
    })

    it('extracts flat permissions from permissionIdx', async () => {
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          login: 'testuser',
          displayName: 'Test User',
          permissionIdx: {
            admin: ['read', 'write'],
            cohort: ['execute'],
          },
        },
        token: 'test-token',
        isAuthenticated: true,
        $subscribe: vi.fn(),
      } as ReturnType<typeof useAuthStore>)

      const context = pluginAuthService.createAuthContext()

      expect(context.user?.permissions).toContain('read')
      expect(context.user?.permissions).toContain('write')
      expect(context.user?.permissions).toContain('execute')
    })

    it('uses login as fallback for displayName', async () => {
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          login: 'testuser',
          displayName: '',
          permissionIdx: {},
        },
        token: 'test-token',
        isAuthenticated: true,
        $subscribe: vi.fn(),
      } as ReturnType<typeof useAuthStore>)

      const context = pluginAuthService.createAuthContext()

      expect(context.user?.username).toBe('testuser')
    })

    it('handles undefined permissionIdx', async () => {
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          login: 'testuser',
          displayName: 'Test',
          permissionIdx: undefined,
        },
        token: 'test-token',
        isAuthenticated: true,
        $subscribe: vi.fn(),
      } as ReturnType<typeof useAuthStore>)

      const context = pluginAuthService.createAuthContext()

      expect(context.user?.permissions).toEqual([])
    })
  })

  describe('hasPermission', () => {
    it('returns false when user is null', async () => {
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        $subscribe: vi.fn(),
      } as ReturnType<typeof useAuthStore>)

      const context = pluginAuthService.createAuthContext()

      expect(context.hasPermission('admin:read')).toBe(false)
    })

    it('checks permission via permissionService', async () => {
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: {
          login: 'testuser',
          displayName: 'Test',
          permissionIdx: {
            admin: ['read', 'write'],
          },
        },
        token: 'test-token',
        isAuthenticated: true,
        $subscribe: vi.fn(),
      } as ReturnType<typeof useAuthStore>)

      const context = pluginAuthService.createAuthContext()

      expect(context.hasPermission('read')).toBe(true)
      expect(context.hasPermission('delete')).toBe(false)
    })
  })

  describe('watchAuthChanges', () => {
    it('subscribes to auth store changes', async () => {
      const mockUnsubscribe = vi.fn()
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        $subscribe: vi.fn(() => mockUnsubscribe),
      } as ReturnType<typeof useAuthStore>)

      const callback = vi.fn()
      const unsubscribe = pluginAuthService.watchAuthChanges(callback)

      const authStore = useAuthStore()
      expect(authStore.$subscribe).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('returns unsubscribe function', async () => {
      const mockUnsubscribe = vi.fn()
      const { useAuthStore } = await import('@/stores/auth')
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        $subscribe: vi.fn(() => mockUnsubscribe),
      } as ReturnType<typeof useAuthStore>)

      const unsubscribe = pluginAuthService.watchAuthChanges(vi.fn())
      unsubscribe()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('Singleton Export', () => {
    it('exports singleton instance', async () => {
      const { pluginAuthService: singleton } = await import('@/services/PluginAuthService')

      expect(singleton).toBeInstanceOf(PluginAuthService)
    })
  })
})
