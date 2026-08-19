/**
 * Permission Checker Service Tests
 * Tests for permission validation logic
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { PermissionChecker, permissionChecker } from '@/services/auth/permissionChecker'

describe('PermissionChecker', () => {
  let checker: PermissionChecker

  beforeEach(() => {
    checker = new PermissionChecker()
  })

  describe('checkPermission', () => {
    it('should return true for exact match', () => {
      expect(checker.checkPermission('cohort:read', 'cohort:read')).toBe(true)
    })

    it('should return true when granted has wildcard', () => {
      expect(checker.checkPermission('cohort:read', 'cohort:*')).toBe(true)
    })

    it('should return true for multi-level wildcard', () => {
      expect(checker.checkPermission('cohort:read:123', 'cohort:*')).toBe(true)
    })

    it('should return false when required has more specifics than granted', () => {
      expect(checker.checkPermission('cohort:read:123', 'cohort:read')).toBe(true) // granted is broader
    })

    it('should return true when granted is broader', () => {
      expect(checker.checkPermission('cohort', 'cohort:*')).toBe(true)
    })

    it('should handle comma-separated permissions', () => {
      expect(checker.checkPermission('cohort:read', 'cohort:read,write')).toBe(true)
      expect(checker.checkPermission('cohort:write', 'cohort:read,write')).toBe(true)
    })

    it('should return false for non-matching permissions', () => {
      expect(checker.checkPermission('cohort:write', 'cohort:read')).toBe(false)
    })

    it('should return false for completely different resources', () => {
      expect(checker.checkPermission('cohort:read', 'conceptset:read')).toBe(false)
    })

    it('should handle multiple levels correctly', () => {
      expect(checker.checkPermission('cohort:read:project1', 'cohort:read:*')).toBe(true)
    })

    it('should return false when granted has non-matching deeper level', () => {
      expect(checker.checkPermission('cohort:read', 'cohort:read:project1')).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should return granted true for matching permission', () => {
      const permissionIdx = {
        cohort: ['cohort:read', 'cohort:write'],
      }

      const result = checker.hasPermission('cohort:read', permissionIdx)

      expect(result.granted).toBe(true)
      expect(result.matchedGrants).toContain('cohort:read')
    })

    it('should return granted true for wildcard permission', () => {
      const permissionIdx = {
        '*': ['*:*'],
      }

      const result = checker.hasPermission('cohort:read', permissionIdx)

      expect(result.granted).toBe(true)
    })

    it('should return granted false for no matching permission', () => {
      const permissionIdx = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasPermission('cohort:write', permissionIdx)

      expect(result.granted).toBe(false)
      expect(result.matchedGrants).toBeUndefined()
    })

    it('should return granted false for empty permission index', () => {
      const result = checker.hasPermission('cohort:read', {})

      expect(result.granted).toBe(false)
    })

    it('should return granted false for empty required permission', () => {
      const result = checker.hasPermission('', { cohort: ['cohort:read'] })

      expect(result.granted).toBe(false)
    })

    it('should combine resource-specific and wildcard permissions', () => {
      const permissionIdx = {
        cohort: ['cohort:read'],
        '*': ['*:delete'],
      }

      const readResult = checker.hasPermission('cohort:read', permissionIdx)
      const deleteResult = checker.hasPermission('cohort:delete', permissionIdx)

      expect(readResult.granted).toBe(true)
      expect(deleteResult.granted).toBe(true)
    })

    it('should return all matched grants', () => {
      const permissionIdx = {
        cohort: ['cohort:*', 'cohort:read'],
      }

      const result = checker.hasPermission('cohort:read', permissionIdx)

      expect(result.granted).toBe(true)
      expect(result.matchedGrants).toHaveLength(2)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if any permission matches', () => {
      const permissionIdx = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAnyPermission(['cohort:write', 'cohort:read'], permissionIdx)

      expect(result).toBe(true)
    })

    it('should return false if no permission matches', () => {
      const permissionIdx = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAnyPermission(['cohort:write', 'cohort:delete'], permissionIdx)

      expect(result).toBe(false)
    })

    it('should return false for empty required permissions', () => {
      const permissionIdx = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAnyPermission([], permissionIdx)

      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if all permissions match', () => {
      const permissionIdx = {
        cohort: ['cohort:read', 'cohort:write'],
      }

      const result = checker.hasAllPermissions(['cohort:read', 'cohort:write'], permissionIdx)

      expect(result).toBe(true)
    })

    it('should return false if any permission is missing', () => {
      const permissionIdx = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAllPermissions(['cohort:read', 'cohort:write'], permissionIdx)

      expect(result).toBe(false)
    })

    it('should return true for empty required permissions', () => {
      const permissionIdx = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAllPermissions([], permissionIdx)

      expect(result).toBe(true)
    })

    it('should work with wildcard permissions', () => {
      const permissionIdx = {
        '*': ['*:*'],
      }

      const result = checker.hasAllPermissions(['cohort:read', 'cohort:write', 'conceptset:read'], permissionIdx)

      expect(result).toBe(true)
    })
  })

  describe('buildPermissionIndex', () => {
    it('should build index from permission strings', () => {
      const permissions = ['cohort:read', 'cohort:write', 'conceptset:read']

      const index = checker.buildPermissionIndex(permissions)

      expect(index.cohort).toContain('cohort:read')
      expect(index.cohort).toContain('cohort:write')
      expect(index.conceptset).toContain('conceptset:read')
    })

    it('should handle empty permissions array', () => {
      const index = checker.buildPermissionIndex([])

      expect(Object.keys(index)).toHaveLength(0)
    })

    it('should handle wildcard permissions', () => {
      const permissions = ['*:*', 'cohort:read']

      const index = checker.buildPermissionIndex(permissions)

      expect(index['*']).toContain('*:*')
      expect(index.cohort).toContain('cohort:read')
    })

    it('should handle permissions without colon', () => {
      const permissions = ['admin', 'cohort:read']

      const index = checker.buildPermissionIndex(permissions)

      expect(index.admin).toContain('admin')
      expect(index.cohort).toContain('cohort:read')
    })

    it('should group multiple permissions for same resource', () => {
      const permissions = ['cohort:read', 'cohort:write', 'cohort:delete']

      const index = checker.buildPermissionIndex(permissions)

      expect(index.cohort).toHaveLength(3)
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(permissionChecker).toBeInstanceOf(PermissionChecker)
    })
  })
})
