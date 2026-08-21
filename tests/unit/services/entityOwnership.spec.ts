/**
 * Regression: a freshly created entity must be writable without a page reload.
 *
 * Per-entity grants only arrive with `/user/me` at startup, so before the fix
 * a just-created cohort/concept set/characterization had no grant and
 * `useEntityAccess` denied write — the Save and Delete buttons in the editor
 * stayed disabled until the user refreshed the page (OHDSI/Atlas3#274, #268).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'
import { useEntityAccess } from '@/composables/useEntityAccess'
import { registerCreatedEntity } from '@/services/auth/entityOwnership'
import { saveCohortDefinition } from '@/services/cohort-definition.service'
import { createConceptSet } from '@/services/concept-set.service'
import { createCharacterization } from '@/services/characterization.service'
import { createFeatureAnalysis } from '@/services/feature-analysis.service'
import { createPathway } from '@/services/pathway.service'
import { createIncidenceRate } from '@/services/incidence-rate.service'

/** A user with no global write permission — access rests entirely on grants. */
function signInWithoutGlobalWrite() {
  useAuthStore().setUser({
    login: 'u',
    displayName: 'u',
    permissionIdx: {},
    entityAccess: emptyEntityAccess(),
  })
}

describe('services/auth/entityOwnership', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
    signInWithoutGlobalWrite()
  })

  function ok(body: unknown) {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify(body) })
  }

  describe('registerCreatedEntity', () => {
    it('grants read and write on the newly created entity', async () => {
      const { canRead, canWrite, canDelete, isOwner } = useEntityAccess('cohortDefinition', 42)
      expect(canWrite.value).toBe(false)

      await registerCreatedEntity('cohortDefinition', 42)

      expect(canRead.value).toBe(true)
      expect(canWrite.value).toBe(true)
      expect(canDelete.value).toBe(true)
      expect(isOwner.value).toBe(true)
    })

    it('does not widen access to any other entity', async () => {
      await registerCreatedEntity('cohortDefinition', 42)

      expect(useEntityAccess('cohortDefinition', 43).canWrite.value).toBe(false)
      expect(useEntityAccess('conceptSet', 42).canWrite.value).toBe(false)
    })

    it('ignores an absent id rather than creating a bogus grant', async () => {
      await registerCreatedEntity('conceptSet', undefined)
      await registerCreatedEntity('conceptSet', null)
      await registerCreatedEntity('conceptSet', '')

      expect(useAuthStore().entityAccess.conceptSet).toEqual({})
    })

    it('leaves an existing grant alone', async () => {
      const store = useAuthStore()
      store.entityAccess.pathway['5'] = { accessTypes: ['READ'], isOwner: true }

      await registerCreatedEntity('pathway', 5)

      expect(store.entityAccess.pathway['5']).toEqual({ accessTypes: ['READ'], isOwner: true })
    })
  })

  describe('create endpoints register ownership', () => {
    it('saveCohortDefinition does so on create but not on update', async () => {
      ok({ id: 7, name: 'c', expression: {} })
      await saveCohortDefinition({ name: 'c', expression: {} })
      expect(useEntityAccess('cohortDefinition', 7).canWrite.value).toBe(true)

      ok({ id: 8, name: 'c', expression: {} })
      await saveCohortDefinition({ id: 8, name: 'c', expression: {} })
      expect(useEntityAccess('cohortDefinition', 8).canWrite.value).toBe(false)
    })

    it('createConceptSet does so', async () => {
      ok({ id: 9, name: 'cs' })
      await createConceptSet({ name: 'cs', items: [] })
      expect(useEntityAccess('conceptSet', 9).canWrite.value).toBe(true)
    })

    it('createCharacterization does so', async () => {
      const cc = { name: 'cc', cohorts: [], featureAnalyses: [], stratas: [] }
      ok({ ...cc, id: 11 })
      await createCharacterization(cc)
      expect(useEntityAccess('cohortCharacterization', 11).canWrite.value).toBe(true)
    })

    it('createFeatureAnalysis does so', async () => {
      const fa = { name: 'fa', type: 'CRITERIA_SET' as const, design: {} }
      ok({ ...fa, id: 12 })
      await createFeatureAnalysis(fa)
      expect(useEntityAccess('feAnalysis', 12).canWrite.value).toBe(true)
    })

    it('createPathway does so', async () => {
      ok({ id: 13, name: 'pw' })
      await createPathway({ name: 'pw' })
      expect(useEntityAccess('pathway', 13).canWrite.value).toBe(true)
    })

    it('createIncidenceRate does so', async () => {
      // The save encoder reads expression.strata, so the design has to carry a
      // real expression rather than a bare name.
      const ir = {
        name: 'ir',
        expression: {
          timeAtRisk: {
            start: { DateField: 'StartDate', Offset: 0 },
            end: { DateField: 'StartDate', Offset: 0 },
          },
          strata: [],
        },
      } as unknown as Parameters<typeof createIncidenceRate>[0]
      ok({ id: 14, name: 'ir' })
      const created = await createIncidenceRate(ir)
      expect(created.success).toBe(true)
      expect(useEntityAccess('incidenceRate', 14).canWrite.value).toBe(true)
    })

    it('does not register ownership when the server rejects the create', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'denied' })
      await saveCohortDefinition({ name: 'c', expression: {} })
      expect(useAuthStore().entityAccess.cohortDefinition).toEqual({})
    })
  })

  it('drops the grants when the subject changes', async () => {
    await registerCreatedEntity('cohortDefinition', 42)
    expect(useEntityAccess('cohortDefinition', 42).canWrite.value).toBe(true)

    signInWithoutGlobalWrite()

    expect(useEntityAccess('cohortDefinition', 42).canWrite.value).toBe(false)
  })
})
