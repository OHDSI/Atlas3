/**
 * Cohort Store Tests
 * Tests for cohort state management
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCohortStore } from '@/stores/cohort'
import type { CohortEvent } from '@/models/cohort.types'

describe('Cohort Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
})
