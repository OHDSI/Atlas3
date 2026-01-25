import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth/authService'
import { permissionChecker } from '@/services/auth/permissionChecker'
import { storageManager } from '@/services/auth/storageManager'
import type { LoginCredentials } from '@/models/auth.types'

export function useAuth() {
  const authStore = useAuthStore()

  return {
    isAuthenticated: computed(() => authStore.isAuthenticated),
    user: computed(() => authStore.user),
    userDisplayName: computed(() => authStore.userDisplayName),
    tokenExpiration: computed(() => authStore.tokenExpirationDate),
    tokenExpirationDate: computed(() => authStore.tokenExpirationDate),
    isAuthenticating: computed(() => authStore.isAuthenticating),
    isRefreshing: computed(() => authStore.isRefreshing),
    errorMessage: computed(() => authStore.errorMessage),
    loginModalOpen: computed(() => authStore.loginModalOpen),
    permissions: computed(() => authStore.permissions),
    isRunningAs: computed(() => authStore.isRunningAs),
    originalUser: computed(() => authStore.originalUser),

    async login(provider: string, credentials?: LoginCredentials): Promise<void> {
      return authService.login(provider, credentials)
    },

    async logout(): Promise<void> {
      return authService.logout()
    },

    async refreshToken(): Promise<boolean> {
      return authService.refreshToken()
    },

    async runAs(targetUsername: string): Promise<void> {
      return authService.runAs(targetUsername)
    },

    async exitRunAs(): Promise<void> {
      return authService.exitRunAs()
    },

    hasPermission(permission: string): boolean {
      return permissionChecker.hasPermission(permission, authStore.permissions).granted
    },

    hasAnyPermission(permissions: string[]): boolean {
      return permissionChecker.hasAnyPermission(permissions, authStore.permissions)
    },

    hasAllPermissions(permissions: string[]): boolean {
      return permissionChecker.hasAllPermissions(permissions, authStore.permissions)
    },

    openLoginModal(): void {
      authStore.openLoginModal()
    },

    closeLoginModal(): void {
      authStore.closeLoginModal()
    },

    setError(message: string | null): void {
      authStore.setError(message)
    },

    saveLogoutUrl(logoutUrl: string): void {
      storageManager.saveLogoutUrl(logoutUrl)
    },
  }
}
