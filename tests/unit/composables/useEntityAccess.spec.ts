import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useEntityAccess, useEntityAccessFor, useSourceAccess, useSourceAccessFor } from '@/composables/useEntityAccess'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import { getAuthConfig, setAuthConfig } from '@/config/auth.config'

function setupUser(opts: {
  permissionIdx?: Record<string, string[]>
  entityAccess?: Partial<ReturnType<typeof emptyEntityAccess>>
}) {
  const authStore = useAuthStore()
  authStore.setUser({
    login: 'u',
    displayName: 'u',
    permissionIdx: opts.permissionIdx ?? {},
    entityAccess: { ...emptyEntityAccess(), ...opts.entityAccess },
  })
}

describe('useEntityAccess', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('grants read+write when global permission is present', () => {
    setupUser({
      permissionIdx: {
        read: ['read:cohort-definition'],
        write: ['write:cohort-definition'],
      },
    })
    const { canRead, canWrite, canDelete, isOwner } = useEntityAccess('cohortDefinition', 99)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
    expect(canDelete.value).toBe(true)
    expect(isOwner.value).toBe(false)
  })

  it('grants write via ownership in entity grant map', () => {
    setupUser({
      entityAccess: {
        cohortDefinition: { '7': { accessTypes: [], isOwner: true } },
      },
    })
    const { canRead, canWrite, isOwner } = useEntityAccess('cohortDefinition', 7)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
    expect(isOwner.value).toBe(true)
  })

  it('treats explicit READ grant without WRITE as read-only', () => {
    setupUser({
      entityAccess: {
        conceptSet: { '12': { accessTypes: ['READ'], isOwner: false } },
      },
    })
    const { canRead, canWrite } = useEntityAccess('conceptSet', 12)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(false)
  })

  it('denies access to other entities the user has no claim on', () => {
    setupUser({
      entityAccess: {
        cohortDefinition: { '7': { accessTypes: ['WRITE'], isOwner: true } },
      },
    })
    const { canRead, canWrite } = useEntityAccess('cohortDefinition', 99)
    expect(canRead.value).toBe(false)
    expect(canWrite.value).toBe(false)
  })

  it('treats an explicit WRITE grant as read access to the entity', () => {
    setupUser({
      entityAccess: {
        conceptSet: { '12': { accessTypes: ['WRITE'], isOwner: false } },
      },
    })
    const { canRead, canWrite } = useEntityAccess('conceptSet', 12)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
  })

  it('denies an empty-string id', () => {
    setupUser({
      entityAccess: {
        conceptSet: { '12': { accessTypes: ['WRITE'], isOwner: true } },
      },
    })
    const { canRead, isOwner } = useEntityAccess('conceptSet', '')
    expect(canRead.value).toBe(false)
    expect(isOwner.value).toBe(false)
  })

  it('reacts to id changes', () => {
    setupUser({
      entityAccess: {
        cohortDefinition: { '1': { accessTypes: ['WRITE'], isOwner: true } },
      },
    })
    const id = ref<number | null>(99)
    const { canWrite } = useEntityAccess('cohortDefinition', id)
    expect(canWrite.value).toBe(false)
    id.value = 1
    expect(canWrite.value).toBe(true)
  })
})

describe('useSourceAccess', () => {
  let prevAuthEnabled: boolean

  beforeEach(() => {
    setActivePinia(createPinia())
    prevAuthEnabled = getAuthConfig().userAuthenticationEnabled
    setAuthConfig({ userAuthenticationEnabled: true })
  })

  afterEach(() => {
    setAuthConfig({ userAuthenticationEnabled: prevAuthEnabled })
  })

  it('grants write when sourceAccess includes WRITE', () => {
    setupUser({ entityAccess: { source: { '101': ['WRITE'] } } })
    const { canRead, canWrite } = useSourceAccess(101)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
  })

  it('grants write when sourceAccess is keyed by numeric id', () => {
    setupUser({ entityAccess: { source: { '404': ['WRITE'] } } })
    const { canRead, canWrite } = useSourceAccess(404)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
  })

  it('grants read but not write when only READ', () => {
    setupUser({ entityAccess: { source: { '102': ['READ'] } } })
    const { canRead, canWrite } = useSourceAccess(102)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(false)
  })

  it('grants read and write when write:source is present', () => {
    setupUser({ permissionIdx: { write: ['write:source'] } })
    const { canRead, canWrite } = useSourceAccess(102)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
  })

  it('denies when source key is unknown', () => {
    setupUser({ entityAccess: { source: { '103': ['WRITE'] } } })
    const { canRead, canWrite } = useSourceAccess(999)
    expect(canRead.value).toBe(false)
    expect(canWrite.value).toBe(false)
  })

  it('admin:source does not grant read of source data', () => {
    setupUser({ permissionIdx: { admin: ['admin:source'] } })
    const { canRead } = useSourceAccess(777)
    expect(canRead.value).toBe(false)
  })

  it('parent read permission implies read:source', () => {
    setupUser({ permissionIdx: { read: ['read'] } })
    const { canRead } = useSourceAccess(777)
    expect(canRead.value).toBe(true)
  })

  it('allows source access when authentication is disabled', () => {
    setAuthConfig({ userAuthenticationEnabled: false })
    setupUser({})
    const { canRead, canWrite } = useSourceAccess(888)
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
  })
})

