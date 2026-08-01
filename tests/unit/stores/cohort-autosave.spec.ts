/**
 * Unit Test: Cohort Store - Auto-Save and Draft Management
 * Tests SessionStorage auto-save, restore, and draft clearing
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCohortStore } from '@/stores/cohort'
import type { CohortDefinition } from '@/models/cohort.types'

describe('Cohort Store - Auto-Save and Draft Management', () => {
  let store: ReturnType<typeof useCohortStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useCohortStore()
    vi.useFakeTimers()
    // Clear sessionStorage before each test
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    sessionStorage.clear()
  })

  describe('saveToDraft', () => {
    it('should save cohort to sessionStorage when dirty', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markDirty()

      store.saveToDraft()

      const savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeTruthy()

      const parsed = JSON.parse(savedData!)
      expect(parsed.cohort).toEqual(cohort)
      expect(parsed.timestamp).toBeTruthy()
      expect(store.lastAutoSave).toBeTruthy()
    })

    it('should not save when cohort is clean (not dirty)', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markClean()

      store.saveToDraft()

      const savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeNull()
    })

    it('should not save when no cohort is set', () => {
      store.markDirty()
      store.saveToDraft()

      const savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeNull()
    })

    it('should update lastAutoSave timestamp', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markDirty()

      expect(store.lastAutoSave).toBeNull()

      store.saveToDraft()

      expect(store.lastAutoSave).toBeInstanceOf(Date)
    })
  })

  describe('restoreFromDraft', () => {
    it('should restore cohort from sessionStorage', () => {
      const cohort: CohortDefinition = {
        name: 'Restored Cohort',
        entryEvents: [{
          id: '1',
          criteriaType: 'ConditionOccurrence',
        }],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      const draftData = {
        cohort,
        timestamp: new Date().toISOString(),
      }

      sessionStorage.setItem('atlas3_cohort_draft', JSON.stringify(draftData))

      const restored = store.restoreFromDraft()

      expect(restored).toBe(true)
      expect(store.currentCohort).toEqual(cohort)
      expect(store.isDirty).toBe(true) // Should be marked dirty since it's a draft
    })

    it('should return false when no draft exists', () => {
      const restored = store.restoreFromDraft()

      expect(restored).toBe(false)
      expect(store.currentCohort).toBeNull()
    })

    it('should handle corrupted draft data gracefully', () => {
      sessionStorage.setItem('atlas3_cohort_draft', 'invalid json')

      const restored = store.restoreFromDraft()

      expect(restored).toBe(false)
      expect(store.currentCohort).toBeNull()

      // Should remove corrupted data
      expect(sessionStorage.getItem('atlas3_cohort_draft')).toBeNull()
    })

    it('should handle draft with missing cohort field', () => {
      const draftData = {
        timestamp: new Date().toISOString(),
      }

      sessionStorage.setItem('atlas3_cohort_draft', JSON.stringify(draftData))

      const restored = store.restoreFromDraft()

      expect(restored).toBe(false)
    })
  })

  describe('clearDraft', () => {
    it('should remove draft from sessionStorage', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markDirty()
      store.saveToDraft()

      expect(sessionStorage.getItem('atlas3_cohort_draft')).toBeTruthy()

      store.clearDraft()

      expect(sessionStorage.getItem('atlas3_cohort_draft')).toBeNull()
      expect(store.lastAutoSave).toBeNull()
    })
  })

  describe('startAutoSave', () => {
    it('should start auto-save timer', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markDirty()

      store.startAutoSave()

      // Fast-forward 30 seconds (AUTO_SAVE_INTERVAL_MS)
      vi.advanceTimersByTime(30000)

      const savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeTruthy()
    })

    it('should save multiple times at 30-second intervals', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markDirty()

      store.startAutoSave()

      // First save after 30 seconds
      vi.advanceTimersByTime(30000)
      let savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeTruthy()
      const firstTimestamp = JSON.parse(savedData!).timestamp

      // Clear storage to verify second save
      sessionStorage.clear()

      // Second save after another 30 seconds
      vi.advanceTimersByTime(30000)
      savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeTruthy()
      const secondTimestamp = JSON.parse(savedData!).timestamp

      // Timestamps should be different
      expect(secondTimestamp).not.toBe(firstTimestamp)
    })

    it('should not start multiple timers', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markDirty()

      store.startAutoSave()
      store.startAutoSave() // Call again

      // Should only save once per interval
      vi.advanceTimersByTime(30000)

      const savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeTruthy()
    })
  })

  describe('stopAutoSave', () => {
    it('should stop auto-save timer', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markDirty()

      store.startAutoSave()
      store.stopAutoSave()

      // Fast-forward 30 seconds - should NOT save
      vi.advanceTimersByTime(30000)

      const savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeNull()
    })
  })

  describe('auto-save on dirty state change', () => {
    it('should automatically start auto-save when cohort becomes dirty', async () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)

      // Wait for next tick to allow watcher to run
      await vi.advanceTimersByTimeAsync(0)

      store.markDirty() // This should trigger auto-save

      // Wait for watcher to trigger
      await vi.advanceTimersByTimeAsync(0)

      // Fast-forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000)

      const savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeTruthy()
    })

    it('should auto-save when adding a primary criterion via proposal', async () => {
      // createNewCohort sets name only; applyProposal needs expression to exist
      store.setCohort({ name: 'New Cohort', expression: {} })

      // Wait for next tick
      await vi.advanceTimersByTimeAsync(0)

      // addEntryEvent proposal mutates expression.PrimaryCriteria.CriteriaList
      store.applyProposal({ kind: 'addEntryEvent', event: { id: '1', criteriaType: 'ConditionOccurrence' } })

      // Wait for watcher to trigger
      await vi.advanceTimersByTimeAsync(0)

      // Fast-forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000)

      const savedData = sessionStorage.getItem('atlas3_cohort_draft')
      expect(savedData).toBeTruthy()

      const parsed = JSON.parse(savedData!)
      expect(parsed.cohort.expression.PrimaryCriteria.CriteriaList).toHaveLength(1)
    })
  })

  describe('integration with save workflow', () => {
    it('should preserve draft data across store operations', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        description: 'Test Description',
        entryEvents: [{
          id: '1',
          criteriaType: 'ConditionOccurrence',
        }],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(cohort)
      store.markDirty()
      store.saveToDraft()

      // Create a new store instance (simulating page reload)
      const newStore = useCohortStore()
      const restored = newStore.restoreFromDraft()

      expect(restored).toBe(true)
      expect(newStore.currentCohort?.name).toBe('Test Cohort')
      expect(newStore.currentCohort?.description).toBe('Test Description')
      expect(newStore.currentCohort?.entryEvents).toHaveLength(1)
    })
  })
})
