/**
 * Unit tests for useRoles composable
 * T091: Test state access, batch operations, helper functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRoles } from '@/composables/useRoles'
import { useRolesStore } from '@/stores/roles'
import type { Role, Permission, User } from '@/models/role.types'

// Mock the services and logger
vi.mock('@/services/role.service')
vi.mock('@/services/permission.service')
vi.mock('@/services/user.service')
vi.mock('@/utils/logger')

describe('useRoles', () => {
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

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('computed state access', () => {
    it('should expose roles as computed', () => {
      const store = useRolesStore()
      store.roles = mockRoles

      const { roles } = useRoles()

      expect(roles.value).toEqual(mockRoles)
    })

    it('should expose permissions as computed', () => {
      const store = useRolesStore()
      store.permissions = mockPermissions

      const { permissions } = useRoles()

      expect(permissions.value).toEqual(mockPermissions)
    })

    it('should expose users as computed', () => {
      const store = useRolesStore()
      store.users = mockUsers

      const { users } = useRoles()

      expect(users.value).toEqual(mockUsers)
    })

    it('should expose loading states as computed', () => {
      const store = useRolesStore()
      store.isLoadingRoles = true

      const { isLoadingRoles } = useRoles()

      expect(isLoadingRoles.value).toBe(true)
    })

    it('should expose error states as computed', () => {
      const store = useRolesStore()
      store.rolesError = 'Error message'

      const { rolesError } = useRoles()

      expect(rolesError.value).toBe('Error message')
    })

    it('should expose helper computed properties', () => {
      const store = useRolesStore()
      store.roles = mockRoles

      const { hasRoles } = useRoles()

      expect(hasRoles.value).toBe(true)
    })
  })

  describe('batch permission operations', () => {
    it('should assign multiple permissions successfully', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'assignPermissionToRole').mockResolvedValue(true)

      const { assignPermissionsToRole } = useRoles()
      const result = await assignPermissionsToRole(1, [1, 2, 3])

      expect(store.assignPermissionToRole).toHaveBeenCalledTimes(3)
      expect(store.assignPermissionToRole).toHaveBeenCalledWith(1, 1)
      expect(store.assignPermissionToRole).toHaveBeenCalledWith(1, 2)
      expect(store.assignPermissionToRole).toHaveBeenCalledWith(1, 3)
      expect(result).toBe(true)
    })

    it('should return false if any permission assignment fails', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'assignPermissionToRole')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      const { assignPermissionsToRole } = useRoles()
      const result = await assignPermissionsToRole(1, [1, 2, 3])

      expect(result).toBe(false)
    })

    it('should remove multiple permissions successfully', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'removePermissionFromRole').mockResolvedValue(true)

      const { removePermissionsFromRole } = useRoles()
      const result = await removePermissionsFromRole(1, [1, 2])

      expect(store.removePermissionFromRole).toHaveBeenCalledTimes(2)
      expect(store.removePermissionFromRole).toHaveBeenCalledWith(1, 1)
      expect(store.removePermissionFromRole).toHaveBeenCalledWith(1, 2)
      expect(result).toBe(true)
    })

    it('should return false if any permission removal fails', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'removePermissionFromRole')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const { removePermissionsFromRole } = useRoles()
      const result = await removePermissionsFromRole(1, [1, 2])

      expect(result).toBe(false)
    })
  })

  describe('batch user operations', () => {
    it('should assign multiple users successfully', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'assignUserToRole').mockResolvedValue(true)

      const { assignUsersToRole } = useRoles()
      const result = await assignUsersToRole(1, [1, 2, 3])

      expect(store.assignUserToRole).toHaveBeenCalledTimes(3)
      expect(store.assignUserToRole).toHaveBeenCalledWith(1, 1)
      expect(store.assignUserToRole).toHaveBeenCalledWith(1, 2)
      expect(store.assignUserToRole).toHaveBeenCalledWith(1, 3)
      expect(result).toBe(true)
    })

    it('should return false if any user assignment fails', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'assignUserToRole')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      const { assignUsersToRole } = useRoles()
      const result = await assignUsersToRole(1, [1, 2, 3])

      expect(result).toBe(false)
    })

    it('should remove multiple users successfully', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'removeUserFromRole').mockResolvedValue(true)

      const { removeUsersFromRole } = useRoles()
      const result = await removeUsersFromRole(1, [1, 2])

      expect(store.removeUserFromRole).toHaveBeenCalledTimes(2)
      expect(store.removeUserFromRole).toHaveBeenCalledWith(1, 1)
      expect(store.removeUserFromRole).toHaveBeenCalledWith(1, 2)
      expect(result).toBe(true)
    })

    it('should return false if any user removal fails', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'removeUserFromRole')
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const { removeUsersFromRole } = useRoles()
      const result = await removeUsersFromRole(1, [1, 2])

      expect(result).toBe(false)
    })
  })

  describe('helper functions', () => {
    it('should check if permission is assigned', () => {
      const store = useRolesStore()
      store.rolePermissions = mockPermissions

      const { isPermissionAssigned } = useRoles()

      expect(isPermissionAssigned(1)).toBe(true)
      expect(isPermissionAssigned(2)).toBe(true)
      expect(isPermissionAssigned(999)).toBe(false)
    })

    it('should check if user is assigned', () => {
      const store = useRolesStore()
      store.roleUsers = mockUsers

      const { isUserAssigned } = useRoles()

      expect(isUserAssigned(1)).toBe(true)
      expect(isUserAssigned(2)).toBe(true)
      expect(isUserAssigned(999)).toBe(false)
    })

    it('should get role by id', () => {
      const store = useRolesStore()
      store.roles = mockRoles

      const { getRoleById } = useRoles()

      expect(getRoleById(1)).toEqual(mockRoles[0])
      expect(getRoleById(2)).toEqual(mockRoles[1])
      expect(getRoleById(999)).toBeUndefined()
    })

    it('should get permission by id', () => {
      const store = useRolesStore()
      store.permissions = mockPermissions

      const { getPermissionById } = useRoles()

      expect(getPermissionById(1)).toEqual(mockPermissions[0])
      expect(getPermissionById(2)).toEqual(mockPermissions[1])
      expect(getPermissionById(999)).toBeUndefined()
    })

    it('should get user by id', () => {
      const store = useRolesStore()
      store.users = mockUsers

      const { getUserById } = useRoles()

      expect(getUserById(1)).toEqual(mockUsers[0])
      expect(getUserById(2)).toEqual(mockUsers[1])
      expect(getUserById(999)).toBeUndefined()
    })
  })

  describe('utility actions', () => {
    it('should clear state', () => {
      const store = useRolesStore()
      store.roles = mockRoles
      store.permissions = mockPermissions
      vi.spyOn(store, 'clearState')

      const { clearState } = useRoles()
      clearState()

      expect(store.clearState).toHaveBeenCalled()
    })

    it('should clear current role', () => {
      const store = useRolesStore()
      store.currentRole = mockRoles[0]
      vi.spyOn(store, 'clearCurrentRole')

      const { clearCurrentRole } = useRoles()
      clearCurrentRole()

      expect(store.clearCurrentRole).toHaveBeenCalled()
    })
  })

  describe('downloadRoleAsJson', () => {
    it('should create and download JSON file', async () => {
      const store = useRolesStore()
      const jsonData = JSON.stringify({ role: { name: 'Test' } })
      vi.spyOn(store, 'exportRole').mockResolvedValue(jsonData)

      // Mock DOM APIs
      const mockCreateElement = vi.fn().mockReturnValue({
        href: '',
        download: '',
        click: vi.fn(),
      })
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:url')
      const mockRevokeObjectURL = vi.fn()
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()

      global.document.createElement = mockCreateElement
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL
      global.document.body.appendChild = mockAppendChild
      global.document.body.removeChild = mockRemoveChild

      const { downloadRoleAsJson } = useRoles()
      await downloadRoleAsJson(1, 'test-role.json')

      expect(store.exportRole).toHaveBeenCalledWith(1)
      expect(mockCreateElement).toHaveBeenCalledWith('a')
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalled()
      expect(mockRemoveChild).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('should handle export failure gracefully', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'exportRole').mockResolvedValue(null)

      const mockCreateElement = vi.fn()
      global.document.createElement = mockCreateElement

      const { downloadRoleAsJson } = useRoles()
      await downloadRoleAsJson(1)

      expect(store.exportRole).toHaveBeenCalledWith(1)
      expect(mockCreateElement).not.toHaveBeenCalled()
    })
  })

  describe('action delegation', () => {
    it('should delegate fetchRoles to store', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'fetchRoles').mockResolvedValue(true)

      const { fetchRoles } = useRoles()
      const result = await fetchRoles()

      expect(store.fetchRoles).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should delegate createRole to store', async () => {
      const store = useRolesStore()
      const newRole = mockRoles[0]
      vi.spyOn(store, 'createRole').mockResolvedValue(newRole)

      const { createRole } = useRoles()
      const result = await createRole({ name: 'Test', description: 'Test role' })

      expect(store.createRole).toHaveBeenCalled()
      expect(result).toEqual(newRole)
    })

    it('should delegate deleteRole to store', async () => {
      const store = useRolesStore()
      vi.spyOn(store, 'deleteRole').mockResolvedValue(true)

      const { deleteRole } = useRoles()
      const result = await deleteRole(1)

      expect(store.deleteRole).toHaveBeenCalledWith(1)
      expect(result).toBe(true)
    })

    it('should delegate exportRole to store', async () => {
      const store = useRolesStore()
      const jsonData = '{"role": {}}'
      vi.spyOn(store, 'exportRole').mockResolvedValue(jsonData)

      const { exportRole } = useRoles()
      const result = await exportRole(1)

      expect(store.exportRole).toHaveBeenCalledWith(1)
      expect(result).toBe(jsonData)
    })

    it('should delegate importRole to store', async () => {
      const store = useRolesStore()
      const newRole = mockRoles[0]
      vi.spyOn(store, 'importRole').mockResolvedValue(newRole)

      const { importRole } = useRoles()
      const result = await importRole('{"role": {}}')

      expect(store.importRole).toHaveBeenCalled()
      expect(result).toEqual(newRole)
    })
  })
})
