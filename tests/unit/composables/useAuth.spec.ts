/**
 * Unit Tests: useAuth Composable
 * Tests for src/composables/useAuth.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'

// Mock auth service
vi.mock('@/services/auth/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    runAs: vi.fn(),
    exitRunAs: vi.fn(),
  },
}))

// Mock permission checker
vi.mock('@/services/auth/permissionChecker', () => ({
  permissionChecker: {
    hasPermission: vi.fn((permission: string, permissions: string[]) => ({
      granted: permissions.includes(permission),
    })),
    hasAnyPermission: vi.fn((required: string[], available: string[]) =>
      required.some((p) => available.includes(p))
    ),
    hasAllPermissions: vi.fn((required: string[], available: string[]) =>
      required.every((p) => available.includes(p))
    ),
  },
}))

import { authService } from '@/services/auth/authService'

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('computed properties', () => {
    it('exposes isAuthenticated from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      expect(auth.isAuthenticated.value).toBe(false)

      // isAuthenticated is a state property, not derived from user
      store.$patch({ isAuthenticated: true, user: { login: 'testuser' } })
      expect(auth.isAuthenticated.value).toBe(true)
    })

    it('exposes user from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      expect(auth.user.value).toBeNull()

      const testUser = { login: 'testuser', name: 'Test User' }
      store.$patch({ user: testUser })
      expect(auth.user.value).toEqual(testUser)
    })

    it('exposes userDisplayName from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      // userDisplayName uses displayName field, falls back to login
      store.$patch({ user: { login: 'testuser', displayName: 'Test User' } })
      expect(auth.userDisplayName.value).toBe('Test User')
    })

    it('exposes tokenExpiration from store', () => {
      const auth = useAuth()
      const store = useAuthStore()
      const expDate = new Date('2025-01-01')

      store.$patch({ tokenExpirationDate: expDate })
      expect(auth.tokenExpiration.value).toEqual(expDate)
    })

    it('exposes isAuthenticating from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      expect(auth.isAuthenticating.value).toBe(false)

      store.$patch({ isAuthenticating: true })
      expect(auth.isAuthenticating.value).toBe(true)
    })

    it('exposes isRefreshing from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      expect(auth.isRefreshing.value).toBe(false)

      store.$patch({ isRefreshing: true })
      expect(auth.isRefreshing.value).toBe(true)
    })

    it('exposes errorMessage from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      expect(auth.errorMessage.value).toBeNull()

      store.$patch({ errorMessage: 'Login failed' })
      expect(auth.errorMessage.value).toBe('Login failed')
    })

    it('exposes loginModalOpen from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      expect(auth.loginModalOpen.value).toBe(false)

      store.$patch({ loginModalOpen: true })
      expect(auth.loginModalOpen.value).toBe(true)
    })

    it('exposes permissions from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      store.$patch({ permissions: ['cohort:read', 'cohort:write'] })
      expect(auth.permissions.value).toEqual(['cohort:read', 'cohort:write'])
    })

    it('exposes isRunningAs from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      expect(auth.isRunningAs.value).toBe(false)

      store.$patch({ isRunningAs: true })
      expect(auth.isRunningAs.value).toBe(true)
    })

    it('exposes originalUser from store', () => {
      const auth = useAuth()
      const store = useAuthStore()

      const originalUser = { login: 'admin' }
      store.$patch({ originalUser })
      expect(auth.originalUser.value).toEqual(originalUser)
    })
  })

  describe('auth actions', () => {
    it('calls authService.login with provider and credentials', async () => {
      const auth = useAuth()
      const credentials = { username: 'test', password: 'pass123' }

      await auth.login('db', credentials)

      expect(authService.login).toHaveBeenCalledWith('db', credentials)
    })

    it('calls authService.login with just provider', async () => {
      const auth = useAuth()

      await auth.login('windows')

      expect(authService.login).toHaveBeenCalledWith('windows', undefined)
    })

    it('calls authService.logout', async () => {
      const auth = useAuth()

      await auth.logout()

      expect(authService.logout).toHaveBeenCalled()
    })

    it('calls authService.refreshToken', async () => {
      vi.mocked(authService.refreshToken).mockResolvedValue(true)
      const auth = useAuth()

      const result = await auth.refreshToken()

      expect(authService.refreshToken).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('calls authService.runAs with target username', async () => {
      const auth = useAuth()

      await auth.runAs('otheruser')

      expect(authService.runAs).toHaveBeenCalledWith('otheruser')
    })

    it('calls authService.exitRunAs', async () => {
      const auth = useAuth()

      await auth.exitRunAs()

      expect(authService.exitRunAs).toHaveBeenCalled()
    })
  })

  describe('permission methods', () => {
    it('hasPermission returns true when permission granted', () => {
      const auth = useAuth()
      const store = useAuthStore()

      store.$patch({ permissions: ['cohort:read', 'cohort:write'] })
      const result = auth.hasPermission('cohort:read')

      expect(result).toBe(true)
    })

    it('hasPermission returns false when permission not granted', () => {
      const auth = useAuth()
      const store = useAuthStore()

      store.$patch({ permissions: ['cohort:read'] })
      const result = auth.hasPermission('cohort:delete')

      expect(result).toBe(false)
    })

    it('hasAnyPermission returns true when at least one permission matches', () => {
      const auth = useAuth()
      const store = useAuthStore()

      store.$patch({ permissions: ['cohort:read'] })
      const result = auth.hasAnyPermission(['cohort:read', 'cohort:delete'])

      expect(result).toBe(true)
    })

    it('hasAnyPermission returns false when no permissions match', () => {
      const auth = useAuth()
      const store = useAuthStore()

      store.$patch({ permissions: ['cohort:read'] })
      const result = auth.hasAnyPermission(['cohort:write', 'cohort:delete'])

      expect(result).toBe(false)
    })

    it('hasAllPermissions returns true when all permissions match', () => {
      const auth = useAuth()
      const store = useAuthStore()

      store.$patch({ permissions: ['cohort:read', 'cohort:write', 'cohort:delete'] })
      const result = auth.hasAllPermissions(['cohort:read', 'cohort:write'])

      expect(result).toBe(true)
    })

    it('hasAllPermissions returns false when not all permissions match', () => {
      const auth = useAuth()
      const store = useAuthStore()

      store.$patch({ permissions: ['cohort:read'] })
      const result = auth.hasAllPermissions(['cohort:read', 'cohort:write'])

      expect(result).toBe(false)
    })
  })

  describe('modal methods', () => {
    it('openLoginModal opens the login modal', () => {
      const auth = useAuth()
      const store = useAuthStore()

      expect(store.loginModalOpen).toBe(false)
      auth.openLoginModal()
      expect(store.loginModalOpen).toBe(true)
    })

    it('closeLoginModal closes the login modal', () => {
      const auth = useAuth()
      const store = useAuthStore()

      store.$patch({ loginModalOpen: true })
      auth.closeLoginModal()
      expect(store.loginModalOpen).toBe(false)
    })
  })
})
