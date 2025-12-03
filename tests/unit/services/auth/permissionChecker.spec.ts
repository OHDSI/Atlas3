/**
 * Unit Tests: PermissionChecker Service
 * Tests for src/services/auth/permissionChecker.ts
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PermissionChecker, permissionChecker } from '@/services/auth/permissionChecker'
import type { PermissionIndex } from '@/models/auth.types'

describe('PermissionChecker', () => {
  let checker: PermissionChecker

  beforeEach(() => {
    checker = new PermissionChecker()
  })

  describe('checkPermission', () => {
    it('returns true for exact match', () => {
      expect(checker.checkPermission('cohort:read', 'cohort:read')).toBe(true)
      expect(checker.checkPermission('source:get', 'source:get')).toBe(true)
    })

    it('returns true when granted permission has wildcard at resource level', () => {
      expect(checker.checkPermission('cohort:read', '*:read')).toBe(true)
    })

    it('returns true when granted permission has wildcard at action level', () => {
      expect(checker.checkPermission('cohort:read', 'cohort:*')).toBe(true)
    })

    it('returns true when granted permission has full wildcard', () => {
      expect(checker.checkPermission('cohort:read', '*:*')).toBe(true)
    })

    it('returns false when resource does not match', () => {
      expect(checker.checkPermission('cohort:read', 'source:read')).toBe(false)
    })

    it('returns false when action does not match', () => {
      expect(checker.checkPermission('cohort:read', 'cohort:write')).toBe(false)
    })

    it('handles comma-separated permissions', () => {
      expect(checker.checkPermission('cohort:read', 'cohort:read,write')).toBe(true)
      expect(checker.checkPermission('cohort:write', 'cohort:read,write')).toBe(true)
      expect(checker.checkPermission('cohort:delete', 'cohort:read,write')).toBe(false)
    })

    it('handles multi-level permissions', () => {
      expect(checker.checkPermission('cohort:read:1', 'cohort:read:1')).toBe(true)
      expect(checker.checkPermission('cohort:read:1', 'cohort:read:*')).toBe(true)
      expect(checker.checkPermission('cohort:read:1', 'cohort:read:2')).toBe(false)
    })

    it('handles shorter granted permission (implicit wildcard)', () => {
      // When granted has fewer levels, remaining levels are implicitly allowed
      expect(checker.checkPermission('cohort:read', 'cohort')).toBe(true)
    })

    it('handles longer granted permission with specific constraints', () => {
      // When granted is more specific and doesn't have wildcards
      expect(checker.checkPermission('cohort', 'cohort:read')).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('returns granted true when permission exists in index', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read', 'cohort:write'],
      }

      const result = checker.hasPermission('cohort:read', permissionIdx)

      expect(result.granted).toBe(true)
      expect(result.matchedGrants).toContain('cohort:read')
    })

    it('returns granted false when permission not in index', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasPermission('cohort:delete', permissionIdx)

      expect(result.granted).toBe(false)
      expect(result.matchedGrants).toBeUndefined()
    })

    it('checks wildcard permissions', () => {
      const permissionIdx: PermissionIndex = {
        '*': ['*:*'],
      }

      const result = checker.hasPermission('cohort:read', permissionIdx)

      expect(result.granted).toBe(true)
    })

    it('combines resource-specific and wildcard permissions', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read'],
        '*': ['*:write'],
      }

      expect(checker.hasPermission('cohort:read', permissionIdx).granted).toBe(true)
      expect(checker.hasPermission('cohort:write', permissionIdx).granted).toBe(true)
      expect(checker.hasPermission('source:write', permissionIdx).granted).toBe(true)
    })

    it('returns all matched grants', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read', 'cohort:*'],
        '*': ['*:read'],
      }

      const result = checker.hasPermission('cohort:read', permissionIdx)

      expect(result.granted).toBe(true)
      expect(result.matchedGrants).toContain('cohort:read')
      expect(result.matchedGrants).toContain('cohort:*')
      expect(result.matchedGrants).toContain('*:read')
    })

    it('handles empty required permission', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasPermission('', permissionIdx)

      expect(result.granted).toBe(false)
    })

    it('handles missing resource in index', () => {
      const permissionIdx: PermissionIndex = {}

      const result = checker.hasPermission('cohort:read', permissionIdx)

      expect(result.granted).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('returns true when at least one permission matches', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAnyPermission(['cohort:read', 'cohort:write'], permissionIdx)

      expect(result).toBe(true)
    })

    it('returns false when no permissions match', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAnyPermission(['cohort:write', 'cohort:delete'], permissionIdx)

      expect(result).toBe(false)
    })

    it('returns false for empty required array', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAnyPermission([], permissionIdx)

      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('returns true when all permissions match', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read', 'cohort:write'],
      }

      const result = checker.hasAllPermissions(['cohort:read', 'cohort:write'], permissionIdx)

      expect(result).toBe(true)
    })

    it('returns false when not all permissions match', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAllPermissions(['cohort:read', 'cohort:write'], permissionIdx)

      expect(result).toBe(false)
    })

    it('returns true for empty required array', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:read'],
      }

      const result = checker.hasAllPermissions([], permissionIdx)

      expect(result).toBe(true)
    })

    it('handles wildcard permissions correctly', () => {
      const permissionIdx: PermissionIndex = {
        cohort: ['cohort:*'],
      }

      const result = checker.hasAllPermissions(
        ['cohort:read', 'cohort:write', 'cohort:delete'],
        permissionIdx
      )

      expect(result).toBe(true)
    })
  })

  describe('buildPermissionIndex', () => {
    it('builds index from permission array', () => {
      const permissions = ['cohort:read', 'cohort:write', 'source:get', 'source:post']

      const result = checker.buildPermissionIndex(permissions)

      expect(result.cohort).toEqual(['cohort:read', 'cohort:write'])
      expect(result.source).toEqual(['source:get', 'source:post'])
    })

    it('handles empty permission array', () => {
      const result = checker.buildPermissionIndex([])

      expect(result).toEqual({})
    })

    it('handles wildcard permissions', () => {
      const permissions = ['*:read', 'cohort:*']

      const result = checker.buildPermissionIndex(permissions)

      expect(result['*']).toEqual(['*:read'])
      expect(result.cohort).toEqual(['cohort:*'])
    })

    it('handles permissions without colons', () => {
      const permissions = ['admin']

      const result = checker.buildPermissionIndex(permissions)

      expect(result.admin).toEqual(['admin'])
    })

    it('handles duplicate resources', () => {
      const permissions = ['cohort:read', 'cohort:write', 'cohort:delete']

      const result = checker.buildPermissionIndex(permissions)

      expect(result.cohort).toHaveLength(3)
    })
  })

  describe('Singleton Export', () => {
    it('exports singleton instance', () => {
      expect(permissionChecker).toBeInstanceOf(PermissionChecker)
    })
  })
})
