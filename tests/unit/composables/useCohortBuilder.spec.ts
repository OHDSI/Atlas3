/**
 * Unit Tests: useCohortBuilder Composable
 * Tests for src/composables/useCohortBuilder.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock vue-router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock cohort store
const mockCohortStore = {
  currentCohort: null as Record<string, unknown> | null,
  isDirty: false,
  entryEventCount: 0,
  createNewCohort: vi.fn(),
  addEntryEvent: vi.fn(),
  removeEntryEvent: vi.fn(),
  updateEntryEvent: vi.fn(),
  setCohort: vi.fn(),
  markClean: vi.fn(),
  markDirty: vi.fn(),
  clearCohort: vi.fn(),
}

vi.mock('@/stores/cohort', () => ({
  useCohortStore: () => mockCohortStore,
}))

// Import after mocks
import { useCohortBuilder } from '@/composables/useCohortBuilder'

describe('useCohortBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCohortStore.currentCohort = null
    mockCohortStore.isDirty = false
    mockCohortStore.entryEventCount = 0
  })

  describe('computed properties', () => {
    it('returns currentCohort from store', () => {
      mockCohortStore.currentCohort = { name: 'Test Cohort', entryEvents: [] }
      const { currentCohort } = useCohortBuilder()
      expect(currentCohort.value).toEqual({ name: 'Test Cohort', entryEvents: [] })
    })

    it('returns isDirty from store', () => {
      mockCohortStore.isDirty = true
      const { isDirty } = useCohortBuilder()
      expect(isDirty.value).toBe(true)
    })

    it('canSave returns false when no cohort', () => {
      mockCohortStore.currentCohort = null
      const { canSave } = useCohortBuilder()
      expect(canSave.value).toBe(false)
    })

    it('canSave returns false when name is empty', () => {
      mockCohortStore.currentCohort = { name: '  ', entryEvents: [] }
      mockCohortStore.entryEventCount = 1
      const { canSave } = useCohortBuilder()
      expect(canSave.value).toBe(false)
    })

    it('canSave returns false when no entry events', () => {
      mockCohortStore.currentCohort = { name: 'Test', entryEvents: [] }
      mockCohortStore.entryEventCount = 0
      const { canSave } = useCohortBuilder()
      expect(canSave.value).toBe(false)
    })

    it('canSave returns true when has name and events', () => {
      mockCohortStore.currentCohort = { name: 'Test', entryEvents: [{}] }
      mockCohortStore.entryEventCount = 1
      const { canSave } = useCohortBuilder()
      expect(canSave.value).toBe(true)
    })
  })

  describe('createNewCohort', () => {
    it('calls store createNewCohort', () => {
      const { createNewCohort } = useCohortBuilder()
      createNewCohort()
      expect(mockCohortStore.createNewCohort).toHaveBeenCalled()
    })
  })

  describe('loadCohort', () => {
    it('creates new cohort if none exists', () => {
      mockCohortStore.currentCohort = null
      const { loadCohort } = useCohortBuilder()
      loadCohort(1)
      expect(mockCohortStore.createNewCohort).toHaveBeenCalled()
    })

    it('does not create cohort if one exists', () => {
      mockCohortStore.currentCohort = { name: 'Existing' }
      const { loadCohort } = useCohortBuilder()
      loadCohort(1)
      expect(mockCohortStore.createNewCohort).not.toHaveBeenCalled()
    })
  })

  describe('addEntryEvent', () => {
    it('adds entry event with default criteria type', () => {
      const { addEntryEvent } = useCohortBuilder()
      const eventId = addEntryEvent()

      expect(mockCohortStore.addEntryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          criteriaType: 'ConditionOccurrence',
          attributes: [],
        })
      )
      expect(eventId).toBeDefined()
    })

    it('adds entry event with specified criteria type', () => {
      const { addEntryEvent } = useCohortBuilder()
      addEntryEvent('DrugExposure')

      expect(mockCohortStore.addEntryEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          criteriaType: 'DrugExposure',
        })
      )
    })

    it('returns the event id', () => {
      const { addEntryEvent } = useCohortBuilder()
      const eventId = addEntryEvent()
      expect(typeof eventId).toBe('string')
      expect(eventId.length).toBeGreaterThan(0)
    })
  })

  describe('removeEntryEvent', () => {
    it('calls store removeEntryEvent', () => {
      const { removeEntryEvent } = useCohortBuilder()
      removeEntryEvent('event-123')
      expect(mockCohortStore.removeEntryEvent).toHaveBeenCalledWith('event-123')
    })
  })

  describe('updateEntryEvent', () => {
    it('calls store updateEntryEvent', () => {
      const { updateEntryEvent } = useCohortBuilder()
      const updatedEvent = { id: 'event-123', criteriaType: 'DrugExposure', attributes: [] }
      updateEntryEvent('event-123', updatedEvent as unknown as Parameters<typeof updateEntryEvent>[1])
      expect(mockCohortStore.updateEntryEvent).toHaveBeenCalledWith('event-123', updatedEvent)
    })
  })

  describe('saveCohort', () => {
    it('throws error when canSave is false', () => {
      mockCohortStore.currentCohort = null
      const { saveCohort } = useCohortBuilder()
      expect(() => saveCohort('Test')).toThrow('Cannot save')
    })

    it('throws error when no current cohort', () => {
      mockCohortStore.currentCohort = { name: 'Test' }
      mockCohortStore.entryEventCount = 1
      // Now set it to null to simulate edge case
      mockCohortStore.currentCohort = null
      const { saveCohort } = useCohortBuilder()
      expect(() => saveCohort('Test')).toThrow()
    })

    it('saves cohort with name and description', () => {
      mockCohortStore.currentCohort = {
        name: 'Old Name',
        entryEvents: [{ id: '1', conceptSet: { id: 1, name: 'CS1' } }],
      }
      mockCohortStore.entryEventCount = 1

      const { saveCohort } = useCohortBuilder()
      const result = saveCohort('New Name', 'Description')

      expect(mockCohortStore.setCohort).toHaveBeenCalled()
      expect(mockCohortStore.markClean).toHaveBeenCalled()
      expect(result.name).toBe('New Name')
      expect(result.description).toBe('Description')
    })

    it('gathers concept sets from events', () => {
      mockCohortStore.currentCohort = {
        name: 'Test',
        entryEvents: [
          { id: '1', conceptSet: { id: 1, name: 'CS1' } },
          { id: '2', conceptSet: { id: 2, name: 'CS2' } },
          { id: '3' }, // No concept set
        ],
      }
      mockCohortStore.entryEventCount = 3

      const { saveCohort } = useCohortBuilder()
      const result = saveCohort('Test', 'Desc')

      expect(result.conceptSets).toHaveLength(2)
    })
  })

  describe('cancelEditing', () => {
    it('clears cohort and navigates when not dirty', () => {
      mockCohortStore.isDirty = false
      const { cancelEditing } = useCohortBuilder()
      const result = cancelEditing()

      expect(mockCohortStore.clearCohort).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/cohorts')
      expect(result).toBe(true)
    })

    it('prompts confirmation when dirty and confirmed', () => {
      mockCohortStore.isDirty = true
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      const { cancelEditing } = useCohortBuilder()
      const result = cancelEditing()

      expect(window.confirm).toHaveBeenCalled()
      expect(mockCohortStore.clearCohort).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('returns false when dirty and not confirmed', () => {
      mockCohortStore.isDirty = true
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      const { cancelEditing } = useCohortBuilder()
      const result = cancelEditing()

      expect(mockCohortStore.clearCohort).not.toHaveBeenCalled()
      expect(result).toBe(false)
    })
  })

  describe('updateCohortName', () => {
    it('updates name when cohort exists', () => {
      mockCohortStore.currentCohort = { name: 'Old', entryEvents: [] }
      const { updateCohortName } = useCohortBuilder()
      updateCohortName('New Name')

      expect(mockCohortStore.setCohort).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Name' })
      )
      expect(mockCohortStore.markDirty).toHaveBeenCalled()
    })

    it('does nothing when no cohort', () => {
      mockCohortStore.currentCohort = null
      const { updateCohortName } = useCohortBuilder()
      updateCohortName('New Name')

      expect(mockCohortStore.setCohort).not.toHaveBeenCalled()
    })
  })

  describe('updateCohortDescription', () => {
    it('updates description when cohort exists', () => {
      mockCohortStore.currentCohort = { name: 'Test', description: 'Old', entryEvents: [] }
      const { updateCohortDescription } = useCohortBuilder()
      updateCohortDescription('New Description')

      expect(mockCohortStore.setCohort).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'New Description' })
      )
      expect(mockCohortStore.markDirty).toHaveBeenCalled()
    })

    it('does nothing when no cohort', () => {
      mockCohortStore.currentCohort = null
      const { updateCohortDescription } = useCohortBuilder()
      updateCohortDescription('New Description')

      expect(mockCohortStore.setCohort).not.toHaveBeenCalled()
    })
  })
})
