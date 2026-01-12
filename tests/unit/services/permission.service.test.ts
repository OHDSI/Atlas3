/**
 * Unit tests for permission service
 * T089: Test fetchPermissions, fetchPermissionById, fetchAllPermissions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as permissionService from '@/services/permission.service'
import type { Permission } from '@/models/role.types'

// Mock dependencies
vi.mock('@/services/webapi')
vi.mock('@/utils/logger')

describe('permission.service', () => {
  let fetchJSON: typeof import('@/services/webapi').fetchJSON

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
    const webapi = await import('@/services/webapi')
    fetchJSON = webapi.fetchJSON
  })

  describe('fetchPermissions', () => {
    it('should fetch permissions with default pagination', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockPermissions)

      const result = await permissionService.fetchPermissions()

      expect(fetchJSON).toHaveBeenCalledWith('/permission/?limit=200&offset=0')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockPermissions)
      }
    })

    it('should fetch permissions with custom pagination', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockPermissions)

      const result = await permissionService.fetchPermissions(50, 10)

      expect(fetchJSON).toHaveBeenCalledWith('/permission/?limit=50&offset=10')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockPermissions)
      }
    })

    it('should fetch permissions with category filter', async () => {
      const filteredPermissions = mockPermissions.filter(p => p.category === 'Users')
      vi.mocked(fetchJSON).mockResolvedValue(filteredPermissions)

      const result = await permissionService.fetchPermissions(200, 0, 'Users')

      expect(fetchJSON).toHaveBeenCalledWith('/permission/?limit=200&offset=0&category=Users')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(filteredPermissions)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await permissionService.fetchPermissions()

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid permissions response format')
      }
    })

    it('should handle fetch error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Network error'))

      const result = await permissionService.fetchPermissions()

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Network error')
      }
    })
  })

  describe('fetchPermissionById', () => {
    it('should fetch single permission successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockPermission)

      const result = await permissionService.fetchPermissionById(1)

      expect(fetchJSON).toHaveBeenCalledWith('/permission/1')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockPermission)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await permissionService.fetchPermissionById(1)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid permission response format')
      }
    })

    it('should handle fetch error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Permission not found'))

      const result = await permissionService.fetchPermissionById(999)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Permission not found')
      }
    })
  })

  describe('fetchAllPermissions', () => {
    it('should fetch all permissions with high limit', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockPermissions)

      const result = await permissionService.fetchAllPermissions()

      expect(fetchJSON).toHaveBeenCalledWith('/permission/?limit=500&offset=0')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockPermissions)
      }
    })

    it('should handle errors from underlying fetchPermissions', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Server error'))

      const result = await permissionService.fetchAllPermissions()

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Server error')
      }
    })
  })
})
