/**
 * Unit tests for roles store
 * T087: Test fetchRoles, createRole, deleteRole actions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRolesStore } from '@/stores/roles'
import type { Role, RoleCreate, RoleUpdate, Permission, User } from '@/models/role.types'
import type { ApiResult } from '@/types/api'
import { ApiError } from '@/services/api-error'

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
        success: true,
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
        success: false,
        error: new ApiError('Failed to fetch roles', 0, null),
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

    it('should fall back to default message on non-Error rejection', async () => {
      vi.spyOn(roleService, 'fetchRoles').mockRejectedValue('weird')

      const store = useRolesStore()
      const result = await store.fetchRoles()

      expect(result).toBe(false)
      expect(store.rolesError).toBe('Failed to fetch roles')
    })

    it('should set loading state correctly', async () => {
      const successResult: ApiResult<Role[]> = {
        success: true,
        data: mockRoles,
      }

      // Use a deferred promise (no real setTimeout) so this test doesn't depend
      // on real-timer scheduling under the project's singleFork pool.
      let resolveFetch!: (val: ApiResult<Role[]>) => void
      vi.spyOn(roleService, 'fetchRoles').mockImplementation(
        () => new Promise<ApiResult<Role[]>>((resolve) => { resolveFetch = resolve })
      )

      const store = useRolesStore()
      const fetchPromise = store.fetchRoles()

      expect(store.isLoadingRoles).toBe(true)

      resolveFetch(successResult)
      await fetchPromise
      expect(store.isLoadingRoles).toBe(false)
    })
  })

  describe('fetchRoleById', () => {
    it('should fetch single role successfully', async () => {
      const successResult: ApiResult<Role> = {
        success: true,
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
        success: false,
        error: new ApiError('Role not found', 0, null),
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
        success: true,
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
        success: false,
        error: new ApiError('Role name already exists', 0, null),
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
        success: true,
        data: mockRole,
      }

      // Use a deferred promise (no real setTimeout) so this test doesn't depend
      // on real-timer scheduling under the project's singleFork pool.
      let resolveCreate!: (val: ApiResult<Role>) => void
      vi.spyOn(roleService, 'createRole').mockImplementation(
        () => new Promise<ApiResult<Role>>((resolve) => { resolveCreate = resolve })
      )

      const store = useRolesStore()
      const createPromise = store.createRole(createPayload)

      expect(store.isSaving).toBe(true)

      resolveCreate(successResult)
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
        success: true,
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
        success: false,
        error: new ApiError('Update failed', 0, null),
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
        success: true,
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
        success: false,
        error: new ApiError('Delete failed', 0, null),
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
        success: true,
        data: undefined,
      }

      // Use a deferred promise (no real setTimeout) so this test doesn't depend
      // on real-timer scheduling under the project's singleFork pool.
      let resolveDelete!: (val: ApiResult<void>) => void
      vi.spyOn(roleService, 'deleteRole').mockImplementation(
        () => new Promise<ApiResult<void>>((resolve) => { resolveDelete = resolve })
      )

      const store = useRolesStore()
      store.roles = [...mockRoles]

      const deletePromise = store.deleteRole(1)

      expect(store.isDeleting).toBe(true)

      resolveDelete(successResult)
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

  describe('fetchRoleById exception handling', () => {
    it('should handle exception with Error instance', async () => {
      vi.spyOn(roleService, 'fetchRoleById').mockRejectedValue(new Error('Network down'))

      const store = useRolesStore()
      const result = await store.fetchRoleById(1)

      expect(result).toBe(false)
      expect(store.rolesError).toBe('Network down')
      expect(store.isLoadingRoles).toBe(false)
    })

    it('should fall back to default message when error is non-Error', async () => {
      vi.spyOn(roleService, 'fetchRoleById').mockRejectedValue('string error')

      const store = useRolesStore()
      const result = await store.fetchRoleById(1)

      expect(result).toBe(false)
      expect(store.rolesError).toBe('Failed to fetch role')
    })
  })

  describe('createRole exception handling', () => {
    it('should handle exception with Error instance', async () => {
      vi.spyOn(roleService, 'createRole').mockRejectedValue(new Error('boom'))

      const store = useRolesStore()
      const result = await store.createRole({ name: 'X', description: 'Y' })

      expect(result).toBeNull()
      expect(store.rolesError).toBe('boom')
      expect(store.isSaving).toBe(false)
    })

    it('should fall back to default message when error is non-Error', async () => {
      vi.spyOn(roleService, 'createRole').mockRejectedValue('not an error')

      const store = useRolesStore()
      const result = await store.createRole({ name: 'X', description: 'Y' })

      expect(result).toBeNull()
      expect(store.rolesError).toBe('Failed to create role')
    })
  })

  describe('updateRole edge cases', () => {
    it('should not update currentRole when ids do not match', async () => {
      const updatedRole: Role = { ...mockRoles[0], name: 'Updated' }
      vi.spyOn(roleService, 'updateRole').mockResolvedValue({
        success: true,
        data: updatedRole,
      })

      const store = useRolesStore()
      store.roles = [...mockRoles]
      // currentRole is a different role
      store.currentRole = mockRoles[1]

      await store.updateRole(1, { name: 'Updated' })

      expect(store.roles[0]).toEqual(updatedRole)
      // currentRole should remain mockRoles[1]
      expect(store.currentRole).toEqual(mockRoles[1])
    })

    it('should handle role missing in roles array', async () => {
      const updatedRole: Role = { ...mockRole, name: 'Updated' }
      vi.spyOn(roleService, 'updateRole').mockResolvedValue({
        success: true,
        data: updatedRole,
      })

      const store = useRolesStore()
      // store.roles is empty but the API returns success
      const result = await store.updateRole(99, { name: 'Updated' })
      expect(result).toBe(true)
    })

    it('should handle update exception with Error', async () => {
      vi.spyOn(roleService, 'updateRole').mockRejectedValue(new Error('connection lost'))
      const store = useRolesStore()
      const result = await store.updateRole(1, { name: 'X' })
      expect(result).toBe(false)
      expect(store.rolesError).toBe('connection lost')
    })

    it('should fall back to default message on update non-Error rejection', async () => {
      vi.spyOn(roleService, 'updateRole').mockRejectedValue(42)
      const store = useRolesStore()
      const result = await store.updateRole(1, { name: 'X' })
      expect(result).toBe(false)
      expect(store.rolesError).toBe('Failed to update role')
    })
  })

  describe('deleteRole edge cases', () => {
    it('should not clear currentRole when ids do not match', async () => {
      vi.spyOn(roleService, 'deleteRole').mockResolvedValue({
        success: true,
        data: undefined,
      })

      const store = useRolesStore()
      store.roles = [...mockRoles]
      store.currentRole = mockRoles[1]

      await store.deleteRole(1)

      expect(store.currentRole).toEqual(mockRoles[1])
    })

    it('should handle delete exception with Error', async () => {
      vi.spyOn(roleService, 'deleteRole').mockRejectedValue(new Error('forbidden'))
      const store = useRolesStore()
      const result = await store.deleteRole(1)
      expect(result).toBe(false)
      expect(store.rolesError).toBe('forbidden')
    })

    it('should fall back to default message on delete non-Error rejection', async () => {
      vi.spyOn(roleService, 'deleteRole').mockRejectedValue(undefined)
      const store = useRolesStore()
      const result = await store.deleteRole(1)
      expect(result).toBe(false)
      expect(store.rolesError).toBe('Failed to delete role')
    })
  })

  describe('fetchPermissions', () => {
    const mockPermissions: Permission[] = [
      { id: 1, permission: 'cohort:get', description: 'Read cohort' },
      { id: 2, permission: 'cohort:put', description: 'Write cohort' },
    ]

    it('should fetch permissions successfully', async () => {
      const successResult: ApiResult<Permission[]> = {
        success: true,
        data: mockPermissions,
      }
      vi.spyOn(_permissionService, 'fetchAllPermissions').mockResolvedValue(successResult)

      const store = useRolesStore()
      const ok = await store.fetchPermissions()

      expect(ok).toBe(true)
      expect(store.permissions).toEqual(mockPermissions)
      expect(store.permissionsError).toBeNull()
      expect(store.isLoadingPermissions).toBe(false)
      expect(store.hasPermissions).toBe(true)
    })

    it('should handle fetchPermissions failure result', async () => {
      vi.spyOn(_permissionService, 'fetchAllPermissions').mockResolvedValue({
        success: false,
        error: new ApiError('denied', 0, null),
      })

      const store = useRolesStore()
      const ok = await store.fetchPermissions()

      expect(ok).toBe(false)
      expect(store.permissionsError).toBe('denied')
    })

    it('should handle fetchPermissions exception (Error)', async () => {
      vi.spyOn(_permissionService, 'fetchAllPermissions').mockRejectedValue(new Error('500'))
      const store = useRolesStore()
      const ok = await store.fetchPermissions()
      expect(ok).toBe(false)
      expect(store.permissionsError).toBe('500')
    })

    it('should fall back to default message on non-Error rejection', async () => {
      vi.spyOn(_permissionService, 'fetchAllPermissions').mockRejectedValue('boom')
      const store = useRolesStore()
      const ok = await store.fetchPermissions()
      expect(ok).toBe(false)
      expect(store.permissionsError).toBe('Failed to fetch permissions')
    })
  })

  describe('fetchRolePermissions', () => {
    const mockPerms: Permission[] = [{ id: 1, permission: 'cohort:get' }]

    it('should fetch role permissions successfully', async () => {
      vi.spyOn(roleService, 'getRolePermissions').mockResolvedValue({
        success: true,
        data: mockPerms,
      })

      const store = useRolesStore()
      const ok = await store.fetchRolePermissions(1)

      expect(ok).toBe(true)
      expect(store.rolePermissions).toEqual(mockPerms)
      expect(store.permissionsError).toBeNull()
    })

    it('should handle failure result', async () => {
      vi.spyOn(roleService, 'getRolePermissions').mockResolvedValue({
        success: false,
        error: new ApiError('no role', 0, null),
      })
      const store = useRolesStore()
      const ok = await store.fetchRolePermissions(1)
      expect(ok).toBe(false)
      expect(store.permissionsError).toBe('no role')
    })

    it('should handle exception with Error', async () => {
      vi.spyOn(roleService, 'getRolePermissions').mockRejectedValue(new Error('net'))
      const store = useRolesStore()
      const ok = await store.fetchRolePermissions(1)
      expect(ok).toBe(false)
      expect(store.permissionsError).toBe('net')
    })

    it('should fall back to default on non-Error', async () => {
      vi.spyOn(roleService, 'getRolePermissions').mockRejectedValue(null)
      const store = useRolesStore()
      const ok = await store.fetchRolePermissions(1)
      expect(ok).toBe(false)
      expect(store.permissionsError).toBe('Failed to fetch role permissions')
    })
  })

  describe('assignPermissionToRole', () => {
    const perm: Permission = { id: 10, permission: 'do:thing' }

    it('should assign permission and add to rolePermissions if known', async () => {
      vi.spyOn(roleService, 'assignPermissionToRole').mockResolvedValue({
        success: true,
        data: undefined,
      })

      const store = useRolesStore()
      store.permissions = [perm]
      store.rolePermissions = []

      const ok = await store.assignPermissionToRole(1, 10)
      expect(ok).toBe(true)
      expect(store.rolePermissions).toContainEqual(perm)
      expect(store.isSaving).toBe(false)
    })

    it('should not double-add a permission already on role', async () => {
      vi.spyOn(roleService, 'assignPermissionToRole').mockResolvedValue({
        success: true,
        data: undefined,
      })

      const store = useRolesStore()
      store.permissions = [perm]
      store.rolePermissions = [perm]

      await store.assignPermissionToRole(1, 10)
      expect(store.rolePermissions).toHaveLength(1)
    })

    it('should handle missing permission silently (not pushed)', async () => {
      vi.spyOn(roleService, 'assignPermissionToRole').mockResolvedValue({
        success: true,
        data: undefined,
      })

      const store = useRolesStore()
      store.permissions = []
      store.rolePermissions = []

      const ok = await store.assignPermissionToRole(1, 10)
      expect(ok).toBe(true)
      expect(store.rolePermissions).toHaveLength(0)
    })

    it('should return false on failure result', async () => {
      vi.spyOn(roleService, 'assignPermissionToRole').mockResolvedValue({
        success: false,
        error: new ApiError('forbidden', 0, null),
      })

      const store = useRolesStore()
      const ok = await store.assignPermissionToRole(1, 10)
      expect(ok).toBe(false)
      expect(store.isSaving).toBe(false)
    })

    it('should handle exceptions', async () => {
      vi.spyOn(roleService, 'assignPermissionToRole').mockRejectedValue(new Error('crash'))
      const store = useRolesStore()
      const ok = await store.assignPermissionToRole(1, 10)
      expect(ok).toBe(false)
      expect(store.isSaving).toBe(false)
    })
  })

  describe('removePermissionFromRole', () => {
    const perm: Permission = { id: 10, permission: 'do:thing' }

    it('should remove permission from rolePermissions', async () => {
      vi.spyOn(roleService, 'removePermissionFromRole').mockResolvedValue({
        success: true,
        data: undefined,
      })

      const store = useRolesStore()
      store.rolePermissions = [perm]
      const ok = await store.removePermissionFromRole(1, 10)
      expect(ok).toBe(true)
      expect(store.rolePermissions).toHaveLength(0)
    })

    it('should noop when permission not present', async () => {
      vi.spyOn(roleService, 'removePermissionFromRole').mockResolvedValue({
        success: true,
        data: undefined,
      })
      const store = useRolesStore()
      store.rolePermissions = []
      const ok = await store.removePermissionFromRole(1, 99)
      expect(ok).toBe(true)
    })

    it('should return false on failure result', async () => {
      vi.spyOn(roleService, 'removePermissionFromRole').mockResolvedValue({
        success: false,
        error: new ApiError('no', 0, null),
      })
      const store = useRolesStore()
      const ok = await store.removePermissionFromRole(1, 10)
      expect(ok).toBe(false)
    })

    it('should handle exceptions', async () => {
      vi.spyOn(roleService, 'removePermissionFromRole').mockRejectedValue(new Error('boom'))
      const store = useRolesStore()
      const ok = await store.removePermissionFromRole(1, 10)
      expect(ok).toBe(false)
    })
  })

  describe('fetchUsers', () => {
    const mockUsers: User[] = [
      { id: 1, login: 'alice', name: 'Alice' },
      { id: 2, login: 'bob', name: 'Bob' },
    ]

    it('should fetch users successfully', async () => {
      vi.spyOn(_userService, 'fetchAllUsers').mockResolvedValue({
        success: true,
        data: mockUsers,
      })

      const store = useRolesStore()
      const ok = await store.fetchUsers()
      expect(ok).toBe(true)
      expect(store.users).toEqual(mockUsers)
      expect(store.hasUsers).toBe(true)
    })

    it('should handle failure result', async () => {
      vi.spyOn(_userService, 'fetchAllUsers').mockResolvedValue({
        success: false,
        error: new ApiError('no', 0, null),
      })
      const store = useRolesStore()
      const ok = await store.fetchUsers()
      expect(ok).toBe(false)
      expect(store.usersError).toBe('no')
    })

    it('should handle exception with Error', async () => {
      vi.spyOn(_userService, 'fetchAllUsers').mockRejectedValue(new Error('downed'))
      const store = useRolesStore()
      const ok = await store.fetchUsers()
      expect(ok).toBe(false)
      expect(store.usersError).toBe('downed')
    })

    it('should fall back to default on non-Error', async () => {
      vi.spyOn(_userService, 'fetchAllUsers').mockRejectedValue(undefined)
      const store = useRolesStore()
      const ok = await store.fetchUsers()
      expect(ok).toBe(false)
      expect(store.usersError).toBe('Failed to fetch users')
    })
  })

  describe('fetchRoleUsers', () => {
    const mockUsers: User[] = [{ id: 1, login: 'alice' }]

    it('should fetch role users', async () => {
      vi.spyOn(roleService, 'getRoleUsers').mockResolvedValue({
        success: true,
        data: mockUsers,
      })
      const store = useRolesStore()
      const ok = await store.fetchRoleUsers(1)
      expect(ok).toBe(true)
      expect(store.roleUsers).toEqual(mockUsers)
    })

    it('should handle failure result', async () => {
      vi.spyOn(roleService, 'getRoleUsers').mockResolvedValue({
        success: false,
        error: new ApiError('forbidden', 0, null),
      })
      const store = useRolesStore()
      const ok = await store.fetchRoleUsers(1)
      expect(ok).toBe(false)
      expect(store.usersError).toBe('forbidden')
    })

    it('should handle exception with Error', async () => {
      vi.spyOn(roleService, 'getRoleUsers').mockRejectedValue(new Error('e'))
      const store = useRolesStore()
      const ok = await store.fetchRoleUsers(1)
      expect(ok).toBe(false)
      expect(store.usersError).toBe('e')
    })

    it('should fall back to default on non-Error', async () => {
      vi.spyOn(roleService, 'getRoleUsers').mockRejectedValue('weird')
      const store = useRolesStore()
      const ok = await store.fetchRoleUsers(1)
      expect(ok).toBe(false)
      expect(store.usersError).toBe('Failed to fetch role users')
    })
  })

  describe('assignUserToRole', () => {
    const user: User = { id: 5, login: 'carol' }

    it('should assign user and update roleUsers if known', async () => {
      vi.spyOn(roleService, 'assignUserToRole').mockResolvedValue({
        success: true,
        data: undefined,
      })
      const store = useRolesStore()
      store.users = [user]
      store.roleUsers = []
      const ok = await store.assignUserToRole(1, 5)
      expect(ok).toBe(true)
      expect(store.roleUsers).toContainEqual(user)
    })

    it('should not double-add a user already on role', async () => {
      vi.spyOn(roleService, 'assignUserToRole').mockResolvedValue({
        success: true,
        data: undefined,
      })
      const store = useRolesStore()
      store.users = [user]
      store.roleUsers = [user]
      await store.assignUserToRole(1, 5)
      expect(store.roleUsers).toHaveLength(1)
    })

    it('should noop locally when user unknown', async () => {
      vi.spyOn(roleService, 'assignUserToRole').mockResolvedValue({
        success: true,
        data: undefined,
      })
      const store = useRolesStore()
      store.users = []
      store.roleUsers = []
      const ok = await store.assignUserToRole(1, 5)
      expect(ok).toBe(true)
      expect(store.roleUsers).toHaveLength(0)
    })

    it('should return false on failure result', async () => {
      vi.spyOn(roleService, 'assignUserToRole').mockResolvedValue({
        success: false,
        error: new ApiError('no', 0, null),
      })
      const store = useRolesStore()
      const ok = await store.assignUserToRole(1, 5)
      expect(ok).toBe(false)
    })

    it('should handle exceptions', async () => {
      vi.spyOn(roleService, 'assignUserToRole').mockRejectedValue(new Error('boom'))
      const store = useRolesStore()
      const ok = await store.assignUserToRole(1, 5)
      expect(ok).toBe(false)
    })
  })

  describe('removeUserFromRole', () => {
    const user: User = { id: 5, login: 'carol' }

    it('should remove user from roleUsers', async () => {
      vi.spyOn(roleService, 'removeUserFromRole').mockResolvedValue({
        success: true,
        data: undefined,
      })
      const store = useRolesStore()
      store.roleUsers = [user]
      const ok = await store.removeUserFromRole(1, 5)
      expect(ok).toBe(true)
      expect(store.roleUsers).toHaveLength(0)
    })

    it('should noop when user not present', async () => {
      vi.spyOn(roleService, 'removeUserFromRole').mockResolvedValue({
        success: true,
        data: undefined,
      })
      const store = useRolesStore()
      store.roleUsers = []
      const ok = await store.removeUserFromRole(1, 99)
      expect(ok).toBe(true)
    })

    it('should return false on failure result', async () => {
      vi.spyOn(roleService, 'removeUserFromRole').mockResolvedValue({
        success: false,
        error: new ApiError('no', 0, null),
      })
      const store = useRolesStore()
      const ok = await store.removeUserFromRole(1, 5)
      expect(ok).toBe(false)
    })

    it('should handle exceptions', async () => {
      vi.spyOn(roleService, 'removeUserFromRole').mockRejectedValue(new Error('boom'))
      const store = useRolesStore()
      const ok = await store.removeUserFromRole(1, 5)
      expect(ok).toBe(false)
    })
  })

  describe('exportRole', () => {
    it('should export role on success', async () => {
      vi.spyOn(roleService, 'exportRole').mockResolvedValue({
        success: true,
        data: '{"role":{}}',
      })
      const store = useRolesStore()
      const result = await store.exportRole(7)
      expect(result).toBe('{"role":{}}')
    })

    it('should return null on failure result', async () => {
      vi.spyOn(roleService, 'exportRole').mockResolvedValue({
        success: false,
        error: new ApiError('no', 0, null),
      })
      const store = useRolesStore()
      const result = await store.exportRole(7)
      expect(result).toBeNull()
    })

    it('should return null on exception', async () => {
      vi.spyOn(roleService, 'exportRole').mockRejectedValue(new Error('crash'))
      const store = useRolesStore()
      const result = await store.exportRole(7)
      expect(result).toBeNull()
    })
  })

  describe('importRole', () => {
    it('should import role and add to roles', async () => {
      vi.spyOn(roleService, 'importRole').mockResolvedValue({
        success: true,
        data: mockRole,
      })
      const store = useRolesStore()
      const result = await store.importRole('{"role":{}}')
      expect(result).toEqual(mockRole)
      expect(store.roles).toContainEqual(mockRole)
      expect(store.isSaving).toBe(false)
    })

    it('should return null on failure result', async () => {
      vi.spyOn(roleService, 'importRole').mockResolvedValue({
        success: false,
        error: new ApiError('invalid', 0, null),
      })
      const store = useRolesStore()
      const result = await store.importRole('garbage')
      expect(result).toBeNull()
    })

    it('should return null on exception', async () => {
      vi.spyOn(roleService, 'importRole').mockRejectedValue(new Error('boom'))
      const store = useRolesStore()
      const result = await store.importRole('garbage')
      expect(result).toBeNull()
      expect(store.isSaving).toBe(false)
    })
  })

  describe('hasUsers / hasPermissions computed', () => {
    it('reflects users array', () => {
      const store = useRolesStore()
      expect(store.hasUsers).toBe(false)
      store.users = [{ id: 1, login: 'a' }]
      expect(store.hasUsers).toBe(true)
    })

    it('reflects permissions array', () => {
      const store = useRolesStore()
      expect(store.hasPermissions).toBe(false)
      store.permissions = [{ id: 1, permission: 'foo:bar' }]
      expect(store.hasPermissions).toBe(true)
    })
  })
})
