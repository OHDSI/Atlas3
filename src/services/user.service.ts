/**
 * User Service
 *
 * API integration for user operations
 * Handles fetching users for role assignment
 *
 * Based on: specs/001-role-permissions-management/contracts/role-api.yaml
 */

import { httpGet } from '@/services/http-client'
import { unwrap, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import { UserSchema, UserListSchema, type User } from '@/models/role.types'

const CONTEXT = 'UserService'

/**
 * Fetch all users
 * GET /user/
 *
 * @param limit - Maximum number of users to return (default: 50)
 * @param offset - Number of users to skip (default: 0)
 */
export async function fetchUsers(limit = 50, offset = 0): Promise<ApiResult<User[]>> {
  return unwrap(async () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    const url = `/user/?${params.toString()}`
    const data = await httpGet<unknown>(url)
    return parseOrThrow(UserListSchema, data, 'Invalid users response format')
  }, CONTEXT)
}

/**
 * Fetch single user by ID
 * GET /user/{userId}
 */
export async function fetchUserById(userId: number): Promise<ApiResult<User>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/user/${userId}`)
    return parseOrThrow(UserSchema, data, 'Invalid user response format')
  }, CONTEXT)
}

/**
 * Fetch all users without pagination
 * Convenience function that fetches up to 1000 users
 */
export async function fetchAllUsers(): Promise<ApiResult<User[]>> {
  return fetchUsers(1000, 0)
}
