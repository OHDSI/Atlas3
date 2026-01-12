/**
 * Role Service
 *
 * API integration for role management operations
 * Handles all role CRUD operations and role-permission/role-user assignments
 *
 * Based on: specs/001-role-permissions-management/contracts/role-api.yaml
 */

import { fetchJSON } from './webapi'
import {
  RawRoleSchema,
  RoleListSchema,
  PermissionListSchema,
  UserListSchema,
  type Role,
  type RoleCreate,
  type RoleUpdate,
  type Permission,
  type User,
  type ApiResult,
  success,
  failure,
} from '@/models/role.types'
import { logger } from '@/utils/logger'

// ============================================================================
// Role CRUD Operations
// ============================================================================

/**
 * Fetch all roles
 */
export async function fetchRoles(): Promise<ApiResult<Role[]>> {
  try {
    const data = await fetchJSON<unknown>('/role/')
    const parsed = RoleListSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('RoleService', 'Roles validation error', parsed.error)
      return failure('Invalid roles response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch roles'
    logger.error('RoleService', 'Failed to fetch roles', error)
    return failure(message)
  }
}

/**
 * Fetch single role by ID
 * GET /role/{roleId}
 */
export async function fetchRoleById(roleId: number): Promise<ApiResult<Role>> {
  try {
    const data = await fetchJSON<unknown>(`/role/${roleId}`)
    const parsed = RawRoleSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('RoleService', 'Role validation error', parsed.error)
      return failure('Invalid role response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch role'
    logger.error('RoleService', `Failed to fetch role ${roleId}`, error)
    return failure(message)
  }
}

/**
 * Create a new role
 * POST /role/
 */
export async function createRole(payload: RoleCreate): Promise<ApiResult<Role>> {
  try {
    const data = await fetchJSON<unknown>('/role/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const parsed = RawRoleSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('RoleService', 'Create role validation error', parsed.error)
      return failure('Invalid role response format')
    }

    // Audit log: Role created (FR-029)
    logger.info('RoleService', `Role created: "${parsed.data.name}" (ID: ${parsed.data.id})`, {
      roleId: parsed.data.id,
      roleName: parsed.data.name,
      operation: 'CREATE',
    })

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create role'
    logger.error('RoleService', 'Failed to create role', error)
    return failure(message)
  }
}

/**
 * Update an existing role
 * PUT /role/{roleId}
 */
export async function updateRole(
  roleId: number,
  payload: RoleUpdate
): Promise<ApiResult<Role>> {
  try {
    const data = await fetchJSON<unknown>(`/role/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    const parsed = RawRoleSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('RoleService', 'Update role validation error', parsed.error)
      return failure('Invalid role response format')
    }

    // Audit log: Role updated (FR-029)
    logger.info('RoleService', `Role updated: "${parsed.data.name}" (ID: ${roleId})`, {
      roleId,
      roleName: parsed.data.name,
      operation: 'UPDATE',
      changes: payload,
    })

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update role'
    logger.error('RoleService', `Failed to update role ${roleId}`, error)
    return failure(message)
  }
}

/**
 * Delete a role
 * DELETE /role/{roleId}
 */
export async function deleteRole(roleId: number): Promise<ApiResult<void>> {
  try {
    await fetchJSON(`/role/${roleId}`, {
      method: 'DELETE',
    })

    // Audit log: Role deleted (FR-029)
    logger.info('RoleService', `Role deleted (ID: ${roleId})`, {
      roleId,
      operation: 'DELETE',
    })

    return success(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete role'
    logger.error('RoleService', `Failed to delete role ${roleId}`, error)
    return failure(message)
  }
}

// ============================================================================
// Role-Permission Operations
// ============================================================================

/**
 * Get permissions assigned to a role
 * GET /role/{roleId}/permissions
 */
export async function getRolePermissions(roleId: number): Promise<ApiResult<Permission[]>> {
  try {
    const data = await fetchJSON<unknown>(`/role/${roleId}/permissions`)
    const parsed = PermissionListSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('RoleService', 'Role permissions validation error', parsed.error)
      return failure('Invalid permissions response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch role permissions'
    logger.error('RoleService', `Failed to fetch permissions for role ${roleId}`, error)
    return failure(message)
  }
}

/**
 * Assign a permission to a role
 * PUT /role/{roleId}/permissions/{permissionId}
 */
export async function assignPermissionToRole(
  roleId: number,
  permissionId: number
): Promise<ApiResult<void>> {
  try {
    await fetchJSON(`/role/${roleId}/permissions/${permissionId}`, {
      method: 'PUT',
    })

    // Audit log: Permission assigned (FR-029)
    logger.info('RoleService', `Permission ${permissionId} assigned to role ${roleId}`, {
      roleId,
      permissionId,
      operation: 'ASSIGN_PERMISSION',
    })

    return success(undefined)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to assign permission to role'
    logger.error(
      'RoleService',
      `Failed to assign permission ${permissionId} to role ${roleId}`,
      error
    )
    return failure(message)
  }
}

/**
 * Remove a permission from a role
 * DELETE /role/{roleId}/permissions/{permissionId}
 */
export async function removePermissionFromRole(
  roleId: number,
  permissionId: number
): Promise<ApiResult<void>> {
  try {
    await fetchJSON(`/role/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
    })

    // Audit log: Permission removed (FR-029)
    logger.info('RoleService', `Permission ${permissionId} removed from role ${roleId}`, {
      roleId,
      permissionId,
      operation: 'REMOVE_PERMISSION',
    })

    return success(undefined)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to remove permission from role'
    logger.error(
      'RoleService',
      `Failed to remove permission ${permissionId} from role ${roleId}`,
      error
    )
    return failure(message)
  }
}

// ============================================================================
// Role-User Operations
// ============================================================================

/**
 * Get users assigned to a role
 * GET /role/{roleId}/users
 */
export async function getRoleUsers(roleId: number): Promise<ApiResult<User[]>> {
  try {
    const data = await fetchJSON<unknown>(`/role/${roleId}/users`)
    const parsed = UserListSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('RoleService', 'Role users validation error', parsed.error)
      return failure('Invalid users response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch role users'
    logger.error('RoleService', `Failed to fetch users for role ${roleId}`, error)
    return failure(message)
  }
}

/**
 * Assign a user to a role
 * PUT /role/{roleId}/users/{userId}
 */
export async function assignUserToRole(
  roleId: number,
  userId: number
): Promise<ApiResult<void>> {
  try {
    await fetchJSON(`/role/${roleId}/users/${userId}`, {
      method: 'PUT',
    })

    // Audit log: User assigned (FR-029)
    logger.info('RoleService', `User ${userId} assigned to role ${roleId}`, {
      roleId,
      userId,
      operation: 'ASSIGN_USER',
    })

    return success(undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign user to role'
    logger.error('RoleService', `Failed to assign user ${userId} to role ${roleId}`, error)
    return failure(message)
  }
}

/**
 * Remove a user from a role
 * DELETE /role/{roleId}/users/{userId}
 */
export async function removeUserFromRole(
  roleId: number,
  userId: number
): Promise<ApiResult<void>> {
  try {
    await fetchJSON(`/role/${roleId}/users/${userId}`, {
      method: 'DELETE',
    })

    // Audit log: User removed (FR-029)
    logger.info('RoleService', `User ${userId} removed from role ${roleId}`, {
      roleId,
      userId,
      operation: 'REMOVE_USER',
    })

    return success(undefined)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to remove user from role'
    logger.error('RoleService', `Failed to remove user ${userId} from role ${roleId}`, error)
    return failure(message)
  }
}

// ============================================================================
// Export/Import Operations
// ============================================================================

/**
 * Export a role with its permissions and users
 * Custom operation combining multiple API calls
 */
export async function exportRole(roleId: number): Promise<ApiResult<string>> {
  try {
    // Fetch role details
    const roleResult = await fetchRoleById(roleId)
    if (!roleResult.isSuccess) {
      return failure(roleResult.message)
    }

    // Fetch role permissions
    const permissionsResult = await getRolePermissions(roleId)
    if (!permissionsResult.isSuccess) {
      return failure(permissionsResult.message)
    }

    // Fetch role users
    const usersResult = await getRoleUsers(roleId)
    if (!usersResult.isSuccess) {
      return failure(usersResult.message)
    }

    // Build export object
    const exportData = {
      role: {
        name: roleResult.data.name,
        description: roleResult.data.description,
        permissions: permissionsResult.data.map((p) => ({
          id: p.id,
          permission: p.permission || p.value,
          description: p.description,
        })),
        users: usersResult.data.map((u) => ({
          id: u.id,
          login: u.login,
          name: u.name,
        })),
      },
    }

    return success(JSON.stringify(exportData, null, 2))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export role'
    logger.error('RoleService', `Failed to export role ${roleId}`, error)
    return failure(message)
  }
}

/**
 * Import a role from JSON
 * Custom operation combining multiple API calls
 */
export async function importRole(jsonData: string): Promise<ApiResult<Role>> {
  try {
    // Parse and validate JSON
    const parsed = JSON.parse(jsonData)

    if (!parsed.role || !parsed.role.name) {
      return failure('Invalid role import format: missing role name')
    }

    // Create the role
    const createResult = await createRole({
      name: parsed.role.name,
      description: parsed.role.description,
    })

    if (!createResult.isSuccess) {
      return failure(createResult.message)
    }

    const newRole = createResult.data

    // Count assignments for audit log
    let permissionsAssigned = 0
    let usersAssigned = 0

    // Assign permissions if provided
    if (parsed.role.permissions && Array.isArray(parsed.role.permissions)) {
      for (const perm of parsed.role.permissions) {
        if (perm.id) {
          await assignPermissionToRole(newRole.id, perm.id)
          permissionsAssigned++
        }
      }
    }

    // Assign users if provided
    if (parsed.role.users && Array.isArray(parsed.role.users)) {
      for (const user of parsed.role.users) {
        if (user.id) {
          await assignUserToRole(newRole.id, user.id)
          usersAssigned++
        }
      }
    }

    // Audit log: Role imported (FR-029)
    logger.info('RoleService', `Role imported: "${newRole.name}" (ID: ${newRole.id})`, {
      roleId: newRole.id,
      roleName: newRole.name,
      permissionsAssigned,
      usersAssigned,
      operation: 'IMPORT',
    })

    return success(newRole)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import role'
    logger.error('RoleService', 'Failed to import role', error)
    return failure(message)
  }
}
