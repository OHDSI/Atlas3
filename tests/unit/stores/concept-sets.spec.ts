/**
 * Unit Tests: Concept Sets Store
 * Tests for src/stores/concept-sets.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptSetsStore } from '@/stores/concept-sets'

// Mock dependencies
vi.mock('@/services/concept-set.service', () => ({
  getAllConceptSets: vi.fn(),
  getConceptSetById: vi.fn(),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
}))

vi.mock('@/utils/api-mappers', () => ({
  conceptToConceptSetItem: vi.fn((concept) => ({
    conceptId: concept.conceptId,
    conceptName: concept.conceptName,
    domainId: concept.domainId,
    vocabularyId: concept.vocabularyId,
    conceptClassId: concept.conceptClassId,
    standardConcept: concept.standardConcept,
    conceptCode: concept.conceptCode,
    includeDescendants: false,
    includeMapped: false,
    isExcluded: false,
  })),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useConceptSetsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('starts with empty concept sets', () => {
      const store = useConceptSetsStore()
      expect(store.conceptSets).toEqual([])
    })

    it('starts with no current set', () => {
      const store = useConceptSetsStore()
      expect(store.currentSet).toBeNull()
    })

    it('starts not loading', () => {
      const store = useConceptSetsStore()
      expect(store.loading).toBe(false)
    })

    it('starts without errors', () => {
      const store = useConceptSetsStore()
      expect(store.error).toBeNull()
    })

    it('starts with empty filter', () => {
      const store = useConceptSetsStore()
      expect(store.filterTerm).toBe('')
    })

    it('starts with editor closed', () => {
      const store = useConceptSetsStore()
      expect(store.editorOpen).toBe(false)
    })
  })

  describe('getters', () => {
    describe('filteredSets', () => {
      it('returns all sets when no filter', () => {
        const store = useConceptSetsStore()
        store.conceptSets = [
          { id: 1, name: 'Set One' },
          { id: 2, name: 'Set Two' },
        ] as never[]

        expect(store.filteredSets).toHaveLength(2)
      })

      it('filters sets by name', () => {
        const store = useConceptSetsStore()
        store.conceptSets = [
          { id: 1, name: 'Diabetes Conditions' },
          { id: 2, name: 'Cancer Types' },
          { id: 3, name: 'Diabetes Medications' },
        ] as never[]
        store.filterTerm = 'diabetes'

        expect(store.filteredSets).toHaveLength(2)
        expect(store.filteredSets.map(s => s.id)).toEqual([1, 3])
      })

      it('filters case-insensitively', () => {
        const store = useConceptSetsStore()
        store.conceptSets = [
          { id: 1, name: 'TEST Set' },
          { id: 2, name: 'Other' },
        ] as never[]
        store.filterTerm = 'test'

        expect(store.filteredSets).toHaveLength(1)
      })
    })

    describe('isEmpty', () => {
      it('returns true when no concept sets', () => {
        const store = useConceptSetsStore()
        expect(store.isEmpty).toBe(true)
      })

      it('returns false when concept sets exist', () => {
        const store = useConceptSetsStore()
        store.conceptSets = [{ id: 1, name: 'Test' }] as never[]
        expect(store.isEmpty).toBe(false)
      })
    })
  })

  describe('actions', () => {
    describe('fetchAll', () => {
      it('fetches and stores concept sets', async () => {
        const { getAllConceptSets } = await import('@/services/concept-set.service')
        const mockSets = [
          { id: 1, name: 'Set 1' },
          { id: 2, name: 'Set 2' },
        ]
        vi.mocked(getAllConceptSets).mockResolvedValue(mockSets as never)

        const store = useConceptSetsStore()
        await store.fetchAll()

        expect(store.conceptSets).toEqual(mockSets)
        expect(store.loading).toBe(false)
        expect(store.error).toBeNull()
      })

      it('handles fetch errors', async () => {
        const { getAllConceptSets } = await import('@/services/concept-set.service')
        vi.mocked(getAllConceptSets).mockRejectedValue(new Error('Network error'))

        const store = useConceptSetsStore()
        await store.fetchAll()

        expect(store.conceptSets).toEqual([])
        expect(store.error).toBe('Network error')
      })

      it('prevents concurrent fetches', async () => {
        const { getAllConceptSets } = await import('@/services/concept-set.service')
        let resolvePromise: (value: never[]) => void
        vi.mocked(getAllConceptSets).mockImplementation(
          () => new Promise<never[]>(resolve => {
            resolvePromise = resolve
          })
        )

        const store = useConceptSetsStore()
        const fetch1 = store.fetchAll()
        const fetch2 = store.fetchAll() // Should be ignored since loading is true

        // Resolve the first fetch
        resolvePromise!([] as never[])
        await Promise.all([fetch1, fetch2])

        expect(getAllConceptSets).toHaveBeenCalledTimes(1)
      })
    })

    describe('fetchOne', () => {
      it('fetches and stores a single concept set', async () => {
        const { getConceptSetById } = await import('@/services/concept-set.service')
        const mockSet = { id: 1, name: 'Test Set', items: [] }
        vi.mocked(getConceptSetById).mockResolvedValue(mockSet as never)

        const store = useConceptSetsStore()
        await store.fetchOne(1)

        expect(store.currentSet).toEqual(mockSet)
        expect(getConceptSetById).toHaveBeenCalledWith(1)
      })

      it('sets error when set not found', async () => {
        const { getConceptSetById } = await import('@/services/concept-set.service')
        vi.mocked(getConceptSetById).mockResolvedValue(null)

        const store = useConceptSetsStore()
        await store.fetchOne(999)

        expect(store.error).toBe('Concept set not found')
        expect(store.currentSet).toBeNull()
      })

      it('handles fetch errors', async () => {
        const { getConceptSetById } = await import('@/services/concept-set.service')
        vi.mocked(getConceptSetById).mockRejectedValue(new Error('Fetch failed'))

        const store = useConceptSetsStore()
        await store.fetchOne(1)

        expect(store.error).toBe('Fetch failed')
        expect(store.currentSet).toBeNull()
      })
    })

    describe('create', () => {
      it('creates a new concept set', async () => {
        const { createConceptSet, getAllConceptSets } = await import('@/services/concept-set.service')
        const newSet = { name: 'New Set', items: [] }
        const createdSet = { id: 1, ...newSet }
        vi.mocked(createConceptSet).mockResolvedValue(createdSet as never)
        vi.mocked(getAllConceptSets).mockResolvedValue([createdSet] as never)

        const store = useConceptSetsStore()
        const result = await store.create(newSet as never)

        expect(result).toEqual(createdSet)
        expect(store.currentSet).toEqual(createdSet)
        expect(createConceptSet).toHaveBeenCalledWith(newSet)
      })

      it('returns null on create failure', async () => {
        const { createConceptSet } = await import('@/services/concept-set.service')
        vi.mocked(createConceptSet).mockResolvedValue(null)

        const store = useConceptSetsStore()
        const result = await store.create({ name: 'Test', items: [] } as never)

        expect(result).toBeNull()
        expect(store.error).toBe('Failed to create concept set')
      })

      it('handles create errors', async () => {
        const { createConceptSet } = await import('@/services/concept-set.service')
        vi.mocked(createConceptSet).mockRejectedValue(new Error('Create failed'))

        const store = useConceptSetsStore()
        const result = await store.create({ name: 'Test', items: [] } as never)

        expect(result).toBeNull()
        expect(store.error).toBe('Create failed')
      })
    })

    describe('update', () => {
      it('updates an existing concept set', async () => {
        const { updateConceptSet, getAllConceptSets } = await import('@/services/concept-set.service')
        const updatedSet = { id: 1, name: 'Updated Set', items: [] }
        vi.mocked(updateConceptSet).mockResolvedValue(updatedSet as never)
        vi.mocked(getAllConceptSets).mockResolvedValue([updatedSet] as never)

        const store = useConceptSetsStore()
        const result = await store.update(updatedSet as never)

        expect(result).toEqual(updatedSet)
        expect(store.currentSet).toEqual(updatedSet)
      })

      it('returns null on update failure', async () => {
        const { updateConceptSet } = await import('@/services/concept-set.service')
        vi.mocked(updateConceptSet).mockResolvedValue(null)

        const store = useConceptSetsStore()
        const result = await store.update({ id: 1, name: 'Test' } as never)

        expect(result).toBeNull()
        expect(store.error).toBe('Failed to update concept set')
      })
    })

    describe('remove', () => {
      it('deletes a concept set', async () => {
        const { deleteConceptSet } = await import('@/services/concept-set.service')
        vi.mocked(deleteConceptSet).mockResolvedValue(true)

        const store = useConceptSetsStore()
        store.conceptSets = [
          { id: 1, name: 'Set 1' },
          { id: 2, name: 'Set 2' },
        ] as never[]

        const result = await store.remove(1)

        expect(result).toBe(true)
        expect(store.conceptSets).toHaveLength(1)
        expect(store.conceptSets[0].id).toBe(2)
      })

      it('clears currentSet if deleted', async () => {
        const { deleteConceptSet } = await import('@/services/concept-set.service')
        vi.mocked(deleteConceptSet).mockResolvedValue(true)

        const store = useConceptSetsStore()
        store.conceptSets = [{ id: 1, name: 'Set 1' }] as never[]
        store.currentSet = { id: 1, name: 'Set 1', items: [] } as never

        await store.remove(1)

        expect(store.currentSet).toBeNull()
      })

      it('returns false on delete failure', async () => {
        const { deleteConceptSet } = await import('@/services/concept-set.service')
        vi.mocked(deleteConceptSet).mockResolvedValue(false)

        const store = useConceptSetsStore()
        const result = await store.remove(1)

        expect(result).toBe(false)
        expect(store.error).toBe('Failed to delete concept set')
      })
    })

    describe('setFilter', () => {
      it('sets filter term with debounce', async () => {
        const store = useConceptSetsStore()

        store.setFilter('test')

        // Filter shouldn't be set immediately
        expect(store.filterTerm).toBe('')

        // Advance timers
        vi.advanceTimersByTime(300)

        expect(store.filterTerm).toBe('test')
      })

      it('debounces multiple rapid calls', () => {
        const store = useConceptSetsStore()

        store.setFilter('a')
        vi.advanceTimersByTime(100)
        store.setFilter('ab')
        vi.advanceTimersByTime(100)
        store.setFilter('abc')
        vi.advanceTimersByTime(300)

        expect(store.filterTerm).toBe('abc')
      })
    })

    describe('openCreateEditor', () => {
      it('opens editor with empty concept set', () => {
        const store = useConceptSetsStore()
        store.openCreateEditor()

        expect(store.editorOpen).toBe(true)
        expect(store.currentSet).toEqual({ name: '', items: [] })
      })
    })

    describe('openEditEditor', () => {
      it('fetches concept set and opens editor', async () => {
        const { getConceptSetById } = await import('@/services/concept-set.service')
        const mockSet = { id: 1, name: 'Test', items: [] }
        vi.mocked(getConceptSetById).mockResolvedValue(mockSet as never)

        const store = useConceptSetsStore()
        await store.openEditEditor(1)

        expect(store.currentSet).toEqual(mockSet)
        expect(store.editorOpen).toBe(true)
      })
    })

    describe('closeEditor', () => {
      it('closes editor and clears state', () => {
        const store = useConceptSetsStore()
        store.editorOpen = true
        store.currentSet = { id: 1, name: 'Test', items: [] } as never
        store.error = 'Some error'

        store.closeEditor()

        expect(store.editorOpen).toBe(false)
        expect(store.currentSet).toBeNull()
        expect(store.error).toBeNull()
      })
    })

    describe('clearError', () => {
      it('clears error message', () => {
        const store = useConceptSetsStore()
        store.error = 'Some error'

        store.clearError()

        expect(store.error).toBeNull()
      })
    })

    describe('addConceptToSet', () => {
      it('adds concept to current set', () => {
        const store = useConceptSetsStore()
        store.currentSet = { id: 1, name: 'Test', items: [] } as never

        const concept = {
          conceptId: 123,
          conceptName: 'Test Concept',
          domainId: 'Condition',
          vocabularyId: 'SNOMED',
          conceptClassId: 'Clinical Finding',
          standardConcept: 'S',
          conceptCode: '12345',
        }

        store.addConceptToSet(concept as never)

        expect(store.currentSet!.items).toHaveLength(1)
        expect(store.currentSet!.items[0].conceptId).toBe(123)
      })

      it('prevents duplicate concepts', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          id: 1,
          name: 'Test',
          items: [{ conceptId: 123, conceptName: 'Existing' }],
        } as never

        store.addConceptToSet({ conceptId: 123 } as never)

        expect(store.currentSet!.items).toHaveLength(1)
        expect(store.error).toBe('Concept already exists in this set')
      })

      it('sets error when no current set', () => {
        const store = useConceptSetsStore()
        store.addConceptToSet({ conceptId: 123 } as never)

        expect(store.error).toBe('No concept set selected')
      })
    })

    describe('removeConceptFromSet', () => {
      it('removes concept from current set', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          id: 1,
          name: 'Test',
          items: [
            { conceptId: 123 },
            { conceptId: 456 },
          ],
        } as never

        store.removeConceptFromSet(123)

        expect(store.currentSet!.items).toHaveLength(1)
        expect(store.currentSet!.items[0].conceptId).toBe(456)
      })

      it('sets error when no current set', () => {
        const store = useConceptSetsStore()
        store.removeConceptFromSet(123)

        expect(store.error).toBe('No concept set selected')
      })
    })

    describe('toggleConceptFlag', () => {
      it('toggles includeDescendants flag', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          id: 1,
          name: 'Test',
          items: [{ conceptId: 123, includeDescendants: false }],
        } as never

        store.toggleConceptFlag(123, 'includeDescendants')

        expect(store.currentSet!.items[0].includeDescendants).toBe(true)
      })

      it('toggles includeMapped flag', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          id: 1,
          name: 'Test',
          items: [{ conceptId: 123, includeMapped: false }],
        } as never

        store.toggleConceptFlag(123, 'includeMapped')

        expect(store.currentSet!.items[0].includeMapped).toBe(true)
      })

      it('toggles isExcluded flag', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          id: 1,
          name: 'Test',
          items: [{ conceptId: 123, isExcluded: false }],
        } as never

        store.toggleConceptFlag(123, 'isExcluded')

        expect(store.currentSet!.items[0].isExcluded).toBe(true)
      })

      it('sets error when no current set', () => {
        const store = useConceptSetsStore()
        store.toggleConceptFlag(123, 'includeDescendants')

        expect(store.error).toBe('No concept set selected')
      })
    })

    describe('isConceptInSet', () => {
      it('returns true when concept is in set', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          id: 1,
          name: 'Test',
          items: [{ conceptId: 123 }],
        } as never

        expect(store.isConceptInSet(123)).toBe(true)
      })

      it('returns false when concept is not in set', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          id: 1,
          name: 'Test',
          items: [{ conceptId: 123 }],
        } as never

        expect(store.isConceptInSet(456)).toBe(false)
      })

      it('returns false when no current set', () => {
        const store = useConceptSetsStore()
        expect(store.isConceptInSet(123)).toBe(false)
      })
    })
  })
})
