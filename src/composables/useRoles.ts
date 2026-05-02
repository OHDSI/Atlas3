/**
 * Roles Composable
 *
 * Convenient API for role and permissions management
 * Wraps the roles store with a clean interface
 *
 * Based on: specs/001-role-permissions-management/spec.md
 */

import { computed } from 'vue'
import { useRolesStore } from '@/stores/roles'
import type { RoleCreate, RoleUpdate, Role, Permission, User } from '@/models/role.types'

export function useRoles() {
  const rolesStore = useRolesStore()

  return {
    // ============================================================================
    // State - Read-only computed properties
    // ============================================================================

    roles: computed(() => rolesStore.roles),
    currentRole: computed(() => rolesStore.currentRole),
    permissions: computed(() => rolesStore.permissions),
    rolePermissions: computed(() => rolesStore.rolePermissions),
    users: computed(() => rolesStore.users),
    roleUsers: computed(() => rolesStore.roleUsers),

    // Loading states
    isLoadingRoles: computed(() => rolesStore.isLoadingRoles),
    isLoadingPermissions: computed(() => rolesStore.isLoadingPermissions),
    isLoadingUsers: computed(() => rolesStore.isLoadingUsers),
    isSaving: computed(() => rolesStore.isSaving),
    isDeleting: computed(() => rolesStore.isDeleting),
    isLoading: computed(() => rolesStore.isLoading),

    // Error states
    rolesError: computed(() => rolesStore.rolesError),
    permissionsError: computed(() => rolesStore.permissionsError),
    usersError: computed(() => rolesStore.usersError),
    hasError: computed(() => rolesStore.hasError),

    // Helper computed
    hasRoles: computed(() => rolesStore.hasRoles),
    hasPermissions: computed(() => rolesStore.hasPermissions),
    hasUsers: computed(() => rolesStore.hasUsers),

    // ============================================================================
    // Actions - Role CRUD
    // ============================================================================

    /**
     * Fetch all roles from the API
     */
    async fetchRoles(): Promise<boolean> {
      return rolesStore.fetchRoles()
    },

    /**
     * Fetch a single role by ID
     */
    async fetchRoleById(roleId: number): Promise<boolean> {
      return rolesStore.fetchRoleById(roleId)
    },

    /**
     * Create a new role
     */
    async createRole(payload: RoleCreate): Promise<Role | null> {
      return rolesStore.createRole(payload)
    },

    /**
     * Update an existing role
     */
    async updateRole(roleId: number, payload: RoleUpdate): Promise<boolean> {
      return rolesStore.updateRole(roleId, payload)
    },

    /**
     * Delete a role
     */
    async deleteRole(roleId: number): Promise<boolean> {
      return rolesStore.deleteRole(roleId)
    },

    // ============================================================================
    // Actions - Permissions
    // ============================================================================

    /**
     * Fetch all system permissions
     */
    async fetchPermissions(): Promise<boolean> {
      return rolesStore.fetchPermissions()
    },

    /**
     * Fetch permissions assigned to a specific role
     */
    async fetchRolePermissions(roleId: number): Promise<boolean> {
      return rolesStore.fetchRolePermissions(roleId)
    },

    /**
     * Assign a permission to a role
     */
    async assignPermissionToRole(roleId: number, permissionId: number): Promise<boolean> {
      return rolesStore.assignPermissionToRole(roleId, permissionId)
    },

    /**
     * Remove a permission from a role
     */
    async removePermissionFromRole(roleId: number, permissionId: number): Promise<boolean> {
      return rolesStore.removePermissionFromRole(roleId, permissionId)
    },

    /**
     * Batch assign permissions to a role
     * Useful for assigning multiple permissions at once
     */
    async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<boolean> {
      const results = await Promise.all(
        permissionIds.map(permissionId => rolesStore.assignPermissionToRole(roleId, permissionId))
      )
      return results.every(result => result)
    },

    /**
     * Batch remove permissions from a role
     * Useful for removing multiple permissions at once
     */
    async removePermissionsFromRole(roleId: number, permissionIds: number[]): Promise<boolean> {
      const results = await Promise.all(
        permissionIds.map(permissionId => rolesStore.removePermissionFromRole(roleId, permissionId))
      )
      return results.every(result => result)
    },

    // ============================================================================
    // Actions - Users
    // ============================================================================

    /**
     * Fetch all users
     */
    async fetchUsers(): Promise<boolean> {
      return rolesStore.fetchUsers()
    },

    /**
     * Fetch users assigned to a specific role
     */
    async fetchRoleUsers(roleId: number): Promise<boolean> {
      return rolesStore.fetchRoleUsers(roleId)
    },

    /**
     * Assign a user to a role
     */
    async assignUserToRole(roleId: number, userId: number): Promise<boolean> {
      return rolesStore.assignUserToRole(roleId, userId)
    },

    /**
     * Remove a user from a role
     */
    async removeUserFromRole(roleId: number, userId: number): Promise<boolean> {
      return rolesStore.removeUserFromRole(roleId, userId)
    },

    /**
     * Batch assign users to a role
     * Useful for assigning multiple users at once
     */
    async assignUsersToRole(roleId: number, userIds: number[]): Promise<boolean> {
      const results = await Promise.all(
        userIds.map(userId => rolesStore.assignUserToRole(roleId, userId))
      )
      return results.every(result => result)
    },

    /**
     * Batch remove users from a role
     * Useful for removing multiple users at once
     */
    async removeUsersFromRole(roleId: number, userIds: number[]): Promise<boolean> {
      const results = await Promise.all(
        userIds.map(userId => rolesStore.removeUserFromRole(roleId, userId))
      )
      return results.every(result => result)
    },

    // ============================================================================
    // Actions - Import/Export
    // ============================================================================

    /**
     * Export a role to JSON string
     */
    async exportRole(roleId: number): Promise<string | null> {
      return rolesStore.exportRole(roleId)
    },

    /**
     * Import a role from JSON string
     */
    async importRole(jsonData: string): Promise<Role | null> {
      return rolesStore.importRole(jsonData)
    },

    /**
     * Download role as JSON file
     * Convenience method that exports and triggers download
     */
    async downloadRoleAsJson(roleId: number, filename?: string): Promise<void> {
      const jsonData = await rolesStore.exportRole(roleId)
      if (!jsonData) return

      // Create blob and download
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `role-${roleId}-export.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },

    // ============================================================================
    // Utility Actions
    // ============================================================================

    /**
     * Clear all state
     */
    clearState(): void {
      rolesStore.clearState()
    },

    /**
     * Clear current role
     */
    clearCurrentRole(): void {
      rolesStore.clearCurrentRole()
    },

    /**
     * Check if a permission is assigned to the current role
     */
    isPermissionAssigned(permissionId: number): boolean {
      return rolesStore.rolePermissions.some(p => p.id === permissionId)
    },

    /**
     * Check if a user is assigned to the current role
     */
    isUserAssigned(userId: number): boolean {
      return rolesStore.roleUsers.some(u => u.id === userId)
    },

    /**
     * Get role by ID from the local cache
     */
    getRoleById(roleId: number): Role | undefined {
      return rolesStore.roles.find(r => r.id === roleId)
    },

    /**
     * Get permission by ID from the local cache
     */
    getPermissionById(permissionId: number): Permission | undefined {
      return rolesStore.permissions.find(p => p.id === permissionId)
    },

    /**
     * Get user by ID from the local cache
     */
    getUserById(userId: number): User | undefined {
      return rolesStore.users.find(u => u.id === userId)
    },
  }
}
