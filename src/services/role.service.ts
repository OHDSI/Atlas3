/**
 * Role Service
 *
 * API integration for role management operations
 * Handles all role CRUD operations and role-permission/role-user assignments
 *
 * Based on: specs/001-role-permissions-management/contracts/role-api.yaml
 */

import { z } from 'zod'
import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http-client'
import { unwrap, ApiError, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
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
} from '@/models/role.types'
import { logger } from '@/utils/logger'

const CONTEXT = 'RoleService'

// ============================================================================
// Role CRUD Operations
// ============================================================================

/**
 * Fetch all roles
 */
export async function fetchRoles(): Promise<ApiResult<Role[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/role/')
    return parseOrThrow(RoleListSchema, data, 'Invalid roles response format')
  }, CONTEXT)
}

/**
 * Fetch single role by ID
 * GET /role/{roleId}
 */
export async function fetchRoleById(roleId: number): Promise<ApiResult<Role>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/role/${roleId}`)
    return parseOrThrow(RawRoleSchema, data, 'Invalid role response format')
  }, CONTEXT)
}

/**
 * Create a new role
 * POST /role/
 */
export async function createRole(payload: RoleCreate): Promise<ApiResult<Role>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>('/role/', payload)
    const parsed = parseOrThrow(RawRoleSchema, data, 'Invalid role response format')

    // Audit log: Role created (FR-029)
    logger.info(CONTEXT, `Role created: "${parsed.name}" (ID: ${parsed.id})`, {
      roleId: parsed.id,
      roleName: parsed.name,
      operation: 'CREATE',
    })

    return parsed
  }, CONTEXT)
}

/**
 * Update an existing role
 * PUT /role/{roleId}
 */
export async function updateRole(roleId: number, payload: RoleUpdate): Promise<ApiResult<Role>> {
  return unwrap(async () => {
    const data = await httpPut<unknown>(`/role/${roleId}`, payload)
    const parsed = parseOrThrow(RawRoleSchema, data, 'Invalid role response format')

    // Audit log: Role updated (FR-029)
    logger.info(CONTEXT, `Role updated: "${parsed.name}" (ID: ${roleId})`, {
      roleId,
      roleName: parsed.name,
      operation: 'UPDATE',
      changes: payload,
    })

    return parsed
  }, CONTEXT)
}

/**
 * Delete a role
 * DELETE /role/{roleId}
 */
export async function deleteRole(roleId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/role/${roleId}`)

    // Audit log: Role deleted (FR-029)
    logger.info(CONTEXT, `Role deleted (ID: ${roleId})`, {
      roleId,
      operation: 'DELETE',
    })
  }, CONTEXT)
}

// ============================================================================
// Role-Permission Operations
// ============================================================================

/**
 * Get permissions assigned to a role
 * GET /role/{roleId}/permissions
 */
export async function getRolePermissions(roleId: number): Promise<ApiResult<Permission[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/role/${roleId}/permissions`)
    return parseOrThrow(PermissionListSchema, data, 'Invalid permissions response format')
  }, CONTEXT)
}

/**
 * Assign a permission to a role
 * PUT /role/{roleId}/permissions/{permissionId}
 */
export async function assignPermissionToRole(
  roleId: number,
  permissionId: number
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpPut(`/role/${roleId}/permissions/${permissionId}`)

    // Audit log: Permission assigned (FR-029)
    logger.info(CONTEXT, `Permission ${permissionId} assigned to role ${roleId}`, {
      roleId,
      permissionId,
      operation: 'ASSIGN_PERMISSION',
    })
  }, CONTEXT)
}

/**
 * Remove a permission from a role
 * DELETE /role/{roleId}/permissions/{permissionId}
 */
export async function removePermissionFromRole(
  roleId: number,
  permissionId: number
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/role/${roleId}/permissions/${permissionId}`)

    // Audit log: Permission removed (FR-029)
    logger.info(CONTEXT, `Permission ${permissionId} removed from role ${roleId}`, {
      roleId,
      permissionId,
      operation: 'REMOVE_PERMISSION',
    })
  }, CONTEXT)
}

// ============================================================================
// Role-User Operations
// ============================================================================

/**
 * Get users assigned to a role
 * GET /role/{roleId}/users
 */
export async function getRoleUsers(roleId: number): Promise<ApiResult<User[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/role/${roleId}/users`)
    return parseOrThrow(UserListSchema, data, 'Invalid users response format')
  }, CONTEXT)
}

/**
 * Assign a user to a role
 * PUT /role/{roleId}/users/{userId}
 */
export async function assignUserToRole(roleId: number, userId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpPut(`/role/${roleId}/users/${userId}`)

    // Audit log: User assigned (FR-029)
    logger.info(CONTEXT, `User ${userId} assigned to role ${roleId}`, {
      roleId,
      userId,
      operation: 'ASSIGN_USER',
    })
  }, CONTEXT)
}

/**
 * Remove a user from a role
 * DELETE /role/{roleId}/users/{userId}
 */
export async function removeUserFromRole(roleId: number, userId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/role/${roleId}/users/${userId}`)

    // Audit log: User removed (FR-029)
    logger.info(CONTEXT, `User ${userId} removed from role ${roleId}`, {
      roleId,
      userId,
      operation: 'REMOVE_USER',
    })
  }, CONTEXT)
}