describe('useSourceAccessFor', () => {
  let prevAuthEnabled: boolean

  beforeEach(() => {
    setActivePinia(createPinia())
    prevAuthEnabled = getAuthConfig().userAuthenticationEnabled
    setAuthConfig({ userAuthenticationEnabled: true })
  })

  afterEach(() => {
    setAuthConfig({ userAuthenticationEnabled: prevAuthEnabled })
  })

  it('uses numeric ids for source grants', () => {
    setupUser({ entityAccess: { source: { '321': ['WRITE'] } } })
    const { canRead, canWrite } = useSourceAccessFor()
    expect(canRead(321)).toBe(true)
    expect(canWrite(321)).toBe(true)
  })

  it('allows all source actions when authentication is disabled', () => {
    setAuthConfig({ userAuthenticationEnabled: false })
    setupUser({})
    const { canRead, canWrite } = useSourceAccessFor()
    expect(canRead(123)).toBe(true)
    expect(canWrite(123)).toBe(true)
  })

  it('does not treat admin:source as read or write access to a source', () => {
    setupUser({ permissionIdx: { admin: ['admin:source'] } })
    const { canRead, canWrite, canReadAny } = useSourceAccessFor()
    expect(canRead(5)).toBe(false)
    expect(canWrite(5)).toBe(false)
    expect(canReadAny()).toBe(false)
  })

  it('lets write:source write but not administer sources', () => {
    setupUser({ permissionIdx: { write: ['write:source'] } })
    const { canRead, canWrite, canManageAll } = useSourceAccessFor()
    expect(canRead(5)).toBe(true)
    expect(canWrite(5)).toBe(true)
    expect(canManageAll()).toBe(false)
  })

  it('grants per-source READ without write', () => {
    setupUser({ entityAccess: { source: { '7': ['READ'] } } })
    const { canRead, canWrite, canReadAny } = useSourceAccessFor()
    expect(canRead(7)).toBe(true)
    expect(canWrite(7)).toBe(false)
    expect(canRead(8)).toBe(false)
    expect(canReadAny()).toBe(true)
  })

  it('can read some source through a global read or write permission', () => {
    setupUser({ permissionIdx: { read: ['read:source'] } })
    expect(useSourceAccessFor().canReadAny()).toBe(true)

    setupUser({ permissionIdx: { write: ['write:source'] } })
    expect(useSourceAccessFor().canReadAny()).toBe(true)
  })

  it('can read some source through a per-source WRITE grant alone', () => {
    setupUser({ entityAccess: { source: { '7': ['WRITE'] } } })
    expect(useSourceAccessFor().canReadAny()).toBe(true)
  })

  it('cannot read any source when the grants carry no READ or WRITE', () => {
    setupUser({ entityAccess: { source: { '7': [] } } })
    expect(useSourceAccessFor().canReadAny()).toBe(false)
  })

  it('gates source administration, server cache and access grants on their own permissions', () => {
    setupUser({ permissionIdx: { admin: ['admin:source'] } })
    let access = useSourceAccessFor()
    expect(access.canManageAll()).toBe(true)
    expect(access.canClearServerCache()).toBe(false)
    expect(access.canManageAccess()).toBe(false)

    setupUser({ permissionIdx: { admin: ['admin:cache', 'admin:security'] } })
    access = useSourceAccessFor()
    expect(access.canManageAll()).toBe(false)
    expect(access.canClearServerCache()).toBe(true)
    expect(access.canManageAccess()).toBe(true)
  })

  it('allows administration actions when authentication is disabled', () => {
    setAuthConfig({ userAuthenticationEnabled: false })
    setupUser({})
    const access = useSourceAccessFor()
    expect(access.canManageAll()).toBe(true)
    expect(access.canClearServerCache()).toBe(true)
    expect(access.canManageAccess()).toBe(true)
  })
})

describe('useEntityAccessFor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('canRead returns true via global read permission', () => {
    setupUser({ permissionIdx: { read: ['read:cohort-definition'] } })
    const { canRead } = useEntityAccessFor('cohortDefinition')
    expect(canRead(5)).toBe(true)
  })

  it('canWrite returns true via global write permission', () => {
    setupUser({ permissionIdx: { write: ['write:cohort-definition'] } })
    const { canWrite, canDelete } = useEntityAccessFor('cohortDefinition')
    expect(canWrite(5)).toBe(true)
    expect(canDelete(5)).toBe(true)
  })

  it('canRead returns false when no grant and no global permission', () => {
    setupUser({})
    const { canRead } = useEntityAccessFor('cohortDefinition')
    expect(canRead(99)).toBe(false)
  })

  it('canRead returns false for null/undefined id', () => {
    setupUser({})
    const { canRead } = useEntityAccessFor('cohortDefinition')
    expect(canRead(null)).toBe(false)
    expect(canRead(undefined)).toBe(false)
  })

  it('canRead returns true via ownership grant', () => {
    setupUser({
      entityAccess: { cohortDefinition: { '7': { accessTypes: [], isOwner: true } } },
    })
    const { canRead } = useEntityAccessFor('cohortDefinition')
    expect(canRead(7)).toBe(true)
  })

  it('admin:security grants canRead and canWrite', () => {
    setupUser({ permissionIdx: { admin: ['admin:security'] } })
    const { canRead, canWrite } = useEntityAccessFor('cohortDefinition')
    expect(canRead(1)).toBe(true)
    expect(canWrite(1)).toBe(true)
  })
})
