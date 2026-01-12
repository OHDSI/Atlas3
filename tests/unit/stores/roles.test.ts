/**
 * Unit tests for roles store
 * T087: Test fetchRoles, createRole, deleteRole actions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRolesStore } from '@/stores/roles'
import type { Role, RoleCreate, RoleUpdate, ApiResult } from '@/models/role.types'

// Mock the services
vi.mock('@/services/role.service')
vi.mock('@/services/permission.service')
vi.mock('@/services/user.service')
vi.mock('@/utils/logger')

describe('useRolesStore', () => {
  let roleService: typeof import('@/services/role.service')
  let _permissionService: typeof import('@/services/permission.service')
  let _userService: typeof import('@/services/user.service')

  const mockRoles: Role[] = [
    {
      id: 1,
      name: 'Admin',
      description: 'Administrator role',
      createdDate: '2024-01-01T10:00:00Z',
      modifiedDate: '2024-01-01T10:00:00Z',
    },
    {
      id: 2,
      name: 'User',
      description: 'Regular user role',
      createdDate: '2024-01-02T10:00:00Z',
      modifiedDate: '2024-01-02T10:00:00Z',
    },
  ]

  const mockRole: Role = {
    id: 3,
    name: 'Editor',
    description: 'Editor role',
    createdDate: '2024-01-03T10:00:00Z',
    modifiedDate: '2024-01-03T10:00:00Z',
  }

  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Import mocked services
    roleService = await import('@/services/role.service')
    _permissionService = await import('@/services/permission.service')
    _userService = await import('@/services/user.service')
  })

  describe('fetchRoles', () => {
    it('should fetch roles successfully', async () => {
      const successResult: ApiResult<Role[]> = {
        isSuccess: true,
        data: mockRoles,
      }

      vi.spyOn(roleService, 'fetchRoles').mockResolvedValue(successResult)

      const store = useRolesStore()
      const result = await store.fetchRoles()

      expect(roleService.fetchRoles).toHaveBeenCalled()
      expect(result).toBe(true)
      expect(store.roles).toEqual(mockRoles)
      expect(store.rolesError).toBeNull()
      expect(store.isLoadingRoles).toBe(false)
    })

    it('should handle fetch roles error', async () => {
      const errorResult: ApiResult<Role[]> = {
        isSuccess: false,
        message: 'Failed to fetch roles',
      }

      vi.spyOn(roleService, 'fetchRoles').mockResolvedValue(errorResult)

      const store = useRolesStore()
      const result = await store.fetchRoles()

      expect(result).toBe(false)
      expect(store.roles).toEqual([])
      expect(store.rolesError).toBe('Failed to fetch roles')
    })

    it('should handle fetch roles exception', async () => {
      vi.spyOn(roleService, 'fetchRoles').mockRejectedValue(new Error('Network error'))

      const store = useRolesStore()
      const result = await store.fetchRoles()

      expect(result).toBe(false)
      expect(store.rolesError).toBe('Network error')
    })

    it('should set loading state correctly', async () => {
      const successResult: ApiResult<Role[]> = {
        isSuccess: true,
        data: mockRoles,
      }

      vi.spyOn(roleService, 'fetchRoles').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(successResult), 100))
      )

      const store = useRolesStore()
      const fetchPromise = store.fetchRoles()

      expect(store.isLoadingRoles).toBe(true)

      await fetchPromise
      expect(store.isLoadingRoles).toBe(false)
    })
  })

  describe('fetchRoleById', () => {
    it('should fetch single role successfully', async () => {
      const successResult: ApiResult<Role> = {
        isSuccess: true,
        data: mockRole,
      }

      vi.spyOn(roleService, 'fetchRoleById').mockResolvedValue(successResult)

      const store = useRolesStore()
      const result = await store.fetchRoleById(3)

      expect(roleService.fetchRoleById).toHaveBeenCalledWith(3)
      expect(result).toBe(true)
      expect(store.currentRole).toEqual(mockRole)
      expect(store.rolesError).toBeNull()
    })

    it('should handle fetch role by id error', async () => {
      const errorResult: ApiResult<Role> = {
        isSuccess: false,
        message: 'Role not found',
      }

      vi.spyOn(roleService, 'fetchRoleById').mockResolvedValue(errorResult)

      const store = useRolesStore()
      const result = await store.fetchRoleById(999)

      expect(result).toBe(false)
      expect(store.currentRole).toBeNull()
      expect(store.rolesError).toBe('Role not found')
    })
  })

  describe('createRole', () => {
    it('should create role successfully', async () => {
      const createPayload: RoleCreate = {
        name: 'Editor',
        description: 'Editor role',
      }

      const successResult: ApiResult<Role> = {
        isSuccess: true,
        data: mockRole,
      }

      vi.spyOn(roleService, 'createRole').mockResolvedValue(successResult)

      const store = useRolesStore()
      const result = await store.createRole(createPayload)

      expect(roleService.createRole).toHaveBeenCalledWith(createPayload)
      expect(result).toEqual(mockRole)
      expect(store.roles).toContainEqual(mockRole)
      expect(store.currentRole).toEqual(mockRole)
      expect(store.rolesError).toBeNull()
    })

    it('should handle create role error', async () => {
      const createPayload: RoleCreate = {
        name: 'Editor',
        description: 'Editor role',
      }

      const errorResult: ApiResult<Role> = {
        isSuccess: false,
        message: 'Role name already exists',
      }

      vi.spyOn(roleService, 'createRole').mockResolvedValue(errorResult)

      const store = useRolesStore()
      const result = await store.createRole(createPayload)

      expect(result).toBeNull()
      expect(store.rolesError).toBe('Role name already exists')
      expect(store.roles).toEqual([])
    })

    it('should set saving state correctly', async () => {
      const createPayload: RoleCreate = {
        name: 'Editor',
        description: 'Editor role',
      }

      const successResult: ApiResult<Role> = {
        isSuccess: true,
        data: mockRole,
      }

      vi.spyOn(roleService, 'createRole').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(successResult), 100))
      )

      const store = useRolesStore()
      const createPromise = store.createRole(createPayload)

      expect(store.isSaving).toBe(true)

      await createPromise
      expect(store.isSaving).toBe(false)
    })
  })

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      const updatePayload: RoleUpdate = {
        name: 'Admin Updated',
        description: 'Updated administrator role',
      }

      const updatedRole: Role = {
        ...mockRoles[0],
        name: 'Admin Updated',
        description: 'Updated administrator role',
      }

      const successResult: ApiResult<Role> = {
        isSuccess: true,
        data: updatedRole,
      }

      vi.spyOn(roleService, 'updateRole').mockResolvedValue(successResult)

      const store = useRolesStore()
      store.roles = [...mockRoles]
      store.currentRole = mockRoles[0]

      const result = await store.updateRole(1, updatePayload)

      expect(roleService.updateRole).toHaveBeenCalledWith(1, updatePayload)
      expect(result).toBe(true)
      expect(store.roles[0]).toEqual(updatedRole)
      expect(store.currentRole).toEqual(updatedRole)
    })

    it('should handle update role error', async () => {
      const updatePayload: RoleUpdate = {
        name: 'Admin Updated',
      }

      const errorResult: ApiResult<Role> = {
        isSuccess: false,
        message: 'Update failed',
      }

      vi.spyOn(roleService, 'updateRole').mockResolvedValue(errorResult)

      const store = useRolesStore()
      const result = await store.updateRole(1, updatePayload)

      expect(result).toBe(false)
      expect(store.rolesError).toBe('Update failed')
    })
  })

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      const successResult: ApiResult<void> = {
        isSuccess: true,
        data: undefined,
      }

      vi.spyOn(roleService, 'deleteRole').mockResolvedValue(successResult)

      const store = useRolesStore()
      store.roles = [...mockRoles]
      store.currentRole = mockRoles[0]

      const result = await store.deleteRole(1)

      expect(roleService.deleteRole).toHaveBeenCalledWith(1)
      expect(result).toBe(true)
      expect(store.roles).toHaveLength(1)
      expect(store.roles.find(r => r.id === 1)).toBeUndefined()
      expect(store.currentRole).toBeNull()
    })

    it('should handle delete role error', async () => {
      const errorResult: ApiResult<void> = {
        isSuccess: false,
        message: 'Delete failed',
      }

      vi.spyOn(roleService, 'deleteRole').mockResolvedValue(errorResult)

      const store = useRolesStore()
      store.roles = [...mockRoles]

      const result = await store.deleteRole(1)

      expect(result).toBe(false)
      expect(store.rolesError).toBe('Delete failed')
      expect(store.roles).toHaveLength(2) // Not deleted
    })

    it('should set deleting state correctly', async () => {
      const successResult: ApiResult<void> = {
        isSuccess: true,
        data: undefined,
      }

      vi.spyOn(roleService, 'deleteRole').mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(successResult), 100))
      )

      const store = useRolesStore()
      store.roles = [...mockRoles]

      const deletePromise = store.deleteRole(1)

      expect(store.isDeleting).toBe(true)

      await deletePromise
      expect(store.isDeleting).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should compute hasRoles correctly', () => {
      const store = useRolesStore()

      expect(store.hasRoles).toBe(false)

      store.roles = mockRoles
      expect(store.hasRoles).toBe(true)
    })

    it('should compute isLoading correctly', () => {
      const store = useRolesStore()

      expect(store.isLoading).toBe(false)

      store.isLoadingRoles = true
      expect(store.isLoading).toBe(true)

      store.isLoadingRoles = false
      store.isLoadingPermissions = true
      expect(store.isLoading).toBe(true)

      store.isLoadingPermissions = false
      store.isLoadingUsers = true
      expect(store.isLoading).toBe(true)
    })

    it('should compute hasError correctly', () => {
      const store = useRolesStore()

      expect(store.hasError).toBe(false)

      store.rolesError = 'Error'
      expect(store.hasError).toBe(true)

      store.rolesError = null
      store.permissionsError = 'Error'
      expect(store.hasError).toBe(true)

      store.permissionsError = null
      store.usersError = 'Error'
      expect(store.hasError).toBe(true)
    })
  })

  describe('clearState', () => {
    it('should clear all state', () => {
      const store = useRolesStore()
      store.roles = mockRoles
      store.currentRole = mockRole
      store.rolesError = 'Error'

      store.clearState()

      expect(store.roles).toEqual([])
      expect(store.currentRole).toBeNull()
      expect(store.rolesError).toBeNull()
    })
  })

  describe('clearCurrentRole', () => {
    it('should clear current role and related data', () => {
      const store = useRolesStore()
      store.currentRole = mockRole
      store.rolePermissions = []
      store.roleUsers = []

      store.clearCurrentRole()

      expect(store.currentRole).toBeNull()
      expect(store.rolePermissions).toEqual([])
      expect(store.roleUsers).toEqual([])
    })
  })
})
