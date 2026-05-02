/**
 * usePermissions Composable
 *
 * Vue composable for permission checking with wildcard support.
 * Provides reactive permission checking and cache management.
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { permissionService } from '@/services/auth/permissions'

export interface UsePermissionsReturn {
  hasPermission: (permission: string) => boolean
  hasAnyPermission: (permissions: string[]) => boolean
  hasAllPermissions: (permissions: string[]) => boolean
  cacheHitRate: import('vue').ComputedRef<number>
  clearCache: () => void
}

/**
 * Composable for checking user permissions
 *
 * @returns Object with permission checking methods and cache utilities
 */
export function usePermissions(): UsePermissionsReturn {
  const authStore = useAuthStore()

  /**
   * Check if user has a specific permission
   *
   * @param permission - Permission string to check (e.g., "cohort:123:get")
   * @returns true if user has permission
   */
  const hasPermission = (permission: string): boolean => {
    const userPermissions = authStore.user?.permissionIdx || {}
    const allPermissions = Object.values(userPermissions).flat()
    return permissionService.hasPermission(permission, allPermissions)
  }

  /**
   * Check if user has any of the given permissions
   *
   * @param permissions - Array of permission strings
   * @returns true if user has at least one permission
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(perm => hasPermission(perm))
  }

  /**
   * Check if user has all of the given permissions
   *
   * @param permissions - Array of permission strings
   * @returns true if user has all permissions
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(perm => hasPermission(perm))
  }

  /**
   * Get cache hit rate percentage
   *
   * @returns Reactive computed value of cache hit rate
   */
  const cacheHitRate = computed(() => {
    const stats = permissionService.getCacheStats()
    return stats.hitRate
  })

  /**
   * Clear permission cache
   *
   * Useful when permissions might have changed
   */
  const clearCache = (): void => {
    permissionService.clearCache()
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    cacheHitRate,
    clearCache,
  }
}
