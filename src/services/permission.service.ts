/**
 * Permission Service
 *
 * API integration for permission operations
 * Handles fetching system permissions for role assignment
 *
 * Based on: specs/001-role-permissions-management/contracts/role-api.yaml
 */

import { fetchJSON } from './webapi'
import {
  PermissionSchema,
  PermissionListSchema,
  type Permission,
  type ApiResult,
  success,
  failure,
} from '@/models/role.types'
import { logger } from '@/utils/logger'

/**
 * Fetch all system permissions
 * GET /permission/
 *
 * @param limit - Maximum number of permissions to return (default: 200)
 * @param offset - Number of permissions to skip (default: 0)
 * @param category - Optional category filter
 */
export async function fetchPermissions(
  limit = 200,
  offset = 0,
  category?: string
): Promise<ApiResult<Permission[]>> {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (category) {
      params.append('category', category)
    }

    const url = `/permission/?${params.toString()}`
    const data = await fetchJSON<unknown>(url)
    const parsed = PermissionListSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('PermissionService', 'Permissions validation error', parsed.error)
      return failure('Invalid permissions response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch permissions'
    logger.error('PermissionService', 'Failed to fetch permissions', error)
    return failure(message)
  }
}

/**
 * Fetch single permission by ID
 * GET /permission/{permissionId}
 */
export async function fetchPermissionById(
  permissionId: number
): Promise<ApiResult<Permission>> {
  try {
    const data = await fetchJSON<unknown>(`/permission/${permissionId}`)
    const parsed = PermissionSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('PermissionService', 'Permission validation error', parsed.error)
      return failure('Invalid permission response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch permission'
    logger.error('PermissionService', `Failed to fetch permission ${permissionId}`, error)
    return failure(message)
  }
}

/**
 * Fetch all permissions without pagination
 * Convenience function that fetches up to 500 permissions
 */
export async function fetchAllPermissions(): Promise<ApiResult<Permission[]>> {
  return fetchPermissions(500, 0)
}
