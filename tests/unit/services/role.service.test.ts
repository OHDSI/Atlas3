/**
 * Unit tests for role service
 * T088: Test role CRUD operations, permission/user assignments, export/import
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as roleService from '@/services/role.service'
import type { Role, RoleCreate, RoleUpdate, Permission, User } from '@/models/role.types'

// Mock dependencies
vi.mock('@/services/webapi')
vi.mock('@/utils/logger')

describe('role.service', () => {
  let fetchJSON: typeof import('@/services/webapi').fetchJSON

  const mockRole: Role = {
    id: 1,
    name: 'Admin',
    description: 'Administrator role',
    createdDate: '2024-01-01T10:00:00Z',
    modifiedDate: '2024-01-01T10:00:00Z',
  }

  const mockRoles: Role[] = [
    mockRole,
    {
      id: 2,
      name: 'User',
      description: 'Regular user role',
      createdDate: '2024-01-02T10:00:00Z',
      modifiedDate: '2024-01-02T10:00:00Z',
    },
  ]

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
  ]

  const mockUsers: User[] = [
    {
      id: 1,
      login: 'admin',
      name: 'Admin User',
      email: 'admin@example.com',
    },
    {
      id: 2,
      login: 'user',
      name: 'Regular User',
      email: 'user@example.com',
    },
  ]

  beforeEach(async () => {
    vi.clearAllMocks()
    const webapi = await import('@/services/webapi')
    fetchJSON = webapi.fetchJSON
  })

  describe('fetchRoles', () => {
    it('should fetch roles successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockRoles)

      const result = await roleService.fetchRoles()

      expect(fetchJSON).toHaveBeenCalledWith('/role/')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockRoles)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await roleService.fetchRoles()

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid roles response format')
      }
    })

    it('should handle fetch error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Network error'))

      const result = await roleService.fetchRoles()

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Network error')
      }
    })
  })

  describe('fetchRoleById', () => {
    it('should fetch single role successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockRole)

      const result = await roleService.fetchRoleById(1)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockRole)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await roleService.fetchRoleById(1)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid role response format')
      }
    })

    it('should handle fetch error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Role not found'))

      const result = await roleService.fetchRoleById(999)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Role not found')
      }
    })
  })

  describe('createRole', () => {
    it('should create role successfully', async () => {
      const createPayload: RoleCreate = {
        name: 'Editor',
        description: 'Editor role',
      }

      const createdRole: Role = {
        id: 3,
        name: 'Editor',
        description: 'Editor role',
        createdDate: '2024-01-03T10:00:00Z',
        modifiedDate: '2024-01-03T10:00:00Z',
      }

      vi.mocked(fetchJSON).mockResolvedValue(createdRole)

      const result = await roleService.createRole(createPayload)

      expect(fetchJSON).toHaveBeenCalledWith('/role/', {
        method: 'POST',
        body: JSON.stringify(createPayload),
      })
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(createdRole)
      }
    })

    it('should handle validation error', async () => {
      const createPayload: RoleCreate = {
        name: 'Editor',
        description: 'Editor role',
      }

      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await roleService.createRole(createPayload)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid role response format')
      }
    })

    it('should handle creation error', async () => {
      const createPayload: RoleCreate = {
        name: 'Editor',
        description: 'Editor role',
      }

      vi.mocked(fetchJSON).mockRejectedValue(new Error('Duplicate role name'))

      const result = await roleService.createRole(createPayload)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Duplicate role name')
      }
    })
  })

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      const updatePayload: RoleUpdate = {
        name: 'Admin Updated',
        description: 'Updated description',
      }

      const updatedRole: Role = {
        ...mockRole,
        name: 'Admin Updated',
        description: 'Updated description',
      }

      vi.mocked(fetchJSON).mockResolvedValue(updatedRole)

      const result = await roleService.updateRole(1, updatePayload)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1', {
        method: 'PUT',
        body: JSON.stringify(updatePayload),
      })
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(updatedRole)
      }
    })

    it('should handle validation error', async () => {
      const updatePayload: RoleUpdate = {
        name: 'Admin Updated',
      }

      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await roleService.updateRole(1, updatePayload)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid role response format')
      }
    })

    it('should handle update error', async () => {
      const updatePayload: RoleUpdate = {
        name: 'Admin Updated',
      }

      vi.mocked(fetchJSON).mockRejectedValue(new Error('Update failed'))

      const result = await roleService.updateRole(1, updatePayload)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Update failed')
      }
    })
  })

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(undefined)

      const result = await roleService.deleteRole(1)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1', {
        method: 'DELETE',
      })
      expect(result.isSuccess).toBe(true)
    })

    it('should handle delete error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Delete failed'))

      const result = await roleService.deleteRole(1)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Delete failed')
      }
    })
  })

  describe('getRolePermissions', () => {
    it('should get role permissions successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockPermissions)

      const result = await roleService.getRolePermissions(1)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1/permissions')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockPermissions)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await roleService.getRolePermissions(1)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid permissions response format')
      }
    })
  })

  describe('assignPermissionToRole', () => {
    it('should assign permission successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(undefined)

      const result = await roleService.assignPermissionToRole(1, 2)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1/permissions/2', {
        method: 'PUT',
      })
      expect(result.isSuccess).toBe(true)
    })

    it('should handle assignment error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Assignment failed'))

      const result = await roleService.assignPermissionToRole(1, 2)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Assignment failed')
      }
    })
  })

  describe('removePermissionFromRole', () => {
    it('should remove permission successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(undefined)

      const result = await roleService.removePermissionFromRole(1, 2)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1/permissions/2', {
        method: 'DELETE',
      })
      expect(result.isSuccess).toBe(true)
    })

    it('should handle removal error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Removal failed'))

      const result = await roleService.removePermissionFromRole(1, 2)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Removal failed')
      }
    })
  })

  describe('getRoleUsers', () => {
    it('should get role users successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(mockUsers)

      const result = await roleService.getRoleUsers(1)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1/users')
      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data).toEqual(mockUsers)
      }
    })

    it('should handle validation error', async () => {
      vi.mocked(fetchJSON).mockResolvedValue({ invalid: 'data' })

      const result = await roleService.getRoleUsers(1)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid users response format')
      }
    })
  })

  describe('assignUserToRole', () => {
    it('should assign user successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(undefined)

      const result = await roleService.assignUserToRole(1, 2)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1/users/2', {
        method: 'PUT',
      })
      expect(result.isSuccess).toBe(true)
    })

    it('should handle assignment error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Assignment failed'))

      const result = await roleService.assignUserToRole(1, 2)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Assignment failed')
      }
    })
  })

  describe('removeUserFromRole', () => {
    it('should remove user successfully', async () => {
      vi.mocked(fetchJSON).mockResolvedValue(undefined)

      const result = await roleService.removeUserFromRole(1, 2)

      expect(fetchJSON).toHaveBeenCalledWith('/role/1/users/2', {
        method: 'DELETE',
      })
      expect(result.isSuccess).toBe(true)
    })

    it('should handle removal error', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Removal failed'))

      const result = await roleService.removeUserFromRole(1, 2)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Removal failed')
      }
    })
  })

  describe('exportRole', () => {
    it('should export role successfully', async () => {
      vi.mocked(fetchJSON)
        .mockResolvedValueOnce(mockRole) // fetchRoleById
        .mockResolvedValueOnce(mockPermissions) // getRolePermissions
        .mockResolvedValueOnce(mockUsers) // getRoleUsers

      const result = await roleService.exportRole(1)

      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        const exportData = JSON.parse(result.data)
        expect(exportData.role.name).toBe('Admin')
        expect(exportData.role.permissions).toHaveLength(2)
        expect(exportData.role.users).toHaveLength(2)
      }
    })

    it('should handle export error when role fetch fails', async () => {
      vi.mocked(fetchJSON).mockRejectedValue(new Error('Role not found'))

      const result = await roleService.exportRole(999)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Role not found')
      }
    })
  })

  describe('importRole', () => {
    it('should import role successfully', async () => {
      const importData = JSON.stringify({
        role: {
          name: 'Imported Role',
          description: 'Imported description',
          permissions: [{ id: 1 }, { id: 2 }],
          users: [{ id: 1 }],
        },
      })

      const createdRole: Role = {
        id: 10,
        name: 'Imported Role',
        description: 'Imported description',
        createdDate: '2024-01-10T10:00:00Z',
        modifiedDate: '2024-01-10T10:00:00Z',
      }

      vi.mocked(fetchJSON)
        .mockResolvedValueOnce(createdRole) // createRole
        .mockResolvedValueOnce(undefined) // assignPermissionToRole (1)
        .mockResolvedValueOnce(undefined) // assignPermissionToRole (2)
        .mockResolvedValueOnce(undefined) // assignUserToRole (1)

      const result = await roleService.importRole(importData)

      expect(result.isSuccess).toBe(true)
      if (result.isSuccess) {
        expect(result.data.name).toBe('Imported Role')
      }
      expect(fetchJSON).toHaveBeenCalledTimes(4) // 1 create + 2 permissions + 1 user
    })

    it('should handle invalid JSON', async () => {
      const invalidJSON = 'not valid json'

      const result = await roleService.importRole(invalidJSON)

      expect(result.isSuccess).toBe(false)
    })

    it('should handle missing role name', async () => {
      const invalidData = JSON.stringify({
        role: {
          description: 'Missing name',
        },
      })

      const result = await roleService.importRole(invalidData)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Invalid role import format: missing role name')
      }
    })

    it('should handle role creation failure', async () => {
      const importData = JSON.stringify({
        role: {
          name: 'Imported Role',
          description: 'Imported description',
        },
      })

      vi.mocked(fetchJSON).mockRejectedValue(new Error('Role already exists'))

      const result = await roleService.importRole(importData)

      expect(result.isSuccess).toBe(false)
      if (!result.isSuccess) {
        expect(result.message).toBe('Role already exists')
      }
    })
  })
})
