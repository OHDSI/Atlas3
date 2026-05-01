import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useEntityAccess, useSourceAccess } from '@/composables/useEntityAccess'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

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
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('grants write when sourceAccess includes WRITE', () => {
    setupUser({ entityAccess: { source: { sample: ['WRITE'] } } })
    const { canRead, canWrite } = useSourceAccess('sample')
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
  })

  it('grants read but not write when only READ', () => {
    setupUser({ entityAccess: { source: { ro: ['READ'] } } })
    const { canRead, canWrite } = useSourceAccess('ro')
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(false)
  })

  it('denies when source key is unknown', () => {
    setupUser({ entityAccess: { source: { sample: ['WRITE'] } } })
    const { canRead, canWrite } = useSourceAccess('missing')
    expect(canRead.value).toBe(false)
    expect(canWrite.value).toBe(false)
  })

  it('admin:source grants both', () => {
    setupUser({ permissionIdx: { admin: ['admin:source'] } })
    const { canRead, canWrite } = useSourceAccess('any')
    expect(canRead.value).toBe(true)
    expect(canWrite.value).toBe(true)
  })
})
