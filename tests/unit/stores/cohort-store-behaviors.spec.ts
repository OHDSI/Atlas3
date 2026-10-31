import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useCohortStore } from '@/stores/cohort'
import type { AgentProposal } from '@/models/agent.types'
import type { CohortExpression, ConceptSet } from '@/models/circe-types'
import { getVersion } from '@/services/cohort-definition-versions.service'
import { logger } from '@/utils/logger'

vi.mock('@/services/cohort-definition-versions.service', () => ({
  getVersion: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function openCohort(expression: CohortExpression = {}) {
  const store = useCohortStore()
  store.setCohort({ name: 'Test' })
  store.attachExpression(ref(expression))
  store.markClean()
  return store
}

const apply = (store: ReturnType<typeof useCohortStore>, proposal: unknown) =>
  store.applyProposal(proposal as AgentProposal)

const expr = (store: ReturnType<typeof useCohortStore>) => store.currentCohort!.expression!

function conceptSet(id: number, items: Array<Record<string, unknown> | undefined>): ConceptSet {
  return {
    id,
    name: `set ${id}`,
    expression: { items: items.map(concept => (concept ? { concept } : {})) },
  } as unknown as ConceptSet
}

const existingSet = (): ConceptSet => conceptSet(0, [{ CONCEPT_ID: 1, CONCEPT_NAME: 'Existing' }])

const drugRef = { id: 'uid-1', name: 'Metformin', items: [] }

describe('cohort store behaviors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  describe('initial state and getters', () => {
    it('starts with no validation errors and an idle retry state', () => {
      const store = useCohortStore()

      expect(store.$id).toBe('cohort')
      expect(store.validationErrors).toEqual([])
      expect(store.retryState).toEqual({ attempt: 0, nextRetryAt: null, isRetrying: false })
      expect(store.canSave).toBe(false)
    })

    it('counts only error-severity entries as validation errors', () => {
      const store = useCohortStore()
      store.setCohort({ name: 'Named' })
      store.validationErrors = [{ field: 'x', message: 'm', severity: 'warning' }]

      expect(store.hasValidationErrors).toBe(false)
      expect(store.canSave).toBe(true)

      store.validationErrors = [{ field: 'x', message: 'm', severity: 'error' }]
      expect(store.hasValidationErrors).toBe(true)
      expect(store.canSave).toBe(false)
    })

    it('cannot save a read-only cohort even without validation errors', () => {
      const store = useCohortStore()
      store.setCohort({ name: 'Named' })
      store.isReadOnly = true

      expect(store.canSave).toBe(false)
    })

    it('reports the translated name-required message', () => {
      const store = useCohortStore()
      store.setCohort({ name: '' })

      expect(store.validationErrors).toEqual([
        { field: 'name', message: 'Cohort name is required', severity: 'error' },
      ])
      expect(store.isReadOnly).toBe(true)
    })
  })

  describe('document ownership', () => {
    it('keeps the attached document when a cohort without an expression is set', () => {
      const store = useCohortStore()
      const doc = ref<CohortExpression>({ ConceptSets: [existingSet()] })
      store.attachExpression(doc)

      store.setCohort({ name: 'Metadata only' })

      expect(doc.value.ConceptSets).toHaveLength(1)
      expect(store.currentCohort?.expression).toBe(doc.value)
    })

    it('detaching with no cohort loaded does not throw', () => {
      const store = useCohortStore()
      store.attachExpression(ref<CohortExpression>({}))

      expect(() => store.detachExpression()).not.toThrow()
      expect(store.hasCohortDocument).toBe(false)
    })
  })

  describe('applyProposal concept set bookkeeping', () => {
    it('reports no-document even for a missing proposal', () => {
      const store = useCohortStore()

      expect(apply(store, undefined)).toEqual({ applied: false, reason: 'no-document' })
    })

    it('setObservationPeriod keeps the existing entry criteria', () => {
      const store = openCohort({ PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] } })

      apply(store, { kind: 'setObservationPeriod', observationPeriod: { priorDays: 30, postDays: 0 } })

      expect(expr(store).PrimaryCriteria).toEqual({
        CriteriaList: [{ ConditionOccurrence: {} }],
        ObservationWindow: { PriorDays: 30, PostDays: 0 },
      })
    })

    it('addInclusionRule creates an empty concept set list when none exists', () => {
      const store = openCohort({})

      apply(store, {
        kind: 'addInclusionRule',
        rule: { name: 'R', criteriaGroups: [] },
      })

      expect(expr(store).ConceptSets).toEqual([])
      expect(expr(store).InclusionRules).toHaveLength(1)
    })

    it('addInclusionRule refuses a rule with an untranslatable event and adds nothing', () => {
      const store = openCohort({})

      const result = apply(store, {
        kind: 'addInclusionRule',
        rule: { name: 'R', criteriaGroups: [{ type: 'ALL', events: [{ id: 'x' }] }] },
      })

      expect(result).toEqual({ applied: false, reason: 'untranslatable-criteria' })
      expect(expr(store).InclusionRules).toEqual([])
      expect(store.isDirty).toBe(false)
    })

    it('addConceptSet keeps the sets already on the cohort', () => {
      const store = openCohort({ ConceptSets: [existingSet()] })

      apply(store, { kind: 'addConceptSet', conceptSet: { id: 5, name: 'New', items: [] } })

      expect(expr(store).ConceptSets!.map(cs => cs.id)).toEqual([0, 5])
    })

    it.each(['addEntryEvent', 'addCensoringCriterion', 'addQualifyingCriterion'])(
      '%s keeps existing concept sets and registers the event set beside them',
      (kind) => {
        const store = openCohort({ ConceptSets: [existingSet()] })

        expect(
          apply(store, { kind, event: { id: 'e', criteriaType: 'DrugExposure', conceptSet: drugRef } })
        ).toEqual({ applied: true })

        expect(expr(store).ConceptSets!.map(cs => cs.name)).toEqual(['set 0', 'Metformin'])
      }
    )

    it.each(['addEntryEvent', 'addCensoringCriterion', 'addQualifyingCriterion'])(
      '%s without a concept set leaves the concept set list empty',
      (kind) => {
        const store = openCohort({})

        expect(apply(store, { kind, event: { id: 'e', criteriaType: 'Death' } })).toEqual({ applied: true })

        expect(expr(store).ConceptSets).toEqual([])
      }
    )

    it('addQualifyingCriterion registers an event set on a cohort with no concept sets', () => {
      const store = openCohort({})

      apply(store, {
        kind: 'addQualifyingCriterion',
        event: { id: 'q', criteriaType: 'DrugExposure', conceptSet: drugRef },
      })

      expect(expr(store).ConceptSets!.map(cs => cs.name)).toEqual(['Metformin'])
    })

    it.each(['addEntryEvent', 'addCensoringCriterion', 'addQualifyingCriterion'])(
      '%s refuses a demographic event as an unsupported kind',
      (kind) => {
        const store = openCohort({})

        expect(apply(store, { kind, event: { id: 'd', criteriaType: 'Demographic' } })).toEqual({
          applied: false,
          reason: 'unsupported-kind',
        })
        expect(store.isDirty).toBe(false)
      }
    )

    it.each(['addEntryEvent', 'addCensoringCriterion', 'addQualifyingCriterion'])(
      '%s refuses an event with no criteria type',
      (kind) => {
        const store = openCohort({})

        expect(apply(store, { kind, event: { id: 'u' } })).toEqual({
          applied: false,
          reason: 'untranslatable-criteria',
        })
        expect(store.isDirty).toBe(false)
      }
    )

    it('addCensoringCriterion appends to the existing censoring criteria', () => {
      const store = openCohort({ CensoringCriteria: [{ Death: {} }] })

      apply(store, { kind: 'addCensoringCriterion', event: { id: 'c', criteriaType: 'VisitOccurrence' } })

      expect(expr(store).CensoringCriteria).toEqual([{ Death: {} }, { VisitOccurrence: {} }])
    })

    it('addQualifyingCriterion fills in a missing criteria list on an existing group', () => {
      const store = openCohort({ AdditionalCriteria: { Type: 'ANY' } as never })

      apply(store, { kind: 'addQualifyingCriterion', event: { id: 'q', criteriaType: 'Death' } })

      expect(expr(store).AdditionalCriteria?.Type).toBe('ANY')
      expect(expr(store).AdditionalCriteria?.CriteriaList).toHaveLength(1)
    })
  })

  describe('applyProposal setCohortExit', () => {
    it.each([
      ['END_DATE', 'EndDate'],
      ['START_DATE', 'StartDate'],
    ])('FIXED_DURATION from %s offsets the %s', (dateField, expected) => {
      const store = openCohort({})

      apply(store, { kind: 'setCohortExit', exitCriteria: { strategy: 'FIXED_DURATION', dateField, offset: 7 } })

      expect(expr(store).EndStrategy).toEqual({ DateOffset: { DateField: expected, Offset: 7 } })
    })

    it('CONTINUOUS_DRUG registers the drug set and binds persistence and surveillance windows', () => {
      const store = openCohort({ ConceptSets: [existingSet()] })

      apply(store, {
        kind: 'setCohortExit',
        exitCriteria: {
          strategy: 'CONTINUOUS_DRUG',
          conceptSet: drugRef,
          persistenceWindow: 7,
          surveillanceWindow: 3,
          offset: 5,
        },
      })

      const sets = expr(store).ConceptSets!
      expect(sets.map(cs => cs.name)).toEqual(['set 0', 'Metformin'])
      expect(expr(store).EndStrategy).toEqual({
        CustomEra: { DrugCodesetId: sets[1].id, GapDays: 7, Offset: 3 },
      })
    })

    it('CONTINUOUS_DRUG registers the drug set on a cohort without concept sets', () => {
      const store = openCohort({})

      apply(store, { kind: 'setCohortExit', exitCriteria: { strategy: 'CONTINUOUS_DRUG', conceptSet: drugRef } })

      const sets = expr(store).ConceptSets!
      expect(sets.map(cs => cs.name)).toEqual(['Metformin'])
      expect(expr(store).EndStrategy).toEqual({
        CustomEra: { DrugCodesetId: sets[0].id, GapDays: 0, Offset: 0 },
      })
    })

    it('CONTINUOUS_DRUG falls back to the offset for surveillance and works without a drug set', () => {
      const store = openCohort({})

      apply(store, { kind: 'setCohortExit', exitCriteria: { strategy: 'CONTINUOUS_DRUG', offset: 5 } })

      expect(expr(store).ConceptSets).toEqual([])
      expect(expr(store).EndStrategy).toEqual({
        CustomEra: { DrugCodesetId: undefined, GapDays: 0, Offset: 5 },
      })
    })

    it('refuses an exit strategy it cannot represent', () => {
      const store = openCohort({ EndStrategy: { DateOffset: { DateField: 'StartDate', Offset: 1 } } })

      expect(
        apply(store, { kind: 'setCohortExit', exitCriteria: { strategy: 'CUSTOM_EVENT' } })
      ).toEqual({ applied: false, reason: 'unsupported-kind' })
      expect(expr(store).EndStrategy).toEqual({ DateOffset: { DateField: 'StartDate', Offset: 1 } })
      expect(store.isDirty).toBe(false)
    })
  })

  describe('applyProposal refusals', () => {
    it.each([
      ['setEventLimits', { limits: {} }],
      ['setCensorWindow', { censorWindow: {} }],
      ['setEraCollapse', { collapseSettings: { collapseType: 'COLLAPSE', eraPad: 0 } }],
    ])('%s refuses with the unsupported-kind reason', (kind, payload) => {
      const store = openCohort({})

      expect(apply(store, { kind, ...payload })).toEqual({ applied: false, reason: 'unsupported-kind' })
    })

    it('setEventLimits leaves the entry limit alone when only the qualifying limit is named', () => {
      const store = openCohort({})

      apply(store, { kind: 'setEventLimits', limits: { qualifyingLimit: 'FIRST' } })

      expect(expr(store).PrimaryCriteria).toBeUndefined()
      expect(expr(store).QualifiedLimit).toEqual({ Type: 'First' })
    })

    it('rejects an unknown kind', () => {
      const store = openCohort({})

      expect(apply(store, { kind: 'teleport' })).toEqual({ applied: false, reason: 'unsupported-kind' })
      expect(logger.warn).toHaveBeenCalledWith('CohortStore', 'Unknown agent proposal', { kind: 'teleport' })
    })

    it.each([
      'navigate',
      'saveCohort',
      'createStandaloneConceptSet',
      'createFeatureAnalysis',
      'createCharacterization',
      'createPathway',
      'createIncidenceRate',
      'updateConceptSet',
      'updateFeatureAnalysis',
      'updateCharacterization',
      'updatePathway',
      'updateIncidenceRate',
      'useConceptSet',
      'generateAnalysis',
    ])('treats %s as a known bridge-only kind rather than an unknown one', (kind) => {
      const store = openCohort({})

      expect(apply(store, { kind })).toEqual({ applied: false, reason: 'unsupported-kind' })
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('applyProposal removals', () => {
    it('removeInclusionRule trims both the requested and the stored names', () => {
      const store = openCohort({
        InclusionRules: [{ name: '  Adults ' }, { name: 'Kids' }, {} as never],
      })

      expect(apply(store, { kind: 'removeInclusionRule', match: { name: ' Adults  ' } })).toEqual({
        applied: true,
      })

      expect(expr(store).InclusionRules).toEqual([{ name: 'Kids' }, {}])
    })

    it('removeEntryEvent reports a miss on a cohort without primary criteria', () => {
      const store = openCohort({})

      expect(apply(store, { kind: 'removeEntryEvent', match: { conceptId: 1 } })).toEqual({
        applied: false,
        reason: 'no-match',
      })
    })

    const mixedCohort = (): CohortExpression => ({
      ConceptSets: [
        conceptSet(0, [{ CONCEPT_ID: 9, CONCEPT_NAME: 'Other' }, { CONCEPT_ID: 1, CONCEPT_NAME: '  Viral Sinusitis ' }]),
        conceptSet(1, [undefined, { CONCEPT_ID: 2 }]),
        { id: 2, name: 'no expression' } as unknown as ConceptSet,
      ],
      PrimaryCriteria: {
        CriteriaList: [
          { ConditionOccurrence: { CodesetId: 0 } },
          { DrugExposure: { CodesetId: 1 } },
          { Measurement: { CodesetId: 2 } },
          {} as never,
        ],
      },
    })

    it('removeEntryEvent matches any item of a set by concept id, and only that set', () => {
      const store = openCohort(mixedCohort())

      expect(apply(store, { kind: 'removeEntryEvent', match: { conceptId: 1 } })).toEqual({ applied: true })

      expect(expr(store).PrimaryCriteria?.CriteriaList).toEqual([
        { DrugExposure: { CodesetId: 1 } },
        { Measurement: { CodesetId: 2 } },
        {},
      ])
    })

    it('removeEntryEvent matches a concept name after trimming and lower-casing', () => {
      const store = openCohort(mixedCohort())

      expect(apply(store, { kind: 'removeEntryEvent', match: { conceptName: 'viral sinusitis' } })).toEqual({
        applied: true,
      })

      expect(expr(store).PrimaryCriteria?.CriteriaList).toHaveLength(3)
      expect(expr(store).PrimaryCriteria?.CriteriaList?.[0]).toEqual({ DrugExposure: { CodesetId: 1 } })
    })

    it('removeEntryEvent does not treat a nameless concept as a name match', () => {
      const store = openCohort(mixedCohort())

      expect(apply(store, { kind: 'removeEntryEvent', match: { conceptId: 404 } })).toEqual({
        applied: false,
        reason: 'no-match',
      })
    })
  })

  describe('saveCohort', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('refuses a read-only cohort and leaves it dirty', async () => {
      const store = useCohortStore()
      store.setCohort({ name: '' })
      store.markDirty()

      await expect(store.saveCohort()).resolves.toBe(false)
      expect(store.isDirty).toBe(true)
    })

    function failSaves() {
      const attempts: number[] = []
      vi.mocked(logger.info).mockImplementation((_source: string, message: string) => {
        if (message === 'Cohort saved successfully') {
          attempts.push(Date.now())
          throw new Error('save failed')
        }
      })
      return attempts
    }

    it('backs off exponentially between retries', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      const attempts = failSaves()
      const store = useCohortStore()
      store.setCohort({ name: 'Named' })

      void store.saveCohort()
      expect(store.retryState).toMatchObject({ attempt: 1, isRetrying: true })
      expect(store.retryState.nextRetryAt?.getTime()).toBe(1000)

      await vi.advanceTimersByTimeAsync(999)
      expect(attempts).toEqual([0])
      await vi.advanceTimersByTimeAsync(1)
      expect(attempts).toEqual([0, 1000])
      expect(store.retryState.nextRetryAt?.getTime()).toBe(3000)

      store.cancelRetry()
    })

    it('gives up after the maximum number of attempts', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      const attempts = failSaves()
      const store = useCohortStore()
      store.setCohort({ name: 'Named' })

      const saving = store.saveCohort()
      await vi.advanceTimersByTimeAsync(60_000)

      await expect(saving).resolves.toBe(false)
      expect(attempts).toEqual([0, 1000, 3000, 7000, 15000, 31000])
      expect(store.retryState).toMatchObject({ attempt: 5, isRetrying: false })
    })

    it.each(['cancelRetry', 'dispose'] as const)('%s resets the retry state and drops the pending retry', async (method) => {
      vi.useFakeTimers()
      vi.setSystemTime(0)
      const attempts = failSaves()
      const store = useCohortStore()
      store.setCohort({ name: 'Named' })

      void store.saveCohort()
      store[method]()
      await vi.advanceTimersByTimeAsync(10_000)

      expect(store.retryState).toEqual({ attempt: 0, nextRetryAt: null, isRetrying: false })
      expect(attempts).toEqual([0])
    })
  })

  describe('auto-save', () => {
    afterEach(() => {
      useCohortStore().stopAutoSave()
      vi.useRealTimers()
    })

    it('starting twice still leaves a single timer that stopAutoSave clears', async () => {
      vi.useFakeTimers()
      const store = useCohortStore()
      store.setCohort({ name: 'Named' })
      store.markDirty()

      store.startAutoSave()
      store.startAutoSave()
      store.stopAutoSave()
      await vi.advanceTimersByTimeAsync(60_000)

      expect(store.lastAutoSave).toBeNull()
      expect(sessionStorage.getItem('atlas3_cohort_draft')).toBeNull()
    })

    it('dispose stops the auto-save timer', async () => {
      vi.useFakeTimers()
      const store = useCohortStore()
      store.setCohort({ name: 'Named' })
      store.markDirty()

      store.startAutoSave()
      store.dispose()
      await vi.advanceTimersByTimeAsync(60_000)

      expect(store.lastAutoSave).toBeNull()
    })
  })

  describe('version preview', () => {
    const version = { version: 3, comment: '', archived: false, createdDate: '', createdBy: {} }

    it('keeps the entity id from the version payload and leaves the cohort clean', async () => {
      vi.mocked(getVersion).mockResolvedValue({
        versionDTO: version,
        entityDTO: { id: 77, name: 'Historic', expression: {} },
      } as never)
      const store = useCohortStore()

      await store.loadVersionPreview(3, 12)

      expect(getVersion).toHaveBeenCalledWith(12, 3)
      expect(store.currentCohort?.id).toBe(77)
      expect(store.isDirty).toBe(false)
    })

    it('savePreviewAsCurrent does not signal a save outside preview mode', async () => {
      const store = useCohortStore()
      store.setCohort({ name: 'Named' })

      await expect(store.savePreviewAsCurrent()).resolves.toBe(false)
      expect(store.saveRequest).toBe(0)
    })

    it('savePreviewAsCurrent does not signal a save without cohort data', async () => {
      const store = useCohortStore()
      store.previewVersion = version as never

      await expect(store.savePreviewAsCurrent()).resolves.toBe(false)
      expect(store.saveRequest).toBe(0)
    })
  })
})
