/**
 * useCohortBuilder Composable Tests
 * Tests for cohort building functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-12345'),
}))

import { useCohortBuilder } from '@/composables/useCohortBuilder'
import { useCohortStore } from '@/stores/cohort'
import { useRouter } from 'vue-router'

describe('useCohortBuilder', () => {
  let mockRouterPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())

    mockRouterPush = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
    } as any)

    vi.clearAllMocks()
  })

  describe('computed state', () => {
    it('should return currentCohort from store', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()

      const { currentCohort } = useCohortBuilder()

      expect(currentCohort.value).not.toBeNull()
      expect(currentCohort.value?.name).toBe('New Cohort')
    })

    it('should return isDirty from store', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.markDirty()

      const { isDirty } = useCohortBuilder()

      expect(isDirty.value).toBe(true)
    })

    it('should return canSave as false when no cohort', () => {
      const { canSave } = useCohortBuilder()

      expect(canSave.value).toBe(false)
    })

    it('should return canSave as false when name is empty', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.setCohort({
        ...cohortStore.currentCohort!,
        name: '',
        entryEvents: [{ id: '1', criteriaType: 'ConditionOccurrence', attributes: [] }]
      })

      const { canSave } = useCohortBuilder()

      expect(canSave.value).toBe(false)
    })

    it('should return canSave as false when no entry events', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.setCohort({
        ...cohortStore.currentCohort!,
        name: 'Test Cohort',
        entryEvents: []
      })

      const { canSave } = useCohortBuilder()

      expect(canSave.value).toBe(false)
    })

    it('should return canSave as true when has name and entry events', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.setCohort({
        ...cohortStore.currentCohort!,
        name: 'Test Cohort',
        entryEvents: [{ id: '1', criteriaType: 'ConditionOccurrence', attributes: [] }]
      })

      const { canSave } = useCohortBuilder()

      expect(canSave.value).toBe(true)
    })
  })

  describe('createNewCohort', () => {
    it('should create a new cohort via store', () => {
      const cohortStore = useCohortStore()
      const { createNewCohort, currentCohort } = useCohortBuilder()

      createNewCohort()

      expect(currentCohort.value).not.toBeNull()
      expect(cohortStore.currentCohort).not.toBeNull()
    })
  })

  describe('loadCohort', () => {
    it('should create cohort if none exists', () => {
      const { loadCohort, currentCohort } = useCohortBuilder()

      loadCohort(123)

      expect(currentCohort.value).not.toBeNull()
    })

    it('should not create cohort if one already exists', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.setCohort({ ...cohortStore.currentCohort!, name: 'Existing' })

      const { loadCohort, currentCohort } = useCohortBuilder()

      loadCohort(123)

      expect(currentCohort.value?.name).toBe('Existing')
    })
  })

  describe('addEntryEvent', () => {
    it('should add entry event with default type', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()

      const { addEntryEvent } = useCohortBuilder()

      const eventId = addEntryEvent()

      expect(eventId).toBe('test-uuid-12345')
      expect(cohortStore.currentCohort?.entryEvents).toHaveLength(1)
      expect(cohortStore.currentCohort?.entryEvents[0].criteriaType).toBe('ConditionOccurrence')
    })

    it('should add entry event with specified type', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()

      const { addEntryEvent } = useCohortBuilder()

      addEntryEvent('DrugExposure')

      expect(cohortStore.currentCohort?.entryEvents[0].criteriaType).toBe('DrugExposure')
    })
  })

  describe('removeEntryEvent', () => {
    it('should remove entry event', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.addEntryEvent({ id: 'event-1', criteriaType: 'ConditionOccurrence', attributes: [] })

      const { removeEntryEvent } = useCohortBuilder()

      removeEntryEvent('event-1')

      expect(cohortStore.currentCohort?.entryEvents).toHaveLength(0)
    })
  })

  describe('updateEntryEvent', () => {
    it('should update entry event', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.addEntryEvent({ id: 'event-1', criteriaType: 'ConditionOccurrence', attributes: [] })

      const { updateEntryEvent } = useCohortBuilder()

      updateEntryEvent('event-1', {
        id: 'event-1',
        criteriaType: 'DrugExposure',
        attributes: []
      })

      expect(cohortStore.currentCohort?.entryEvents[0].criteriaType).toBe('DrugExposure')
    })
  })

  describe('saveCohort', () => {
    it('should throw error when cannot save', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()

      const { saveCohort } = useCohortBuilder()

      expect(() => saveCohort('Test', 'Description')).toThrow('Cannot save')
    })

    it('should throw error when no cohort exists', () => {
      const { saveCohort } = useCohortBuilder()

      expect(() => saveCohort('Test', 'Description')).toThrow()
    })

    it('should save cohort with name and description', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.setCohort({
        ...cohortStore.currentCohort!,
        name: 'Test',
        entryEvents: [{ id: '1', criteriaType: 'ConditionOccurrence', attributes: [] }]
      })

      const { saveCohort } = useCohortBuilder()

      const result = saveCohort('Saved Cohort', 'My description')

      expect(result.name).toBe('Saved Cohort')
      expect(result.description).toBe('My description')
      expect(cohortStore.isDirty).toBe(false)
    })

    it('should collect concept sets from events', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.setCohort({
        ...cohortStore.currentCohort!,
        name: 'Test',
        entryEvents: [
          {
            id: '1',
            criteriaType: 'ConditionOccurrence',
            attributes: [],
            conceptSet: { id: 100, name: 'Concept Set 1' }
          },
          {
            id: '2',
            criteriaType: 'DrugExposure',
            attributes: [],
            conceptSet: { id: 200, name: 'Concept Set 2' }
          }
        ]
      })

      const { saveCohort } = useCohortBuilder()

      const result = saveCohort('Test', '')

      expect(result.conceptSets).toHaveLength(2)
    })
  })

  describe('cancelEditing', () => {
    it('should navigate to cohorts list when clean', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()

      const { cancelEditing } = useCohortBuilder()

      const result = cancelEditing()

      expect(result).toBe(true)
      expect(mockRouterPush).toHaveBeenCalledWith('/cohorts')
    })

    it('should show confirm dialog when dirty', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.markDirty()

      vi.stubGlobal('confirm', vi.fn(() => false))

      const { cancelEditing } = useCohortBuilder()

      const result = cancelEditing()

      expect(result).toBe(false)
      expect(confirm).toHaveBeenCalled()

      vi.unstubAllGlobals()
    })

    it('should navigate when confirmed', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()
      cohortStore.markDirty()

      vi.stubGlobal('confirm', vi.fn(() => true))

      const { cancelEditing } = useCohortBuilder()

      const result = cancelEditing()

      expect(result).toBe(true)
      expect(mockRouterPush).toHaveBeenCalledWith('/cohorts')

      vi.unstubAllGlobals()
    })
  })

  describe('updateCohortName', () => {
    it('should update cohort name', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()

      const { updateCohortName, currentCohort } = useCohortBuilder()

      updateCohortName('Updated Name')

      expect(currentCohort.value?.name).toBe('Updated Name')
      expect(cohortStore.isDirty).toBe(true)
    })

    it('should do nothing if no cohort', () => {
      const { updateCohortName } = useCohortBuilder()

      // Should not throw
      expect(() => updateCohortName('Test')).not.toThrow()
    })
  })

  describe('updateCohortDescription', () => {
    it('should update cohort description', () => {
      const cohortStore = useCohortStore()
      cohortStore.createNewCohort()

      const { updateCohortDescription, currentCohort } = useCohortBuilder()

      updateCohortDescription('Updated description')

      expect(currentCohort.value?.description).toBe('Updated description')
      expect(cohortStore.isDirty).toBe(true)
    })

    it('should do nothing if no cohort', () => {
      const { updateCohortDescription } = useCohortBuilder()

      // Should not throw
      expect(() => updateCohortDescription('Test')).not.toThrow()
    })
  })
})
