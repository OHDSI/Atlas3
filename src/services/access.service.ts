/**
 * Access Service
 *
 * API integration for entity access management.
 * Handles listing current role access, searching roles, and granting/revoking
 * READ/WRITE access for Atlas entities.
 */

import { httpDelete, httpGet, httpPost } from '@/services/http-client'
import { unwrap, parseOrThrow, unwrapList } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import { RoleListSchema, type Role } from '@/models/role.types'
import { AccessEntityTypeSchema, AccessTypeSchema, type AccessEntityType, type AccessType } from '@/models/access.types'
import { useAuthStore } from '@/stores/auth'

const CONTEXT = 'AccessService'

function accessPath(entityType: AccessEntityType, entityId: number): string {
  return `/permission/access/${entityType}/${entityId}`
}

function accessRolePath(entityType: AccessEntityType, entityId: number, roleId: number): string {
  return `${accessPath(entityType, entityId)}/role/${roleId}`
}

/**
 * Load roles that currently have READ or WRITE access to an entity.
 */
export async function fetchEntityAccessRoles(
  entityType: AccessEntityType,
  entityId: number,
  accessType: AccessType = 'WRITE'
): Promise<ApiResult<Role[]>> {
  return unwrap(async () => {
    const normalizedEntityType = AccessEntityTypeSchema.parse(entityType)
    const normalizedAccessType = AccessTypeSchema.parse(accessType)
    const data = await httpGet<unknown>(`${accessPath(normalizedEntityType, entityId)}/${normalizedAccessType}`)
    return parseOrThrow(RoleListSchema, unwrapList(data), 'Invalid entity access response format')
  }, CONTEXT)
}

/**
 * Search roles for the access assignment autocomplete.
 */
export async function loadRoleSuggestions(roleSearch = ''): Promise<ApiResult<Role[]>> {
  return unwrap(async () => {
    const params = new URLSearchParams()
    params.set('roleSearch', roleSearch)
    const data = await httpGet<unknown>(`/permission/access/suggest?${params.toString()}`)
    return parseOrThrow(RoleListSchema, unwrapList(data), 'Invalid role suggestions response format')
  }, CONTEXT)
}

/**
 * Grant an entity access type to a role.
 */
export async function grantEntityAccess(
  entityType: AccessEntityType,
  entityId: number,
  roleId: number,
  accessType: AccessType = 'WRITE'
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    const authStore = useAuthStore()
    const normalizedEntityType = AccessEntityTypeSchema.parse(entityType)
    const normalizedAccessType = AccessTypeSchema.parse(accessType)
    await authStore.executeWithUserRefresh(() =>
      httpPost(accessRolePath(normalizedEntityType, entityId, roleId), {
        accessType: normalizedAccessType,
      })
    )
  }, CONTEXT)
}

/**
 * Revoke an entity access type from a role.
 */
export async function revokeEntityAccess(
  entityType: AccessEntityType,
  entityId: number,
  roleId: number,
  accessType: AccessType = 'WRITE'
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    const authStore = useAuthStore()
    const normalizedEntityType = AccessEntityTypeSchema.parse(entityType)
    const normalizedAccessType = AccessTypeSchema.parse(accessType)
    await authStore.executeWithUserRefresh(() =>
      httpDelete(accessRolePath(normalizedEntityType, entityId, roleId), {
        body: { accessType: normalizedAccessType },
      })
    )
  }, CONTEXT)
}