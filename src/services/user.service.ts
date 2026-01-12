/**
 * User Service
 *
 * API integration for user operations
 * Handles fetching users for role assignment
 *
 * Based on: specs/001-role-permissions-management/contracts/role-api.yaml
 */

import { fetchJSON } from './webapi'
import {
  UserSchema,
  UserListSchema,
  type User,
  type ApiResult,
  success,
  failure,
} from '@/models/role.types'
import { logger } from '@/utils/logger'

/**
 * Fetch all users
 * GET /user/
 *
 * @param limit - Maximum number of users to return (default: 50)
 * @param offset - Number of users to skip (default: 0)
 */
export async function fetchUsers(limit = 50, offset = 0): Promise<ApiResult<User[]>> {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    const url = `/user/?${params.toString()}`
    const data = await fetchJSON<unknown>(url)
    const parsed = UserListSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('UserService', 'Users validation error', parsed.error)
      return failure('Invalid users response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users'
    logger.error('UserService', 'Failed to fetch users', error)
    return failure(message)
  }
}

/**
 * Fetch single user by ID
 * GET /user/{userId}
 */
export async function fetchUserById(userId: number): Promise<ApiResult<User>> {
  try {
    const data = await fetchJSON<unknown>(`/user/${userId}`)
    const parsed = UserSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('UserService', 'User validation error', parsed.error)
      return failure('Invalid user response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user'
    logger.error('UserService', `Failed to fetch user ${userId}`, error)
    return failure(message)
  }
}

/**
 * Fetch all users without pagination
 * Convenience function that fetches up to 1000 users
 */
export async function fetchAllUsers(): Promise<ApiResult<User[]>> {
  return fetchUsers(1000, 0)
}
