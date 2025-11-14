/**
 * Cohort Store Tests
 * Tests for cohort state management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCohortStore } from '@/stores/cohort'
import type { CohortEvent, CohortDefinition } from '@/models/cohort.types'
import * as cohortCache from '@/utils/cohort-cache'

// Mock IndexedDB for testing
import 'fake-indexeddb/auto'

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

    it('should have no entry events initially', () => {
      const store = useCohortStore()
      expect(store.hasEntryEvents).toBe(false)
      expect(store.entryEventCount).toBe(0)
    })
  })

  describe('Create New Cohort', () => {
    it('should create a new cohort with default values', () => {
      const store = useCohortStore()
      store.createNewCohort()

      expect(store.currentCohort).not.toBeNull()
      expect(store.currentCohort?.name).toBe('New Cohort')
      expect(store.currentCohort?.entryEvents).toEqual([])
      expect(store.currentCohort?.qualifyingLimit).toBe('ALL')
      expect(store.currentCohort?.inclusionRules).toEqual([])
      expect(store.currentCohort?.conceptSets).toEqual([])
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

  describe('Entry Events Management', () => {
    it('should add entry event to existing cohort', () => {
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

    it('should create new cohort if none exists when adding event', () => {
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

    it('should remove entry event by ID', () => {
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

    it('should not fail when removing non-existent event', () => {
      const store = useCohortStore()
      store.createNewCohort()

      expect(() => store.removeEntryEvent('non-existent')).not.toThrow()
      expect(store.entryEventCount).toBe(0)
    })

    it('should update entry event', () => {
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

    it('should not fail when updating non-existent event', () => {
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
      expect(store.hasEntryEvents).toBe(false)
      expect(store.entryEventCount).toBe(0)
    })
  })

  describe('Computed Properties', () => {
    it('should correctly compute hasInclusionRules', () => {
      const store = useCohortStore()
      const cohort = {
        name: 'Test',
        entryEvents: [],
        qualifyingLimit: 'ALL' as const,
        inclusionRules: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            criteriaGroups: [],
          },
        ],
        conceptSets: [],
      }

      store.setCohort(cohort)
      expect(store.hasInclusionRules).toBe(true)
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

    it('should detect missing entry events', () => {
      const store = useCohortStore()
      const invalidCohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(invalidCohort)

      expect(store.validationErrors.length).toBeGreaterThan(0)
      expect(store.validationErrors.some((err) => err.field === 'entryEvents')).toBe(true)
      expect(store.isReadOnly).toBe(true)
    })
  })

  describe('Caching', () => {
    it('should cache cohort on successful load', async () => {
      const store = useCohortStore()
      const mockCohort: CohortDefinition = {
        id: 123,
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
      }

      // Save to cache first
      await cohortCache.saveCohortToCache(mockCohort)

      // Load from cache
      const result = await store.loadCohort(123)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(123)
      expect(store.currentCohort?.id).toBe(123)
    })

    it('should use getCachedCohort as fallback', async () => {
      const store = useCohortStore()
      const mockCohort: CohortDefinition = {
        id: 456,
        name: 'Cached Cohort',
        entryEvents: [
          {
            id: 'event-1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
          },
        ],
        qualifyingLimit: 'FIRST',
        inclusionRules: [],
        conceptSets: [],
      }

      // Save to cache
      await cohortCache.saveCohortToCache(mockCohort)

      // Use fallback method
      const result = await store.getCachedCohort(456)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('Cached Cohort')
    })
  })

  describe('Save with Retry Logic', () => {
    it('should successfully save cohort', async () => {
      const store = useCohortStore()
      const validCohort: CohortDefinition = {
        id: 111,
        name: 'Save Test',
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
      store.markDirty()

      const result = await store.saveCohort()

      expect(result).toBe(true)
      expect(store.isDirty).toBe(false)
      expect(store.retryState.attempt).toBe(0)
      expect(store.retryState.isRetrying).toBe(false)
    })

    it('should not save when validation errors exist', async () => {
      const store = useCohortStore()
      const invalidCohort: CohortDefinition = {
        name: '',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
      }

      store.setCohort(invalidCohort)
      store.markDirty()

      const result = await store.saveCohort()

      expect(result).toBe(false)
      expect(store.canSave).toBe(false)
    })

    it('should retry on failure with exponential backoff', async () => {
      const store = useCohortStore()
      const cohort: CohortDefinition = {
        id: 222,
        name: 'Retry Test',
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

      // Mock saveCohortToCache to fail twice, then succeed
      let attempts = 0
      const originalSave = cohortCache.saveCohortToCache
      vi.spyOn(cohortCache, 'saveCohortToCache').mockImplementation(async (coh, src) => {
        attempts++
        if (attempts < 3) {
          throw new Error('Network error')
        }
        // Succeed on third attempt
        return originalSave(coh, src || 'local')
      })

      const result = await store.saveCohort()

      expect(result).toBe(true)
      expect(attempts).toBe(3)
      expect(store.retryState.attempt).toBe(0) // Reset after success
    }, 15000) // Increase timeout for retry delays

    it('should cancel retry', async () => {
      const store = useCohortStore()

      store.cancelRetry()

      expect(store.retryState.attempt).toBe(0)
      expect(store.retryState.isRetrying).toBe(false)
      expect(store.retryState.nextRetryAt).toBeNull()
    })
  })
})
