import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { CohortEvent, CohortDefinition } from '@/models/cohort.types'

vi.mock('@/services/cohort-definition-versions.service', () => ({
  getVersion: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { getVersion as mockGetVersion } from '@/services/cohort-definition-versions.service'

let useCohortStore: typeof import('@/stores/cohort').useCohortStore

beforeAll(async () => {
  vi.resetModules()
  ;({ useCohortStore } = await import('@/stores/cohort'))
})

describe('Cohort Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have null currentCohort initially', () => {
      const store = useCohortStore()
      expect(store.currentCohort).toBeNull()
    })

    it('should not be dirty initially', () => {
      const store = useCohortStore()
      expect(store.isDirty).toBe(false)
    })

  })

  describe('Create New Cohort', () => {
    it('should create a new cohort with default values', () => {
      const store = useCohortStore()
      store.createNewCohort()

      expect(store.currentCohort).not.toBeNull()
      expect(store.currentCohort?.name).toBe('New Cohort')
      expect(store.isDirty).toBe(false)
    })
  })

  describe('Set Cohort', () => {
    it('should set the current cohort and mark as clean', () => {
      const store = useCohortStore()
      const cohort = {
        id: 123,
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'EARLIEST' as const,
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)

      expect(store.currentCohort).toEqual(cohort)
      expect(store.isDirty).toBe(false)
    })
  })

  describe('Entry Events Management (legacy — methods removed in circe refactor)', () => {
    it.skip('should add entry event to existing cohort', () => {
      const store = useCohortStore()
      store.createNewCohort()

      const event: CohortEvent = {
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      }

      store.addEntryEvent(event)

      expect(store.currentCohort?.entryEvents).toHaveLength(1)
      expect(store.currentCohort?.entryEvents[0]).toEqual(event)
      expect(store.isDirty).toBe(true)
      expect(store.hasEntryEvents).toBe(true)
      expect(store.entryEventCount).toBe(1)
    })

    it.skip('should create new cohort if none exists when adding event', () => {
      const store = useCohortStore()

      const event: CohortEvent = {
        id: 'event-1',
        criteriaType: 'DrugExposure',
        attributes: [],
      }

      store.addEntryEvent(event)

      expect(store.currentCohort).not.toBeNull()
      expect(store.currentCohort?.entryEvents).toHaveLength(1)
      expect(store.isDirty).toBe(true)
    })

    it.skip('should remove entry event by ID', () => {
      const store = useCohortStore()
      store.createNewCohort()

      const event1: CohortEvent = {
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      }
      const event2: CohortEvent = {
        id: 'event-2',
        criteriaType: 'DrugExposure',
        attributes: [],
      }

      store.addEntryEvent(event1)
      store.addEntryEvent(event2)
      expect(store.entryEventCount).toBe(2)

      store.markClean()
      store.removeEntryEvent('event-1')

      expect(store.entryEventCount).toBe(1)
      expect(store.currentCohort?.entryEvents[0]?.id).toBe('event-2')
      expect(store.isDirty).toBe(true)
    })

    it.skip('should not fail when removing non-existent event', () => {
      const store = useCohortStore()
      store.createNewCohort()

      expect(() => store.removeEntryEvent('non-existent')).not.toThrow()
      expect(store.entryEventCount).toBe(0)
    })

    it.skip('should update entry event', () => {
      const store = useCohortStore()
      store.createNewCohort()

      const event: CohortEvent = {
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      }

      store.addEntryEvent(event)
      store.markClean()

      const updatedEvent: CohortEvent = {
        ...event,
        criteriaType: 'DrugExposure',
      }

      store.updateEntryEvent('event-1', updatedEvent)

      expect(store.currentCohort?.entryEvents[0]?.criteriaType).toBe('DrugExposure')
      expect(store.isDirty).toBe(true)
    })

    it.skip('should not fail when updating non-existent event', () => {
      const store = useCohortStore()
      store.createNewCohort()

      const event: CohortEvent = {
        id: 'non-existent',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      }

      expect(() => store.updateEntryEvent('non-existent', event)).not.toThrow()
    })
  })

  describe('Dirty State Management', () => {
    it('should mark cohort as dirty', () => {
      const store = useCohortStore()
      store.createNewCohort()

      expect(store.isDirty).toBe(false)
      store.markDirty()
      expect(store.isDirty).toBe(true)
    })

    it('should mark cohort as clean', () => {
      const store = useCohortStore()
      store.createNewCohort()
      store.markDirty()

      expect(store.isDirty).toBe(true)
      store.markClean()
      expect(store.isDirty).toBe(false)
    })
  })

  describe('Clear Cohort', () => {
    it('should clear the current cohort', () => {
      const store = useCohortStore()
      store.createNewCohort()
      store.markDirty()

      store.clearCohort()

      expect(store.currentCohort).toBeNull()
      expect(store.isDirty).toBe(false)
    })
  })

  describe('Validation', () => {
    it('should validate cohort with required fields', () => {
      const store = useCohortStore()
      const validCohort: CohortDefinition = {
        name: 'Valid Cohort',
        entryEvents: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
          },
        ],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(validCohort)

      expect(store.validationErrors).toHaveLength(0)
      expect(store.isReadOnly).toBe(false)
      expect(store.hasValidationErrors).toBe(false)
      expect(store.canSave).toBe(true)
    })

    it('should detect missing cohort name', () => {
      const store = useCohortStore()
      const invalidCohort: CohortDefinition = {
        name: '',
        entryEvents: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
          },
        ],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(invalidCohort)

      expect(store.validationErrors.length).toBeGreaterThan(0)
      expect(store.validationErrors.some((err) => err.field === 'name')).toBe(true)
      expect(store.isReadOnly).toBe(true)
      expect(store.canSave).toBe(false)
    })

  })

  describe('Validation Edge Cases', () => {
    it('should validate cohort with whitespace-only name', () => {
      const store = useCohortStore()
      const cohort: CohortDefinition = {
        name: '   ',
        entryEvents: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
          },
        ],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)

      expect(store.validationErrors.some((err) => err.field === 'name')).toBe(true)
      expect(store.hasValidationErrors).toBe(true)
    })

    it.skip('should validate collapseSettings with missing collapseType (validation removed in circe refactor)', () => {
      const store = useCohortStore()
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
          },
        ],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
        collapseSettings: {
          collapseType: '',
          eraPad: 0,
        },
      }

      store.setCohort(cohort)

      expect(
        store.validationErrors.some((err) => err.field === 'collapseSettings.collapseType')
      ).toBe(true)
    })

    it.skip('should validate censorWindow with invalid date ordering (validation removed in circe refactor)', () => {
      const store = useCohortStore()
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
          },
        ],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
        censorWindow: {
          startDate: '2020-12-31',
          endDate: '2020-01-01',
        },
      }

      store.setCohort(cohort)

      expect(store.validationErrors.some((err) => err.field === 'censorWindow')).toBe(true)
      expect(
        store.validationErrors.find((err) => err.field === 'censorWindow')?.severity
      ).toBe('warning')
    })

    it('should validate cohort with only startDate in censorWindow', () => {
      const store = useCohortStore()
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
          },
        ],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
        censorWindow: {
          startDate: '2020-01-01',
        },
      }

      store.setCohort(cohort)

      expect(store.validationErrors.some((err) => err.field === 'censorWindow')).toBe(false)
    })

    it('should handle validation with null cohort', () => {
      const store = useCohortStore()

      store.validateCohort()

      expect(store.validationErrors).toEqual([])
      expect(store.isReadOnly).toBe(false)
    })

    it('should report a name validation error for a cohort with an empty name', () => {
      const store = useCohortStore()
      const invalidCohort: CohortDefinition = {
        name: '',
        qualifyingLimit: 'ALL',
      }

      store.setCohort(invalidCohort)

      expect(store.validationErrors.length).toBeGreaterThan(0)
      expect(store.validationErrors.some((err) => err.field === 'name')).toBe(true)
    })
  })

  describe('Entry Events Edge Cases (legacy — methods removed in circe refactor)', () => {
    it.skip('should handle removeEntryEvent when no cohort exists', () => {
      const store = useCohortStore()

      expect(() => store.removeEntryEvent('any-id')).not.toThrow()
      expect(store.currentCohort).toBeNull()
    })

    it.skip('should handle updateEntryEvent when no cohort exists', () => {
      const store = useCohortStore()

      const event: CohortEvent = {
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      }

      expect(() => store.updateEntryEvent('event-1', event)).not.toThrow()
      expect(store.currentCohort).toBeNull()
    })

    it.skip('should not mark dirty when removing non-existent event', () => {
      const store = useCohortStore()
      store.createNewCohort()
      store.markClean()

      store.removeEntryEvent('non-existent')

      expect(store.isDirty).toBe(false)
    })

    it.skip('should not mark dirty when updating non-existent event', () => {
      const store = useCohortStore()
      store.createNewCohort()
      store.markClean()

      const event: CohortEvent = {
        id: 'non-existent',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      }

      store.updateEntryEvent('non-existent', event)

      expect(store.isDirty).toBe(false)
    })
  })

  describe('Computed Properties Edge Cases', () => {
    it.skip('should handle hasEntryEvents with null cohort (computed removed in circe refactor)', () => {
      const store = useCohortStore()

      expect(store.hasEntryEvents).toBe(false)
    })

    it.skip('should handle hasInclusionRules with null cohort (computed removed in circe refactor)', () => {
      const store = useCohortStore()

      expect(store.hasInclusionRules).toBe(false)
    })

    it.skip('should handle entryEventCount with null cohort (computed removed in circe refactor)', () => {
      const store = useCohortStore()

      expect(store.entryEventCount).toBe(0)
    })

    it('should compute canSave as true when cohort has a name and no errors', () => {
      const store = useCohortStore()
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        qualifyingLimit: 'ALL',
      }

      store.setCohort(cohort)

      expect(store.hasValidationErrors).toBe(false)
      expect(store.canSave).toBe(true)
    })
  })

  describe('State Combinations', () => {
    it('should handle complex cohort with all optional fields', () => {
      const store = useCohortStore()
      const complexCohort: CohortDefinition = {
        id: 888,
        name: 'Complex Cohort',
        description: 'A complex test cohort',
        entryEvents: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
          },
        ],
        qualifyingLimit: 'FIRST',
        inclusionQualifyingLimit: 'LAST',
        observationPeriod: {
          priorDays: 365,
          postDays: 30,
        },
        additionalCriteria: {
          id: 'criteria-1',
          logicType: 'ALL',
          events: [],
        },
        inclusionRules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            criteriaGroups: [],
          },
        ],
        exitCriteria: {
          strategy: 'FIXED_DURATION',
          offset: 30,
          dateField: 'START_DATE',
        },
        conceptSets: [
          {
            id: 1,
            name: 'Test Concept Set',
            conceptCount: 10,
          },
        ],
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 30,
        },
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 0,
          },
          endDate: {
            dateField: 'END_DATE',
            offset: 30,
          },
        },
        censoringCriteria: [
          {
            id: 'censor-1',
            criteriaType: 'Death',
            attributes: [],
          },
        ],
      }

      store.setCohort(complexCohort)

      expect(store.currentCohort).toEqual(complexCohort)
      expect(store.validationErrors).toHaveLength(0)
      expect(store.canSave).toBe(true)
    })

    it.skip('should preserve state through multiple operations (legacy — uses removed methods)', () => {
      const store = useCohortStore()

      store.createNewCohort()
      expect(store.isDirty).toBe(false)

      store.addEntryEvent({
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      })
      expect(store.isDirty).toBe(true)
      expect(store.entryEventCount).toBe(1)

      store.updateEntryEvent('event-1', {
        id: 'event-1',
        criteriaType: 'DrugExposure',
        attributes: [],
      })
      expect(store.isDirty).toBe(true)
      expect(store.currentCohort?.entryEvents[0]?.criteriaType).toBe('DrugExposure')

      store.markClean()
      expect(store.isDirty).toBe(false)

      store.removeEntryEvent('event-1')
      expect(store.isDirty).toBe(true)
      expect(store.entryEventCount).toBe(0)
    })
  })

  describe('Version Preview', () => {
    const baseCohort: CohortDefinition = {
      id: 10,
      name: 'Test Cohort',
      description: '',
      entryEvents: [],
      inclusionRules: [],
      endStrategy: null,
      censoringCriteria: [],
      collapseSettings: { collapseType: 'ERA', eraPad: 0 },
      censored: false,
    }

    it('loadVersionPreview throws when no current cohort', async () => {
      const store = useCohortStore()
      await expect(store.loadVersionPreview(1)).rejects.toThrow('No current cohort ID')
    })

    it('loadVersionPreview sets previewVersion and signals the editor to reload that version', async () => {
      const store = useCohortStore()
      store.setCohort(baseCohort)

      const versionDTO = {
        version: 2,
        assetId: 10,
        createdBy: { id: 1, name: 'User', email: 'u@test.com' },
        createdDate: '2024-01-01T00:00:00Z',
        comment: null,
        archived: false,
      }
      // entityDTO is the raw Atlas-shaped DTO (id/name/description/expression),
      // not an internal CohortDefinition — the store no longer touches it
      // directly; the mounted editor fetches + converts + resyncs via the
      // reloadRequest/reloadVersion signal below.
      vi.mocked(mockGetVersion).mockResolvedValueOnce({
        versionDTO,
        entityDTO: { id: 10, name: 'Historical Cohort', description: '', expression: '{}' },
      })

      const before = store.reloadRequest

      await store.loadVersionPreview(2)

      expect(store.previewVersion).toEqual(versionDTO)
      expect(store.reloadVersion).toBe(2)
      expect(store.reloadRequest).toBe(before + 1)
      expect(store.currentCohort?.name).toBe('Test Cohort')
    })

    it('loadVersionPreview rethrows on service error', async () => {
      const store = useCohortStore()
      store.setCohort(baseCohort)
      vi.mocked(mockGetVersion).mockRejectedValueOnce(new Error('Not found'))
      await expect(store.loadVersionPreview(99)).rejects.toThrow('Not found')
    })

    it('clearPreviewVersion clears preview state and signals a reload', async () => {
      const store = useCohortStore()
      store.setCohort(baseCohort)
      store.previewVersion = {
        version: 1,
        assetId: 10,
        createdBy: { id: 1, name: 'U', email: 'u@test.com' },
        createdDate: '2024-01-01T00:00:00Z',
        comment: null,
        archived: false,
      }

      const before = store.reloadRequest

      await store.clearPreviewVersion()

      expect(store.previewVersion).toBeNull()
      expect(store.reloadRequest).toBe(before + 1)
    })

    it('savePreviewAsCurrent returns false when not in preview mode', async () => {
      const store = useCohortStore()
      const result = await store.savePreviewAsCurrent()
      expect(result).toBe(false)
    })

    it('savePreviewAsCurrent returns false when no cohort data', async () => {
      const store = useCohortStore()
      store.previewVersion = {
        version: 1,
        assetId: 10,
        createdBy: { id: 1, name: 'U', email: 'u@test.com' },
        createdDate: '2024-01-01T00:00:00Z',
        comment: null,
        archived: false,
      }
      const result = await store.savePreviewAsCurrent()
      expect(result).toBe(false)
    })
  })

  describe('dispose', () => {
    it('does not throw when called', () => {
      const store = useCohortStore()
      expect(() => store.dispose()).not.toThrow()
    })
  })

  describe('auto-save lifecycle', () => {
    // The timer belongs to the mounted CohortBuilder, not to the store: an edit
    // alone must not leave a 30s serialiser running for the rest of the session.
    it('does not start the auto-save timer just because the cohort became dirty', async () => {
      const store = useCohortStore()
      const setItem = vi.spyOn(Storage.prototype, 'setItem')
      vi.useFakeTimers()
      try {
        store.createNewCohort()
        store.markDirty()

        await vi.advanceTimersByTimeAsync(60000)

        expect(setItem).not.toHaveBeenCalled()
        expect(store.lastAutoSave).toBeNull()
      } finally {
        vi.useRealTimers()
      }
    })

    it('saves the draft on the interval once started and stops on stopAutoSave', async () => {
      const store = useCohortStore()
      vi.useFakeTimers()
      try {
        store.createNewCohort()
        store.markDirty()
        store.startAutoSave()

        await vi.advanceTimersByTimeAsync(30000)
        expect(store.lastAutoSave).not.toBeNull()

        store.stopAutoSave()
        const afterStop = store.lastAutoSave
        await vi.advanceTimersByTimeAsync(60000)

        expect(store.lastAutoSave).toBe(afterStop)
      } finally {
        store.stopAutoSave()
        vi.useRealTimers()
      }
    })
  })

  describe('agent handshake', () => {
    it('requestNewCohort resets and bumps newCohortSignal', () => {
      const store = useCohortStore()
      store.createNewCohort()
      const before = store.newCohortSignal
      store.requestNewCohort()
      expect(store.newCohortSignal).toBe(before + 1)
      expect(store.currentCohort?.name).toBe('New Cohort')
      expect(store.isDirty).toBe(false)
    })

    it('requestSave resolves with the payload passed to notifySaved', async () => {
      const store = useCohortStore()
      const p = store.requestSave()
      store.notifySaved({ id: 42, name: 'Cohort A' })
      await expect(p).resolves.toEqual({ id: 42, name: 'Cohort A' })
    })

    it('requestSave records saveOptions and bumps saveRequest synchronously', () => {
      const store = useCohortStore()
      const before = store.saveRequest
      void store.requestSave({ name: 'N', description: 'D' })
      expect(store.saveRequest).toBe(before + 1)
      expect(store.saveOptions).toEqual({ name: 'N', description: 'D' })
    })

    it('requestSave falls back to a timedOut result after 8s if nothing answers', async () => {
      vi.useFakeTimers()
      try {
        const store = useCohortStore()
        const p = store.requestSave()
        vi.advanceTimersByTime(8000)
        await expect(p).resolves.toEqual({ timedOut: true })
      } finally {
        vi.useRealTimers()
      }
    })

    it('routes each overlapping request its own result, in order', async () => {
      vi.useFakeTimers()
      try {
        const store = useCohortStore()
        const pA = store.requestSave()
        vi.advanceTimersByTime(4000)
        const pB = store.requestSave()

        store.notifySaved({ id: 1, name: 'Cohort A' })
        await expect(pA).resolves.toEqual({ id: 1, name: 'Cohort A' })

        store.notifySaved({ id: 2, name: 'Cohort B' })
        await expect(pB).resolves.toEqual({ id: 2, name: 'Cohort B' })
      } finally {
        vi.useRealTimers()
      }
    })

    it('times out each overlapping request on its own clock', async () => {
      vi.useFakeTimers()
      try {
        const store = useCohortStore()
        const pA = store.requestSave()
        vi.advanceTimersByTime(4000)
        const pB = store.requestSave()

        // A waits 8s from its own start, not B's - a WebMCP tool call awaiting
        // it must never hang forever (see pythiaBridge.ts).
        vi.advanceTimersByTime(4000)
        await expect(pA).resolves.toEqual({ timedOut: true })

        vi.advanceTimersByTime(4000)
        await expect(pB).resolves.toEqual({ timedOut: true })
      } finally {
        vi.useRealTimers()
      }
    })

    it('notifySaved with no pending resolver is a no-op', () => {
      const store = useCohortStore()
      expect(() => store.notifySaved({ id: 1 })).not.toThrow()
    })

    it('applyProposal ignores saveCohort kind (handled by the host bridge)', () => {
      const store = useCohortStore()
      store.createNewCohort()
      const before = store.saveRequest
      store.applyProposal({ kind: 'saveCohort', name: 'X' } as never)
      // No state mutation — the bridge orchestrates the save flow.
      expect(store.saveRequest).toBe(before)
    })
  })

  describe('savePreviewAsCurrent', () => {
    it('persists through the editor save path and reports the server result', async () => {
      const store = useCohortStore()
      store.setCohort({ id: 7, name: 'Restored', entryEvents: [] } as never)
      store.previewVersion = { version: 3 } as never

      const pending = store.savePreviewAsCurrent()
      await Promise.resolve()

      // The editor answers the signal, as CohortBuilder's watcher does.
      store.notifySaved({ id: 7, name: 'Restored' })

      expect(await pending).toBe(true)
      expect(store.previewVersion).toBeNull()
    })

    it('reports failure when no editor answers the save signal', async () => {
      vi.useFakeTimers()
      const store = useCohortStore()
      store.setCohort({ id: 7, name: 'Restored', entryEvents: [] } as never)
      store.previewVersion = { version: 3 } as never

      const pending = store.savePreviewAsCurrent()
      await vi.advanceTimersByTimeAsync(8000)

      expect(await pending).toBe(false)
      expect(store.previewVersion).not.toBeNull()
      vi.useRealTimers()
    })

    it('refuses to save when not in preview mode', async () => {
      const store = useCohortStore()
      store.setCohort({ id: 7, name: 'Restored', entryEvents: [] } as never)

      expect(await store.savePreviewAsCurrent()).toBe(false)
    })
  })
})
