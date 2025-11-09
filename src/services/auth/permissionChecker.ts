import type { PermissionCheckResult, PermissionIndex } from '@/models/auth.types'

export class PermissionChecker {
  checkPermission(required: string, granted: string): boolean {
    if (required === granted) return true

    const reqLevels = required.split(':')
    const grantedLevels = granted.split(':')

    for (let i = 0; i < reqLevels.length; i++) {
      if (grantedLevels.length <= i) return true

      const grantedParts = grantedLevels[i]?.split(',') || []
      const reqParts = reqLevels[i]?.split(',') || []

      if (!grantedParts.includes('*') && !reqParts.every((p) => grantedParts.includes(p))) {
        return false
      }
    }

    for (let i = reqLevels.length; i < grantedLevels.length; i++) {
      const level = grantedLevels[i]
      if (level && !level.split(',').includes('*')) {
        return false
      }
    }

    return true
  }

  hasPermission(required: string, permissionIdx: PermissionIndex): PermissionCheckResult {
    const resource = required.split(':')[0]
    if (!resource) {
      return { granted: false }
    }

    const relevantPerms = permissionIdx[resource] || []
    const wildcardPerms = permissionIdx['*'] || []
    const allPerms = [...relevantPerms, ...wildcardPerms]

    const matchedGrants: string[] = []

    for (const granted of allPerms) {
      if (this.checkPermission(required, granted)) {
        matchedGrants.push(granted)
      }
    }

    return {
      granted: matchedGrants.length > 0,
      matchedGrants: matchedGrants.length > 0 ? matchedGrants : undefined,
    }
  }

  hasAnyPermission(required: string[], permissionIdx: PermissionIndex): boolean {
    return required.some((perm) => this.hasPermission(perm, permissionIdx).granted)
  }

  hasAllPermissions(required: string[], permissionIdx: PermissionIndex): boolean {
    return required.every((perm) => this.hasPermission(perm, permissionIdx).granted)
  }

  buildPermissionIndex(permissions: string[]): PermissionIndex {
    const index: PermissionIndex = {}

    for (const permission of permissions) {
      const resource = permission.split(':')[0]
      if (resource) {
        if (!index[resource]) {
          index[resource] = []
        }
        index[resource].push(permission)
      }
    }

    return index
  }
}

export const permissionChecker = new PermissionChecker()
