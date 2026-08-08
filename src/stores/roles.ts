/**
 * Roles Store
 *
 * State management for role and permissions management
 * Handles roles, permissions, users, and their relationships
 *
 * Based on: specs/001-role-permissions-management/spec.md
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as roleService from '@/services/role.service'
import * as permissionService from '@/services/permission.service'
import * as userService from '@/services/user.service'
import type { Role, RoleCreate, RoleUpdate, Permission, User } from '@/models/role.types'
import { logger } from '@/utils/logger'

export const useRolesStore = defineStore('roles', () => {
  // ============================================================================
  // State
  // ============================================================================

  // Roles state
  const roles = ref<Role[]>([])
  const currentRole = ref<Role | null>(null)
  const isLoadingRoles = ref(false)
  const rolesError = ref<string | null>(null)

  // Permissions state
  const permissions = ref<Permission[]>([])
  const rolePermissions = ref<Permission[]>([])
  const isLoadingPermissions = ref(false)
  const permissionsError = ref<string | null>(null)

  // Users state
  const users = ref<User[]>([])
  const roleUsers = ref<User[]>([])
  const isLoadingUsers = ref(false)
  const usersError = ref<string | null>(null)

  // Operation state
  const isSaving = ref(false)
  const isDeleting = ref(false)

  // ============================================================================
  // Computed
  // ============================================================================

  const hasRoles = computed(() => roles.value.length > 0)
  const hasPermissions = computed(() => permissions.value.length > 0)
  const hasUsers = computed(() => users.value.length > 0)

  const isLoading = computed(
    () => isLoadingRoles.value || isLoadingPermissions.value || isLoadingUsers.value
  )

  const hasError = computed(
    () => rolesError.value !== null || permissionsError.value !== null || usersError.value !== null
  )

  // ============================================================================
  // Actions - Role CRUD
  // ============================================================================

  /**
   * Fetch all roles from the API
   */
  async function fetchRoles(): Promise<boolean> {
    isLoadingRoles.value = true
    rolesError.value = null

    try {
      const result = await roleService.fetchRoles()

      if (result.success) {
        roles.value = result.data
        logger.info('RolesStore', `Loaded ${result.data.length} roles`)
        return true
      } else {
        rolesError.value = result.error.message
        logger.error('RolesStore', 'Failed to fetch roles', result.error.message)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch roles'
      rolesError.value = message
      logger.error('RolesStore', 'Failed to fetch roles', error)
      return false
    } finally {
      isLoadingRoles.value = false
    }
  }

  /**
   * Fetch a single role by ID
   */
  async function fetchRoleById(roleId: number): Promise<boolean> {
    isLoadingRoles.value = true
    rolesError.value = null

    try {
      const result = await roleService.fetchRoleById(roleId)

      if (result.success) {
        currentRole.value = result.data
        logger.info('RolesStore', `Loaded role ${roleId}`)
        return true
      } else {
        rolesError.value = result.error.message
        logger.error('RolesStore', `Failed to fetch role ${roleId}`, result.error.message)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch role'
      rolesError.value = message
      logger.error('RolesStore', `Failed to fetch role ${roleId}`, error)
      return false
    } finally {
      isLoadingRoles.value = false
    }
  }

  /**
   * Create a new role
   */
  async function createRole(payload: RoleCreate): Promise<Role | null> {
    isSaving.value = true
    rolesError.value = null

    try {
      const result = await roleService.createRole(payload)

      if (result.success) {
        // Add to local state
        roles.value.push(result.data)
        currentRole.value = result.data

        logger.info('RolesStore', `Created role: ${result.data.name}`)
        return result.data
      } else {
        rolesError.value = result.error.message
        logger.error('RolesStore', 'Failed to create role', result.error.message)
        return null
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create role'
      rolesError.value = message
      logger.error('RolesStore', 'Failed to create role', error)
      return null
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Update an existing role
   */
  async function updateRole(roleId: number, payload: RoleUpdate): Promise<boolean> {
    isSaving.value = true
    rolesError.value = null

    try {
      const result = await roleService.updateRole(roleId, payload)

      if (result.success) {
        // Update in local state
        const index = roles.value.findIndex(r => r.id === roleId)
        if (index !== -1) {
          roles.value[index] = result.data
        }

        if (currentRole.value && currentRole.value.id === roleId) {
          currentRole.value = result.data
        }

        logger.info('RolesStore', `Updated role ${roleId}: ${result.data.name}`)
        return true
      } else {
        rolesError.value = result.error.message
        logger.error('RolesStore', `Failed to update role ${roleId}`, result.error.message)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update role'
      rolesError.value = message
      logger.error('RolesStore', `Failed to update role ${roleId}`, error)
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Delete a role
   */
  async function deleteRole(roleId: number): Promise<boolean> {
    isDeleting.value = true
    rolesError.value = null

    try {
      const result = await roleService.deleteRole(roleId)

      if (result.success) {
        // Remove from local state
        const index = roles.value.findIndex(r => r.id === roleId)

        if (index !== -1) {
          roles.value.splice(index, 1)
        }

        if (currentRole.value && currentRole.value.id === roleId) {
          currentRole.value = null
        }

        logger.info('RolesStore', `Deleted role ${roleId}`)
        return true
      } else {
        rolesError.value = result.error.message
        logger.error('RolesStore', `Failed to delete role ${roleId}`, result.error.message)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete role'
      rolesError.value = message
      logger.error('RolesStore', `Failed to delete role ${roleId}`, error)
      return false
    } finally {
      isDeleting.value = false
    }
  }

  // ============================================================================
  // Actions - Permissions
  // ============================================================================

  /**
   * Fetch all system permissions
   */
  async function fetchPermissions(): Promise<boolean> {
    isLoadingPermissions.value = true
    permissionsError.value = null

    try {
      const result = await permissionService.fetchAllPermissions()

      if (result.success) {
        permissions.value = result.data
        logger.info('RolesStore', `Loaded ${result.data.length} permissions`)
        return true
      } else {
        permissionsError.value = result.error.message
        logger.error('RolesStore', 'Failed to fetch permissions', result.error.message)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch permissions'
      permissionsError.value = message
      logger.error('RolesStore', 'Failed to fetch permissions', error)
      return false
    } finally {
      isLoadingPermissions.value = false
    }
  }

  /**
   * Fetch permissions assigned to a specific role
   */
  async function fetchRolePermissions(roleId: number): Promise<boolean> {
    isLoadingPermissions.value = true
    permissionsError.value = null

    try {
      const result = await roleService.getRolePermissions(roleId)

      if (result.success) {
        rolePermissions.value = result.data
        logger.info('RolesStore', `Loaded ${result.data.length} permissions for role ${roleId}`)
        return true
      } else {
        permissionsError.value = result.error.message
        logger.error('RolesStore', `Failed to fetch permissions for role ${roleId}`, result.error.message)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch role permissions'
      permissionsError.value = message
      logger.error('RolesStore', `Failed to fetch permissions for role ${roleId}`, error)
      return false
    } finally {
      isLoadingPermissions.value = false
    }
  }

  /**
   * Assign a permission to a role
   */
  async function assignPermissionToRole(roleId: number, permissionId: number): Promise<boolean> {
    isSaving.value = true

    try {
      const result = await roleService.assignPermissionToRole(roleId, permissionId)

      if (result.success) {
        // Add to local state if not already present
        const permission = permissions.value.find(p => p.id === permissionId)
        if (permission && !rolePermissions.value.find(p => p.id === permissionId)) {
          rolePermissions.value.push(permission)
        }

        logger.info('RolesStore', `Assigned permission ${permissionId} to role ${roleId}`)
        return true
      } else {
        logger.error(
          'RolesStore',
          `Failed to assign permission ${permissionId} to role ${roleId}`,
          result.error.message
        )
        return false
      }
    } catch (error) {
      logger.error(
        'RolesStore',
        `Failed to assign permission ${permissionId} to role ${roleId}`,
        error
      )
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Remove a permission from a role
   */
  async function removePermissionFromRole(roleId: number, permissionId: number): Promise<boolean> {
    isSaving.value = true

    try {
      const result = await roleService.removePermissionFromRole(roleId, permissionId)

      if (result.success) {
        // Remove from local state
        const index = rolePermissions.value.findIndex(p => p.id === permissionId)
        if (index !== -1) {
          rolePermissions.value.splice(index, 1)
        }

        logger.info('RolesStore', `Removed permission ${permissionId} from role ${roleId}`)
        return true
      } else {
        logger.error(
          'RolesStore',
          `Failed to remove permission ${permissionId} from role ${roleId}`,
          result.error.message
        )
        return false
      }
    } catch (error) {
      logger.error(
        'RolesStore',
        `Failed to remove permission ${permissionId} from role ${roleId}`,
        error
      )
      return false
    } finally {
      isSaving.value = false
    }
  }

  // ============================================================================
  // Actions - Users
  // ============================================================================

  /**
   * Fetch all users
   */
  async function fetchUsers(): Promise<boolean> {
    isLoadingUsers.value = true
    usersError.value = null

    try {
      const result = await userService.fetchAllUsers()

      if (result.success) {
        users.value = result.data
        logger.info('RolesStore', `Loaded ${result.data.length} users`)
        return true
      } else {
        usersError.value = result.error.message
        logger.error('RolesStore', 'Failed to fetch users', result.error.message)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch users'
      usersError.value = message
      logger.error('RolesStore', 'Failed to fetch users', error)
      return false
    } finally {
      isLoadingUsers.value = false
    }
  }

  /**
   * Fetch users assigned to a specific role
   */
  async function fetchRoleUsers(roleId: number): Promise<boolean> {
    isLoadingUsers.value = true
    usersError.value = null

    try {
      const result = await roleService.getRoleUsers(roleId)

      if (result.success) {
        roleUsers.value = result.data
        logger.info('RolesStore', `Loaded ${result.data.length} users for role ${roleId}`)
        return true
      } else {
        usersError.value = result.error.message
        logger.error('RolesStore', `Failed to fetch users for role ${roleId}`, result.error.message)
        return false
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch role users'
      usersError.value = message
      logger.error('RolesStore', `Failed to fetch users for role ${roleId}`, error)
      return false
    } finally {
      isLoadingUsers.value = false
    }
  }

  /**
   * Assign a user to a role
   */
  async function assignUserToRole(roleId: number, userId: number): Promise<boolean> {
    isSaving.value = true

    try {
      const result = await roleService.assignUserToRole(roleId, userId)

      if (result.success) {
        // Add to local state if not already present
        const user = users.value.find(u => u.id === userId)
        if (user && !roleUsers.value.find(u => u.id === userId)) {
          roleUsers.value.push(user)
        }

        logger.info('RolesStore', `Assigned user ${userId} to role ${roleId}`)
        return true
      } else {
        logger.error(
          'RolesStore',
          `Failed to assign user ${userId} to role ${roleId}`,
          result.error.message
        )
        return false
      }
    } catch (error) {
      logger.error('RolesStore', `Failed to assign user ${userId} to role ${roleId}`, error)
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Remove a user from a role
   */
  async function removeUserFromRole(roleId: number, userId: number): Promise<boolean> {
    isSaving.value = true

    try {
      const result = await roleService.removeUserFromRole(roleId, userId)

      if (result.success) {
        // Remove from local state
        const index = roleUsers.value.findIndex(u => u.id === userId)
        if (index !== -1) {
          roleUsers.value.splice(index, 1)
        }

        logger.info('RolesStore', `Removed user ${userId} from role ${roleId}`)
        return true
      } else {
        logger.error(
          'RolesStore',
          `Failed to remove user ${userId} from role ${roleId}`,
          result.error.message
        )
        return false
      }
    } catch (error) {
      logger.error('RolesStore', `Failed to remove user ${userId} from role ${roleId}`, error)
      return false
    } finally {
      isSaving.value = false
    }
  }

  // ============================================================================
  // Actions - Import/Export
  // ============================================================================

  /**
   * Export a role to JSON
   */
  async function exportRole(roleId: number): Promise<string | null> {
    try {
      const result = await roleService.exportRole(roleId)

      if (result.success) {
        logger.info('RolesStore', `Exported role ${roleId}`)
        return result.data
      } else {
        logger.error('RolesStore', `Failed to export role ${roleId}`, result.error.message)
        return null
      }
    } catch (error) {
      logger.error('RolesStore', `Failed to export role ${roleId}`, error)
      return null
    }
  }

  /**
   * Import a role from JSON
   */
  async function importRole(jsonData: string): Promise<Role | null> {
    isSaving.value = true

    try {
      const result = await roleService.importRole(jsonData)

      if (result.success) {
        // Add to local state
        roles.value.push(result.data)

        logger.info('RolesStore', `Imported role: ${result.data.name}`)
        return result.data
      } else {
        logger.error('RolesStore', 'Failed to import role', result.error.message)
        return null
      }
    } catch (error) {
      logger.error('RolesStore', 'Failed to import role', error)
      return null
    } finally {
      isSaving.value = false
    }
  }

  // ============================================================================
  // Utility Actions
  // ============================================================================

  /**
   * Clear all state
   */
  function clearState() {
    roles.value = []
    currentRole.value = null
    permissions.value = []
    rolePermissions.value = []
    users.value = []
    roleUsers.value = []
    rolesError.value = null
    permissionsError.value = null
    usersError.value = null
  }

  /**
   * Clear current role
   */
  function clearCurrentRole() {
    currentRole.value = null
    rolePermissions.value = []
    roleUsers.value = []
  }

  // ============================================================================
  // Return Store Interface
  // ============================================================================

  return {
    // State
    roles,
    currentRole,
    permissions,
    rolePermissions,
    users,
    roleUsers,
    isLoadingRoles,
    isLoadingPermissions,
    isLoadingUsers,
    isSaving,
    isDeleting,
    rolesError,
    permissionsError,
    usersError,

    // Computed
    hasRoles,
    hasPermissions,
    hasUsers,
    isLoading,
    hasError,

    // Actions - Roles
    fetchRoles,
    fetchRoleById,
    createRole,
    updateRole,
    deleteRole,

    // Actions - Permissions
    fetchPermissions,
    fetchRolePermissions,
    assignPermissionToRole,
    removePermissionFromRole,

    // Actions - Users
    fetchUsers,
    fetchRoleUsers,
    assignUserToRole,
    removeUserFromRole,

    // Actions - Import/Export
    exportRole,
    importRole,

    // Utility
    clearState,
    clearCurrentRole,
  }
})
