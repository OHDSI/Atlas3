/**
 * useAuth Composable Tests
 * Tests for authentication wrapper composable
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock authService
vi.mock('@/services/auth/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    runAs: vi.fn(),
  },
}))

// Mock permissionChecker
vi.mock('@/services/auth/permissionChecker', () => ({
  permissionChecker: {
    hasPermission: vi.fn(),
    hasAnyPermission: vi.fn(),
    hasAllPermissions: vi.fn(),
  },
}))

vi.mock('@/services/auth/storageManager', () => ({
  storageManager: {
    saveLogoutUrl: vi.fn(),
  },
}))

import { useAuth } from '@/composables/useAuth'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth/authService'
import { permissionChecker } from '@/services/auth/permissionChecker'
import { storageManager } from '@/services/auth/storageManager'
import type { AuthProvider } from '@/models/auth.types'

const dbProvider: AuthProvider = {
  name: 'Database',
  url: 'db',
  ajax: true,
  icon: 'mdi-database',
  isUseCredentialsForm: true,
}

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('computed state', () => {
    it('should return isAuthenticated from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ isAuthenticated: true })

      const { isAuthenticated } = useAuth()

      expect(isAuthenticated.value).toBe(true)
    })

    it('should return user from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ user: { login: 'testuser', name: 'Test User' } })

      const { user } = useAuth()

      expect(user.value?.login).toBe('testuser')
    })

    it('should return userDisplayName from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ user: { login: 'testuser', displayName: 'Test User' } })

      const { userDisplayName } = useAuth()

      expect(userDisplayName.value).toBe('Test User')
    })

    it('should return tokenExpiration from store', () => {
      const authStore = useAuthStore()
      const expirationDate = new Date()
      authStore.$patch({ tokenExpirationDate: expirationDate })

      const { tokenExpiration } = useAuth()

      expect(tokenExpiration.value).toEqual(expirationDate)
    })

    it('should return isAuthenticating from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ isAuthenticating: true })

      const { isAuthenticating } = useAuth()

      expect(isAuthenticating.value).toBe(true)
    })

    it('should return isRefreshing from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ isRefreshing: true })

      const { isRefreshing } = useAuth()

      expect(isRefreshing.value).toBe(true)
    })

    it('should return errorMessage from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ errorMessage: 'Login failed' })

      const { errorMessage } = useAuth()

      expect(errorMessage.value).toBe('Login failed')
    })

    it('should return loginModalOpen from store', () => {
      const authStore = useAuthStore()
      authStore.openLoginModal()

      const { loginModalOpen } = useAuth()

      expect(loginModalOpen.value).toBe(true)
    })

    it('should return permissions from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ permissions: ['cohort:*:get', 'cohort:*:put'] })

      const { permissions } = useAuth()

      expect(permissions.value).toEqual(['cohort:*:get', 'cohort:*:put'])
    })

    it('should return isRunningAs from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ isRunningAs: true })

      const { isRunningAs } = useAuth()

      expect(isRunningAs.value).toBe(true)
    })

    it('should return originalUser from store', () => {
      const authStore = useAuthStore()
      authStore.$patch({ originalUser: { login: 'admin', name: 'Admin User' } })

      const { originalUser } = useAuth()

      expect(originalUser.value?.login).toBe('admin')
    })
  })

  describe('login', () => {
    it('should call authService.login', async () => {
      vi.mocked(authService.login).mockResolvedValue()

      const { login } = useAuth()

      await login(dbProvider, { username: 'test', password: 'pass' })

      expect(authService.login).toHaveBeenCalledWith(dbProvider, {
        username: 'test',
        password: 'pass',
      })
    })
  })

  describe('logout', () => {
    it('should call authService.logout', async () => {
      vi.mocked(authService.logout).mockResolvedValue()

      const { logout } = useAuth()

      await logout()

      expect(authService.logout).toHaveBeenCalled()
    })
  })

  describe('refreshToken', () => {
    it('should call authService.refreshToken', async () => {
      vi.mocked(authService.refreshToken).mockResolvedValue(true)

      const { refreshToken } = useAuth()

      const result = await refreshToken()

      expect(authService.refreshToken).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })

  describe('runAs', () => {
    it('should call authService.runAs', async () => {
      vi.mocked(authService.runAs).mockResolvedValue()

      const { runAs } = useAuth()

      await runAs('targetuser')

      expect(authService.runAs).toHaveBeenCalledWith('targetuser')
    })
  })

  describe('hasPermission', () => {
    it('should check permission using permissionChecker', () => {
      const authStore = useAuthStore()
      authStore.$patch({ permissions: ['cohort:*:get'] })
      vi.mocked(permissionChecker.hasPermission).mockReturnValue({ granted: true })

      const { hasPermission } = useAuth()

      const result = hasPermission('cohort:*:get')

      expect(result).toBe(true)
      expect(permissionChecker.hasPermission).toHaveBeenCalledWith('cohort:*:get', ['cohort:*:get'])
    })

    it('should return false when permission not granted', () => {
      const authStore = useAuthStore()
      authStore.$patch({ permissions: [] })
      vi.mocked(permissionChecker.hasPermission).mockReturnValue({ granted: false })

      const { hasPermission } = useAuth()

      const result = hasPermission('admin:*:*')

      expect(result).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('should check any permission using permissionChecker', () => {
      const authStore = useAuthStore()
      authStore.$patch({ permissions: ['cohort:*:get'] })
      vi.mocked(permissionChecker.hasAnyPermission).mockReturnValue(true)

      const { hasAnyPermission } = useAuth()

      const result = hasAnyPermission(['cohort:*:get', 'admin:*:*'])

      expect(result).toBe(true)
      expect(permissionChecker.hasAnyPermission).toHaveBeenCalledWith(
        ['cohort:*:get', 'admin:*:*'],
        ['cohort:*:get']
      )
    })
  })

  describe('hasAllPermissions', () => {
    it('should check all permissions using permissionChecker', () => {
      const authStore = useAuthStore()
      authStore.$patch({ permissions: ['cohort:*:get', 'cohort:*:put'] })
      vi.mocked(permissionChecker.hasAllPermissions).mockReturnValue(true)

      const { hasAllPermissions } = useAuth()

      const result = hasAllPermissions(['cohort:*:get', 'cohort:*:put'])

      expect(result).toBe(true)
      expect(permissionChecker.hasAllPermissions).toHaveBeenCalledWith(
        ['cohort:*:get', 'cohort:*:put'],
        ['cohort:*:get', 'cohort:*:put']
      )
    })
  })

  describe('login modal', () => {
    it('should open login modal', () => {
      const authStore = useAuthStore()
      // Reset debounce timer first
      authStore.closeLoginModal()
      const { openLoginModal } = useAuth()

      openLoginModal()

      expect(authStore.loginModalOpen).toBe(true)
    })

    it('should close login modal', () => {
      const authStore = useAuthStore()
      authStore.openLoginModal()

      const { closeLoginModal } = useAuth()
      closeLoginModal()

      expect(authStore.loginModalOpen).toBe(false)
    })
  })

  describe('setError', () => {
    it('should set error message in store', () => {
      const authStore = useAuthStore()
      const { setError } = useAuth()

      setError('Test error message')

      expect(authStore.errorMessage).toBe('Test error message')
    })

    it('should clear error message when null is passed', () => {
      const authStore = useAuthStore()
      authStore.$patch({ errorMessage: 'Existing error' })

      const { setError } = useAuth()
      setError(null)

      expect(authStore.errorMessage).toBeNull()
    })
  })

  describe('saveLogoutUrl', () => {
    it('should delegate to storageManager', () => {
      const { saveLogoutUrl } = useAuth()
      saveLogoutUrl('https://example.com/logout')
      expect(storageManager.saveLogoutUrl).toHaveBeenCalledWith('https://example.com/logout')
    })
  })
})
