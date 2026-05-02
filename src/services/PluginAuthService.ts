import { AuthContext } from '@/models/PluginModels'
import { useAuthStore } from '@/stores/auth'
import { permissionService } from '@/services/auth/permissions'

/**
 * Extract flat array of permissions from permissionIdx object
 */
function extractPermissions(permissionIdx: Record<string, string[]> | undefined): string[] {
  if (!permissionIdx) return []
  return Object.values(permissionIdx).flat()
}

export class PluginAuthService {
  createAuthContext(): AuthContext {
    const authStore = useAuthStore()
    const userPermissions = extractPermissions(authStore.user?.permissionIdx)

    return {
      user: authStore.user
        ? {
            id: authStore.user.login || '',
            username: authStore.user.displayName || authStore.user.login || '',
            email: authStore.user.email,
            permissions: userPermissions,
          }
        : null,
      token: authStore.token,
      isAuthenticated: authStore.isAuthenticated,
      hasPermission(permission: string): boolean {
        if (!this.user) return false
        return permissionService.hasPermission(permission, this.user.permissions)
      },
    }
  }

  watchAuthChanges(callback: (context: AuthContext) => void): () => void {
    const authStore = useAuthStore()

    // Watch for auth state changes
    const unsubscribe = authStore.$subscribe(() => {
      callback(this.createAuthContext())
    })

    return unsubscribe
  }
}

export const pluginAuthService = new PluginAuthService()