// ============================================================================
// Export/Import Operations
// ============================================================================

/**
 * Export a role with its permissions and users
 * Custom operation combining multiple API calls
 */
export async function exportRole(roleId: number): Promise<ApiResult<string>> {
  return unwrap(async () => {
    // Fetch role details
    const roleResult = await fetchRoleById(roleId)
    if (!roleResult.success) throw roleResult.error

    // Fetch role permissions
    const permissionsResult = await getRolePermissions(roleId)
    if (!permissionsResult.success) throw permissionsResult.error

    // Fetch role users
    const usersResult = await getRoleUsers(roleId)
    if (!usersResult.success) throw usersResult.error

    // Build export object
    const exportData = {
      role: {
        name: roleResult.data.name,
        description: roleResult.data.description,
        permissions: permissionsResult.data.map(p => ({
          id: p.id,
          permission: p.permission || p.value,
          description: p.description,
        })),
        users: usersResult.data.map(u => ({
          id: u.id,
          login: u.login,
          name: u.name,
        })),
      },
    }

    return JSON.stringify(exportData, null, 2)
  }, CONTEXT)
}

/**
 * A member of the exported `permissions` / `users` arrays. Anything that is not
 * a list of objects is treated as "nothing to assign" rather than a hard
 * failure, matching what the export writes and what the importer can act on.
 */
const ImportAssignmentSchema = z.object({ id: z.number().nullish() }).passthrough()

const RoleImportSchema = z.object({
  role: z
    .object({
      name: z.string().min(1).max(255),
      description: z.string().max(1000).nullish(),
      permissions: z.array(ImportAssignmentSchema).catch([]),
      users: z.array(ImportAssignmentSchema).catch([]),
    })
    .passthrough(),
})

/**
 * Import a role from JSON
 * Custom operation combining multiple API calls
 *
 * Assignments are applied after the role exists, so a failure part-way through
 * would leave a half-configured role behind. The ApiResult<Role> contract has
 * no room for a partial-success payload, so the created role is rolled back and
 * the failure names what had been applied.
 */
export async function importRole(jsonData: string): Promise<ApiResult<Role>> {
  return unwrap(async () => {
    let raw: unknown
    try {
      raw = JSON.parse(jsonData)
    } catch (error) {
      throw new ApiError(
        'Invalid role import format: not valid JSON',
        0,
        error instanceof Error ? error.message : String(error)
      )
    }

    const imported = parseOrThrow(
      RoleImportSchema,
      raw,
      'Invalid role import format: missing role name'
    ).role

    // Create the role
    const createResult = await createRole({
      name: imported.name,
      description: imported.description ?? undefined,
    })

    if (!createResult.success) throw createResult.error

    const newRole = createResult.data

    // Count assignments for audit log
    let permissionsAssigned = 0
    let usersAssigned = 0

    const applyAssignments = async () => {
      for (const perm of imported.permissions) {
        if (perm.id) {
          const result = await assignPermissionToRole(newRole.id, perm.id)
          if (!result.success) {
            throw new ApiError(
              `Failed to assign permission ${perm.id}: ${result.error.message}`,
              result.error.status,
              result.error.body
            )
          }
          permissionsAssigned++
        }
      }

      for (const user of imported.users) {
        if (user.id) {
          const result = await assignUserToRole(newRole.id, user.id)
          if (!result.success) {
            throw new ApiError(
              `Failed to assign user ${user.id}: ${result.error.message}`,
              result.error.status,
              result.error.body
            )
          }
          usersAssigned++
        }
      }
    }

    try {
      await applyAssignments()
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error)
      const applied = `${permissionsAssigned} permission(s) and ${usersAssigned} user(s) had been assigned`
      const rollback = await deleteRole(newRole.id)
      const outcome = rollback.success
        ? `the imported role was removed (${applied})`
        : `the imported role "${newRole.name}" (ID: ${newRole.id}) could NOT be removed and is left half-configured (${applied})`

      logger.error(CONTEXT, `Role import failed: ${cause}`, {
        roleId: newRole.id,
        roleName: newRole.name,
        permissionsAssigned,
        usersAssigned,
        rolledBack: rollback.success,
        operation: 'IMPORT',
      })

      throw new ApiError(`${cause}; ${outcome}`, 0, null)
    }

    // Audit log: Role imported (FR-029)
    logger.info(CONTEXT, `Role imported: "${newRole.name}" (ID: ${newRole.id})`, {
      roleId: newRole.id,
      roleName: newRole.name,
      permissionsAssigned,
      usersAssigned,
      operation: 'IMPORT',
    })

    return newRole
  }, CONTEXT)
}
