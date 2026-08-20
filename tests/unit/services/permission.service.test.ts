/**
 * Unit tests for permission service
 * T089: Test fetchPermissions, fetchPermissionById, fetchAllPermissions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as permissionService from '@/services/permission.service'
import type { Permission } from '@/models/role.types'

// Mock dependencies
vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('permission.service', () => {
  let httpGet: typeof import('@/services/http-client').httpGet

  const mockPermissions: Permission[] = [
    {
      id: 1,
      permission: 'user:*:read',
      description: 'Read users',
      category: 'Users',
    },
    {
      id: 2,
      permission: 'role:*:read',
      description: 'Read roles',
      category: 'Roles',
    },
    {
      id: 3,
      permission: 'user:*:write',
      description: 'Write users',
      category: 'Users',
    },
  ]

  const mockPermission: Permission = mockPermissions[0]

  beforeEach(async () => {
    vi.clearAllMocks()
    const httpClient = await import('@/services/http-client')
    httpGet = httpClient.httpGet
  })

  describe('fetchPermissions', () => {
    it('should fetch permissions with default pagination', async () => {
      vi.mocked(httpGet).mockResolvedValue(mockPermissions)

      const result = await permissionService.fetchPermissions()

      expect(httpGet).toHaveBeenCalledWith('/permission/?limit=200&offset=0')
      if (result.success) {
        expect(result.data).toEqual(mockPermissions)
      } else {
        expect.fail(`expected success but got error: ${result.error.message}`)
      }
    })

    it('should fetch permissions with custom pagination', async () => {
      vi.mocked(httpGet).mockResolvedValue(mockPermissions)

      const result = await permissionService.fetchPermissions(50, 10)

      expect(httpGet).toHaveBeenCalledWith('/permission/?limit=50&offset=10')
      if (result.success) {
        expect(result.data).toEqual(mockPermissions)
      } else {
        expect.fail(`expected success but got error: ${result.error.message}`)
      }
    })

    it('should fetch permissions with category filter', async () => {
      const filteredPermissions = mockPermissions.filter(p => p.category === 'Users')
      vi.mocked(httpGet).mockResolvedValue(filteredPermissions)

      const result = await permissionService.fetchPermissions(200, 0, 'Users')

      expect(httpGet).toHaveBeenCalledWith('/permission/?limit=200&offset=0&category=Users')
      if (result.success) {
        expect(result.data).toEqual(filteredPermissions)
      } else {
        expect.fail(`expected success but got error: ${result.error.message}`)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(httpGet).mockResolvedValue({ invalid: 'data' })

      const result = await permissionService.fetchPermissions()

      if (!result.success) {
        expect(result.error.message).toBe('Invalid permissions response format')
      } else {
        expect.fail(`expected failure but got success with data: ${JSON.stringify(result.data)}`)
      }
    })

    it('should handle fetch error', async () => {
      vi.mocked(httpGet).mockRejectedValue(new Error('Network error'))

      const result = await permissionService.fetchPermissions()

      if (!result.success) {
        expect(result.error.message).toBe('Network error')
      } else {
        expect.fail(`expected failure but got success with data: ${JSON.stringify(result.data)}`)
      }
    })
  })

  describe('fetchPermissionById', () => {
    it('should fetch single permission successfully', async () => {
      vi.mocked(httpGet).mockResolvedValue(mockPermission)

      const result = await permissionService.fetchPermissionById(1)

      expect(httpGet).toHaveBeenCalledWith('/permission/1')
      if (result.success) {
        expect(result.data).toEqual(mockPermission)
      } else {
        expect.fail(`expected success but got error: ${result.error.message}`)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(httpGet).mockResolvedValue({ invalid: 'data' })

      const result = await permissionService.fetchPermissionById(1)

      if (!result.success) {
        expect(result.error.message).toBe('Invalid permission response format')
      } else {
        expect.fail(`expected failure but got success with data: ${JSON.stringify(result.data)}`)
      }
    })

    it('should handle fetch error', async () => {
      vi.mocked(httpGet).mockRejectedValue(new Error('Permission not found'))

      const result = await permissionService.fetchPermissionById(999)

      if (!result.success) {
        expect(result.error.message).toBe('Permission not found')
      } else {
        expect.fail(`expected failure but got success with data: ${JSON.stringify(result.data)}`)
      }
    })
  })

  describe('fetchAllPermissions', () => {
    it('should fetch all permissions with high limit', async () => {
      vi.mocked(httpGet).mockResolvedValue(mockPermissions)

      const result = await permissionService.fetchAllPermissions()

      expect(httpGet).toHaveBeenCalledWith('/permission/?limit=500&offset=0')
      if (result.success) {
        expect(result.data).toEqual(mockPermissions)
      } else {
        expect.fail(`expected success but got error: ${result.error.message}`)
      }
    })

    it('should handle errors from underlying fetchPermissions', async () => {
      vi.mocked(httpGet).mockRejectedValue(new Error('Server error'))

      const result = await permissionService.fetchAllPermissions()

      if (!result.success) {
        expect(result.error.message).toBe('Server error')
      } else {
        expect.fail(`expected failure but got success with data: ${JSON.stringify(result.data)}`)
      }
    })
  })
})
