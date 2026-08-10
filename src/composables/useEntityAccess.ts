/**
 * useEntityAccess
 *
 * Reactive helper for checking what the current user can do with a specific
 * entity. Combines two signals from `/user/me`:
 *
 * 1. The flat permission list (e.g. `read:cohort-definition`,
 *    `write:cohort-definition`, `admin:security`).
 * 2. The per-entity grant map (e.g. `cohortDefinitionAccess[id] =
 *    { accessTypes: ['WRITE'], isOwner: true }`).
 *
 * Admin-equivalent permissions on a resource imply read/write for every
 * instance; ownership in the grant map implies write and read; an explicit
 * accessType in the grant map narrows it down per entity.
 */

import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getAuthConfig } from '@/config/auth.config'
import type { EntityAccessKind, EntityGrant } from '@/models/auth.types'
import { permissionChecker } from '@/services/auth/permissionChecker'

/**
 * Mapping from an EntityAccessKind to its global permission resource string.
 * These match the WebAPI permission templates (e.g. `read:cohort-definition`).
 */
const RESOURCE_BY_KIND: Record<EntityAccessKind, string> = {
  cohortDefinition: 'cohort-definition',
  conceptSet: 'conceptset',
  cohortCharacterization: 'cohort-characterization',
  feAnalysis: 'feature-analysis',
  pathway: 'pathway',
  incidenceRate: 'incidence',
  reusable: 'reusable',
}

type AccessVerb = 'read' | 'write'

function grantAllows(grant: EntityGrant | undefined, verb: AccessVerb): boolean {
  if (!grant) return false
  if (grant.isOwner) return true
  if (verb === 'write') return grant.accessTypes.includes('WRITE')
  return grant.accessTypes.includes('READ') || grant.accessTypes.includes('WRITE')
}

function entityAccessAllows(
  authStore: ReturnType<typeof useAuthStore>,
  kind: EntityAccessKind,
  verb: AccessVerb,
  id: string | number | null | undefined
): boolean {
  const resource = RESOURCE_BY_KIND[kind]
  if (
    permissionChecker.hasPermission(`${verb}:${resource}`, authStore.permissions).granted ||
    permissionChecker.hasPermission('admin:security', authStore.permissions).granted
  ) {
    return true
  }
  if (id === null || id === undefined || id === '') return false
  return grantAllows(authStore.entityAccess[kind][String(id)], verb)
}

export interface EntityAccessResult {
  /** User can view this entity (via global read perm, ownership, or per-entity READ grant). */
  canRead: ComputedRef<boolean>
  /** User can modify this entity (via global write perm, ownership, or per-entity WRITE grant). */
  canWrite: ComputedRef<boolean>
  /** User can delete this entity (treated the same as write — backend enforces). */
  canDelete: ComputedRef<boolean>
  /** User owns this entity. */
  isOwner: ComputedRef<boolean>
}

export function useEntityAccess(
  kind: EntityAccessKind,
  id: MaybeRefOrGetter<string | number | null | undefined>
): EntityAccessResult {
  const authStore = useAuthStore()

  const grant = computed<EntityGrant | undefined>(() => {
    const entityId = toValue(id)
    if (entityId === null || entityId === undefined || entityId === '') return undefined
    const map = authStore.entityAccess[kind]
    return map[String(entityId)]
  })

  const isOwner = computed(() => grant.value?.isOwner === true)

  const canRead = computed(() => entityAccessAllows(authStore, kind, 'read', toValue(id)))

  const canWrite = computed(() => entityAccessAllows(authStore, kind, 'write', toValue(id)))

  const canDelete = canWrite

  return { canRead, canWrite, canDelete, isOwner }
}

/**
 * Imperative variant for template use over `v-for` rows where calling a
 * composable per-row is awkward. Returns plain booleans (not refs) and re-runs
 * naturally as part of Vue's reactivity since it reads the store directly.
 */
export function useEntityAccessFor(kind: EntityAccessKind) {
  const authStore = useAuthStore()

  function canRead(id: string | number | null | undefined): boolean {
    return entityAccessAllows(authStore, kind, 'read', id)
  }

  function canWrite(id: string | number | null | undefined): boolean {
    return entityAccessAllows(authStore, kind, 'write', id)
  }

  return { canRead, canWrite, canDelete: canWrite }
}

/**
 * Source-specific access. Sources have a different shape (no ownership; flat
 * access type list) and a different permission resource.
 */
export function useSourceAccess(sourceKey: MaybeRefOrGetter<string | null | undefined>): {
  canRead: ComputedRef<boolean>
  canWrite: ComputedRef<boolean>
} {
  const authStore = useAuthStore()

  const grant = computed<string[] | undefined>(() => {
    const key = toValue(sourceKey)
    if (!key) return undefined
    return authStore.entityAccess.source[key]
  })

  const canRead = computed(() => {
    if (!getAuthConfig().userAuthenticationEnabled) return true
    if (
      permissionChecker.hasPermission('read:source', authStore.permissions).granted ||
      permissionChecker.hasPermission('write:source', authStore.permissions).granted ||
      permissionChecker.hasPermission('admin:source', authStore.permissions).granted ||
      permissionChecker.hasPermission('source:*:access', authStore.permissions).granted
    ) {
      return true
    }
    const g = grant.value
    return Array.isArray(g) && (g.includes('READ') || g.includes('WRITE'))
  })

  const canWrite = computed(() => {
    if (!getAuthConfig().userAuthenticationEnabled) return true
    if (
      permissionChecker.hasPermission('write:source', authStore.permissions).granted ||
      permissionChecker.hasPermission('admin:source', authStore.permissions).granted
    ) {
      return true
    }
    const g = grant.value
    return Array.isArray(g) && g.includes('WRITE')
  })

  return { canRead, canWrite }
}

export function useSourceAccessFor() {
  const authStore = useAuthStore()
  const has = (perm: string) =>
    permissionChecker.hasPermission(perm, authStore.permissions).granted

  function canRead(sourceKey: string | null | undefined): boolean {
    if (!getAuthConfig().userAuthenticationEnabled) return true
    if (
      has('read:source') ||
      has('write:source') ||
      has('admin:source') ||
      has('source:*:access')
    ) {
      return true
    }
    if (!sourceKey) return false
    const g = authStore.entityAccess.source[sourceKey]
    return Array.isArray(g) && (g.includes('READ') || g.includes('WRITE'))
  }

  function canWrite(sourceKey: string | null | undefined): boolean {
    if (!getAuthConfig().userAuthenticationEnabled) return true
    if (has('write:source') || has('admin:source')) return true
    if (!sourceKey) return false
    const g = authStore.entityAccess.source[sourceKey]
    return Array.isArray(g) && g.includes('WRITE')
  }

  return { canRead, canWrite }
}
