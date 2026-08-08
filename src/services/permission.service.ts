/**
 * Permission Service
 *
 * API integration for permission operations
 * Handles fetching system permissions for role assignment
 *
 * Based on: specs/001-role-permissions-management/contracts/role-api.yaml
 */

import { httpGet } from '@/services/http-client'
import { unwrap, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import { PermissionSchema, PermissionListSchema, type Permission } from '@/models/role.types'

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
    return parseOrThrow(PermissionListSchema, data, 'Invalid permissions response format')
  }, CONTEXT)
}

/**
 * Fetch single permission by ID
 * GET /permission/{permissionId}
 */
export async function fetchPermissionById(permissionId: number): Promise<ApiResult<Permission>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/permission/${permissionId}`)
    return parseOrThrow(PermissionSchema, data, 'Invalid permission response format')
  }, CONTEXT)
}

/**
 * Fetch all permissions without pagination
 * Convenience function that fetches up to 500 permissions
 */
export async function fetchAllPermissions(): Promise<ApiResult<Permission[]>> {
  return fetchPermissions(500, 0)
}
