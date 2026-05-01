/**
 * Cohort Store Tests
 * Tests for cohort state management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCohortStore } from '@/stores/cohort'
import type { CohortEvent, CohortDefinition } from '@/models/cohort.types'
import * as cohortCache from '@/utils/cohort-cache'

// Mock the cohort-cache module to avoid IndexedDB timing issues in CI
vi.mock('@/utils/cohort-cache', () => {
  const mockCache = new Map<number | string, CohortDefinition>()

  return {
    saveCohortToCache: vi.fn(async (cohort: CohortDefinition) => {
      if (cohort.id) {
        mockCache.set(cohort.id, { ...cohort })
      }
    }),
    getCohortFromCache: vi.fn(async (id: number | string) => {
      return mockCache.get(id) || null
    }),
    deleteCohortFromCache: vi.fn(async (id: number | string) => {
      mockCache.delete(id)
    }),
    clearCache: vi.fn(async () => {
      mockCache.clear()
    }),
    // Export for test access
    _mockCache: mockCache,
  }
})

describe('Cohort Store', () => {
  // Get access to the internal mock cache
  const getMockCache = () => (cohortCache as any)._mockCache as Map<number | string, CohortDefinition>

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Clear the mock cache
    getMockCache().clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    getMockCache().clear()
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

    it('should not save when no cohort exists', async () => {
      const store = useCohortStore()

      const result = await store.saveCohort()

      expect(result).toBe(false)
    })

    it('should not save when in read-only mode', async () => {
      const store = useCohortStore()
      const invalidCohort: CohortDefinition = {
        name: '  ', // Whitespace only
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
      store.markDirty()

      expect(store.isReadOnly).toBe(true)

      const result = await store.saveCohort()

      expect(result).toBe(false)
    })

    it('should retry on failure with exponential backoff', async () => {
      vi.useFakeTimers()

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
      vi.mocked(cohortCache.saveCohortToCache).mockImplementation(async (coh) => {
        attempts++
        if (attempts < 3) {
          throw new Error('Network error')
        }
        // Succeed on third attempt - store in mock cache
        if (coh.id) {
          getMockCache().set(coh.id, { ...coh })
        }
      })

      // Start save (don't await yet)
      const savePromise = store.saveCohort()

      // Advance timers for retry delays (1s + 2s = 3s total)
      await vi.advanceTimersByTimeAsync(1000) // First retry delay
      await vi.advanceTimersByTimeAsync(2000) // Second retry delay

      const result = await savePromise

      expect(result).toBe(true)
      expect(attempts).toBe(3)
      expect(store.retryState.attempt).toBe(0) // Reset after success

      vi.useRealTimers()
    })

    it.skip('should fail after max retry attempts', async () => {
      const store = useCohortStore()
      const cohort: CohortDefinition = {
        id: 333,
        name: 'Max Retry Test',
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

      // Mock saveCohortToCache to always fail
      let attempts = 0
      vi.mocked(cohortCache.saveCohortToCache).mockImplementation(async () => {
        attempts++
        throw new Error('Persistent network error')
      })

      const result = await store.saveCohort()

      expect(result).toBe(false)
      expect(attempts).toBe(5) // Max attempts
      expect(store.retryState.isRetrying).toBe(false)
    }, 60000) // Longer timeout for exponential backoff

    it('should cancel retry', async () => {
      const store = useCohortStore()

      store.cancelRetry()

      expect(store.retryState.attempt).toBe(0)
      expect(store.retryState.isRetrying).toBe(false)
      expect(store.retryState.nextRetryAt).toBeNull()
    })

    it.skip('should cancel pending retry operation', async () => {
      const store = useCohortStore()
      const cohort: CohortDefinition = {
        id: 444,
        name: 'Cancel Test',
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

      // Mock to always fail
      vi.mocked(cohortCache.saveCohortToCache).mockRejectedValue(new Error('Network error'))

      // Start save (will retry)
      const savePromise = store.saveCohort()

      // Cancel immediately
      store.cancelRetry()

      await savePromise

      // Should have stopped retrying
      expect(store.retryState.attempt).toBe(0)
      expect(store.retryState.isRetrying).toBe(false)
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

    it('should validate collapseSettings with missing collapseType', () => {
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

    it('should validate censorWindow with invalid date ordering', () => {
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

      // Should not have censorWindow errors when only startDate is provided
      expect(store.validationErrors.some((err) => err.field === 'censorWindow')).toBe(false)
    })

    it('should handle validation with null cohort', () => {
      const store = useCohortStore()

      store.validateCohort()

      expect(store.validationErrors).toEqual([])
      expect(store.isReadOnly).toBe(false)
    })

    it('should have multiple validation errors for invalid cohort', () => {
      const store = useCohortStore()
      const invalidCohort: CohortDefinition = {
        name: '',
        entryEvents: [],
        qualifyingLimit: 'ALL',
        inclusionRules: [],
        conceptSets: [],
        collapseSettings: {
          collapseType: '',
          eraPad: 0,
        },
      }

      store.setCohort(invalidCohort)

      expect(store.validationErrors.length).toBeGreaterThan(1)
      expect(store.validationErrors.some((err) => err.field === 'name')).toBe(true)
      expect(store.validationErrors.some((err) => err.field === 'entryEvents')).toBe(true)
      expect(
        store.validationErrors.some((err) => err.field === 'collapseSettings.collapseType')
      ).toBe(true)
    })
  })

  describe('Entry Events Edge Cases', () => {
    it('should handle removeEntryEvent when no cohort exists', () => {
      const store = useCohortStore()

      expect(() => store.removeEntryEvent('any-id')).not.toThrow()
      expect(store.currentCohort).toBeNull()
    })

    it('should handle updateEntryEvent when no cohort exists', () => {
      const store = useCohortStore()

      const event: CohortEvent = {
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      }

      expect(() => store.updateEntryEvent('event-1', event)).not.toThrow()
      expect(store.currentCohort).toBeNull()
    })

    it('should not mark dirty when removing non-existent event', () => {
      const store = useCohortStore()
      store.createNewCohort()
      store.markClean()

      store.removeEntryEvent('non-existent')

      expect(store.isDirty).toBe(false)
    })

    it('should not mark dirty when updating non-existent event', () => {
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
    it('should handle hasEntryEvents with null cohort', () => {
      const store = useCohortStore()

      expect(store.hasEntryEvents).toBe(false)
    })

    it('should handle hasInclusionRules with null cohort', () => {
      const store = useCohortStore()

      expect(store.hasInclusionRules).toBe(false)
    })

    it('should handle entryEventCount with null cohort', () => {
      const store = useCohortStore()

      expect(store.entryEventCount).toBe(0)
    })

    it('should compute canSave correctly with warnings only', () => {
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

      // Has warnings but no errors
      expect(store.validationErrors.some((err) => err.severity === 'warning')).toBe(true)
      expect(store.hasValidationErrors).toBe(false)
      expect(store.canSave).toBe(true)
    })
  })

  describe('Cache Operations', () => {
    it('should return null when loading non-existent cohort', async () => {
      const store = useCohortStore()

      const result = await store.loadCohort(999999)

      expect(result).toBeNull()
      expect(store.currentCohort).toBeNull()
    })

    it('should use fallback when loadCohort encounters error', async () => {
      const store = useCohortStore()
      const mockCohort: CohortDefinition = {
        id: 555,
        name: 'Fallback Test',
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

      // Save to cache
      await cohortCache.saveCohortToCache(mockCohort)

      // Mock getCohortFromCache to fail first time
      let callCount = 0
      vi.mocked(cohortCache.getCohortFromCache).mockImplementation(async (_id) => {
        callCount++
        if (callCount === 1) {
          throw new Error('Cache error')
        }
        // Second call (fallback) should succeed
        return mockCohort
      })

      const result = await store.loadCohort(555)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(555)
      expect(callCount).toBe(2) // Called twice (initial + fallback)
    })

    it('should return null when getCachedCohort fails', async () => {
      const store = useCohortStore()

      // Mock to throw error
      vi.mocked(cohortCache.getCohortFromCache).mockRejectedValue(new Error('Cache error'))

      const result = await store.getCachedCohort(999)

      expect(result).toBeNull()
    })

    it('should handle deleteCachedCohort successfully', async () => {
      const store = useCohortStore()
      const mockCohort: CohortDefinition = {
        id: 666,
        name: 'Delete Test',
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

      // Save to cache
      await cohortCache.saveCohortToCache(mockCohort)

      // Delete it
      await store.deleteCachedCohort(666)

      // Verify it's deleted
      const result = await cohortCache.getCohortFromCache(666)
      expect(result).toBeNull()
    })

    it('should handle deleteCachedCohort with error gracefully', async () => {
      const store = useCohortStore()

      // Mock to throw error
      vi.mocked(cohortCache.deleteCohortFromCache).mockRejectedValue(
        new Error('Delete failed')
      )

      // Should not throw
      await expect(store.deleteCachedCohort(777)).resolves.toBeUndefined()
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
      expect(store.hasEntryEvents).toBe(true)
      expect(store.hasInclusionRules).toBe(true)
      expect(store.validationErrors).toHaveLength(0)
      expect(store.canSave).toBe(true)
    })

    it('should preserve state through multiple operations', () => {
      const store = useCohortStore()

      // Create cohort
      store.createNewCohort()
      expect(store.isDirty).toBe(false)

      // Add event
      store.addEntryEvent({
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      })
      expect(store.isDirty).toBe(true)
      expect(store.entryEventCount).toBe(1)

      // Update event
      store.updateEntryEvent('event-1', {
        id: 'event-1',
        criteriaType: 'DrugExposure',
        attributes: [],
      })
      expect(store.isDirty).toBe(true)
      expect(store.currentCohort?.entryEvents[0]?.criteriaType).toBe('DrugExposure')

      // Mark clean
      store.markClean()
      expect(store.isDirty).toBe(false)

      // Remove event
      store.removeEntryEvent('event-1')
      expect(store.isDirty).toBe(true)
      expect(store.entryEventCount).toBe(0)
    })
  })
})
