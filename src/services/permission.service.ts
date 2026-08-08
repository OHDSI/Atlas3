/**
 * Permission Service
 *
 * API integration for permission operations
 * Handles fetching system permissions for role assignment
 *
 * Based on: specs/001-role-permissions-management/contracts/role-api.yaml
 */

import { httpGet } from '@/services/http-client'
import { unwrap, ApiError } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import { PermissionSchema, PermissionListSchema, type Permission } from '@/models/role.types'
import { logger } from '@/utils/logger'

const CONTEXT = 'PermissionService'

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
  return unwrap(async () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (category) {
      params.append('category', category)
    }

    const url = `/permission/?${params.toString()}`
    const data = await httpGet<unknown>(url)
    const parsed = PermissionListSchema.safeParse(data)

    if (!parsed.success) {
      logger.error(CONTEXT, 'Permissions validation error', parsed.error)
      throw new ApiError('Invalid permissions response format', 0, null)
    }

    return parsed.data
  }, CONTEXT)
}

/**
 * Fetch single permission by ID
 * GET /permission/{permissionId}
 */
export async function fetchPermissionById(permissionId: number): Promise<ApiResult<Permission>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/permission/${permissionId}`)
    const parsed = PermissionSchema.safeParse(data)

    if (!parsed.success) {
      logger.error(CONTEXT, 'Permission validation error', parsed.error)
      throw new ApiError('Invalid permission response format', 0, null)
    }

    return parsed.data
  }, CONTEXT)
}

/**
 * Fetch all permissions without pagination
 * Convenience function that fetches up to 500 permissions
 */
export async function fetchAllPermissions(): Promise<ApiResult<Permission[]>> {
  return fetchPermissions(500, 0)
}
