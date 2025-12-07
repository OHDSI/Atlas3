/**
 * Concept Sets Store Tests
 * Tests for concept set CRUD operations and building actions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSet, ConceptSetListItem, Concept, ConceptSetItem } from '@/models/concept-set.types'

// Mock dependencies
vi.mock('@/services/concept-set.service', () => ({
  getAllConceptSets: vi.fn(),
  getConceptSetById: vi.fn(),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
}))

vi.mock('@/utils/api-mappers', () => ({
  conceptToConceptSetItem: vi.fn((concept: Concept): ConceptSetItem => ({
    conceptId: concept.conceptId,
    conceptName: concept.conceptName,
    conceptCode: concept.conceptCode,
    domainId: concept.domainId,
    vocabularyId: concept.vocabularyId,
    conceptClassId: concept.conceptClassId,
    standardConcept: concept.standardConcept,
    invalidReason: concept.invalidReason,
    isExcluded: false,
    includeDescendants: false,
    includeMapped: false,
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

import {
  getAllConceptSets,
  getConceptSetById,
  createConceptSet,
  updateConceptSet,
  deleteConceptSet,
} from '@/services/concept-set.service'

const mockConceptSetList: ConceptSetListItem[] = [
  { id: 1, name: 'Diabetes Conditions' },
  { id: 2, name: 'Heart Medications' },
  { id: 3, name: 'Lab Tests' },
]

const mockConceptSet: ConceptSet = {
  id: 1,
  name: 'Diabetes Conditions',
  items: [
    {
      conceptId: 201826,
      conceptName: 'Type 2 diabetes mellitus',
      conceptCode: '44054006',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      invalidReason: null,
      isExcluded: false,
      includeDescendants: true,
      includeMapped: false,
    },
  ],
}

const mockConcept: Concept = {
  conceptId: 12345,
  conceptName: 'Test Concept',
  conceptCode: '12345',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

describe('Concept Sets Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have empty concept sets initially', () => {
      const store = useConceptSetsStore()
      expect(store.conceptSets).toEqual([])
    })

    it('should have null current set initially', () => {
      const store = useConceptSetsStore()
      expect(store.currentSet).toBeNull()
    })

    it('should not be loading initially', () => {
      const store = useConceptSetsStore()
      expect(store.loading).toBe(false)
    })

    it('should have no error initially', () => {
      const store = useConceptSetsStore()
      expect(store.error).toBeNull()
    })

    it('should have empty filter term initially', () => {
      const store = useConceptSetsStore()
      expect(store.filterTerm).toBe('')
    })

    it('should not have editor open initially', () => {
      const store = useConceptSetsStore()
      expect(store.editorOpen).toBe(false)
    })
  })

  describe('Getters', () => {
    it('filteredSets should return all sets when no filter', () => {
      const store = useConceptSetsStore()
      store.conceptSets = mockConceptSetList
      expect(store.filteredSets).toEqual(mockConceptSetList)
    })

    it('filteredSets should filter by name', () => {
      const store = useConceptSetsStore()
      store.conceptSets = mockConceptSetList
      store.filterTerm = 'diabetes'
      expect(store.filteredSets).toEqual([mockConceptSetList[0]])
    })

    it('filteredSets should be case-insensitive', () => {
      const store = useConceptSetsStore()
      store.conceptSets = mockConceptSetList
      store.filterTerm = 'DIABETES'
      expect(store.filteredSets).toEqual([mockConceptSetList[0]])
    })

    it('isEmpty should return true when no concept sets', () => {
      const store = useConceptSetsStore()
      expect(store.isEmpty).toBe(true)
    })

    it('isEmpty should return false when concept sets exist', () => {
      const store = useConceptSetsStore()
      store.conceptSets = mockConceptSetList
      expect(store.isEmpty).toBe(false)
    })
  })

  describe('fetchAll Action', () => {
    it('should fetch and store concept sets', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getAllConceptSets).mockResolvedValue(mockConceptSetList)

      await store.fetchAll()

      expect(store.conceptSets).toEqual(mockConceptSetList)
      expect(store.loading).toBe(false)
    })

    it('should set loading state while fetching', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getAllConceptSets).mockImplementation(() => new Promise(() => {}))

      const _promise = store.fetchAll()
      expect(store.loading).toBe(true)
    })

    it('should handle fetch error', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getAllConceptSets).mockRejectedValue(new Error('Network error'))

      await store.fetchAll()

      expect(store.error).toBe('Network error')
      expect(store.conceptSets).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('should not fetch if already loading', async () => {
      const store = useConceptSetsStore()
      store.loading = true

      await store.fetchAll()

      expect(getAllConceptSets).not.toHaveBeenCalled()
    })
  })

  describe('fetchOne Action', () => {
    it('should fetch and store a single concept set', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getConceptSetById).mockResolvedValue(mockConceptSet)

      await store.fetchOne(1)

      expect(store.currentSet).toEqual(mockConceptSet)
      expect(store.loading).toBe(false)
    })

    it('should handle not found', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getConceptSetById).mockResolvedValue(null)

      await store.fetchOne(999)

      expect(store.error).toBe('Concept set not found')
    })

    it('should handle fetch error', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getConceptSetById).mockRejectedValue(new Error('Network error'))

      await store.fetchOne(1)

      expect(store.error).toBe('Network error')
      expect(store.currentSet).toBeNull()
    })
  })

  describe('create Action', () => {
    it('should create a concept set', async () => {
      const store = useConceptSetsStore()
      const newSet = { name: 'New Set', items: [] }
      vi.mocked(createConceptSet).mockResolvedValue({ ...newSet, id: 4 } as ConceptSet)
      vi.mocked(getAllConceptSets).mockResolvedValue([...mockConceptSetList, { id: 4, name: 'New Set' }])

      const result = await store.create(newSet)

      expect(result).toEqual({ ...newSet, id: 4 })
      expect(store.currentSet).toEqual({ ...newSet, id: 4 })
    })

    it('should handle create failure', async () => {
      const store = useConceptSetsStore()
      vi.mocked(createConceptSet).mockResolvedValue(null)

      const result = await store.create({ name: 'New Set', items: [] })

      expect(result).toBeNull()
      expect(store.error).toBe('Failed to create concept set')
    })

    it('should handle create error', async () => {
      const store = useConceptSetsStore()
      vi.mocked(createConceptSet).mockRejectedValue(new Error('Server error'))

      const result = await store.create({ name: 'New Set', items: [] })

      expect(result).toBeNull()
      expect(store.error).toBe('Server error')
    })
  })

  describe('update Action', () => {
    it('should update a concept set', async () => {
      const store = useConceptSetsStore()
      const updatedSet = { ...mockConceptSet, name: 'Updated Name' }
      vi.mocked(updateConceptSet).mockResolvedValue(updatedSet)
      vi.mocked(getAllConceptSets).mockResolvedValue(mockConceptSetList)

      const result = await store.update(updatedSet)

      expect(result).toEqual(updatedSet)
      expect(store.currentSet).toEqual(updatedSet)
    })

    it('should handle update failure', async () => {
      const store = useConceptSetsStore()
      vi.mocked(updateConceptSet).mockResolvedValue(null)

      const result = await store.update(mockConceptSet)

      expect(result).toBeNull()
      expect(store.error).toBe('Failed to update concept set')
    })

    it('should handle update error', async () => {
      const store = useConceptSetsStore()
      vi.mocked(updateConceptSet).mockRejectedValue(new Error('Server error'))

      const result = await store.update(mockConceptSet)

      expect(result).toBeNull()
      expect(store.error).toBe('Server error')
    })
  })

  describe('remove Action', () => {
    it('should delete a concept set', async () => {
      const store = useConceptSetsStore()
      store.conceptSets = [...mockConceptSetList]
      vi.mocked(deleteConceptSet).mockResolvedValue(true)

      const result = await store.remove(1)

      expect(result).toBe(true)
      expect(store.conceptSets.find(s => s.id === 1)).toBeUndefined()
    })

    it('should clear current set if deleted', async () => {
      const store = useConceptSetsStore()
      store.conceptSets = [...mockConceptSetList]
      store.currentSet = { ...mockConceptSet }
      vi.mocked(deleteConceptSet).mockResolvedValue(true)

      await store.remove(1)

      expect(store.currentSet).toBeNull()
    })

    it('should handle delete failure', async () => {
      const store = useConceptSetsStore()
      vi.mocked(deleteConceptSet).mockResolvedValue(false)

      const result = await store.remove(1)

      expect(result).toBe(false)
      expect(store.error).toBe('Failed to delete concept set')
    })

    it('should handle delete error', async () => {
      const store = useConceptSetsStore()
      vi.mocked(deleteConceptSet).mockRejectedValue(new Error('Server error'))

      const result = await store.remove(1)

      expect(result).toBe(false)
      expect(store.error).toBe('Server error')
    })
  })

  describe('setFilter Action', () => {
    it('should update filter term after debounce', async () => {
      vi.useFakeTimers()
      const store = useConceptSetsStore()

      store.setFilter('test')
      expect(store.filterTerm).toBe('') // Not yet updated due to debounce

      vi.advanceTimersByTime(300)
      expect(store.filterTerm).toBe('test')

      vi.useRealTimers()
    })
  })

  describe('Editor Actions', () => {
    it('openCreateEditor should set up new concept set', () => {
      const store = useConceptSetsStore()
      store.openCreateEditor()

      expect(store.currentSet).toEqual({ name: '', items: [] })
      expect(store.editorOpen).toBe(true)
    })

    it('openEditEditor should fetch and open editor', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getConceptSetById).mockResolvedValue(mockConceptSet)

      await store.openEditEditor(1)

      expect(store.currentSet).toEqual(mockConceptSet)
      expect(store.editorOpen).toBe(true)
    })

    it('closeEditor should clear state', () => {
      const store = useConceptSetsStore()
      store.currentSet = mockConceptSet
      store.editorOpen = true
      store.error = 'Some error'

      store.closeEditor()

      expect(store.editorOpen).toBe(false)
      expect(store.currentSet).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('clearError Action', () => {
    it('should clear error', () => {
      const store = useConceptSetsStore()
      store.error = 'Some error'

      store.clearError()

      expect(store.error).toBeNull()
    })
  })

  describe('Concept Set Building Actions', () => {
    describe('addConceptToSet', () => {
      it('should add concept to current set', () => {
        const store = useConceptSetsStore()
        store.currentSet = { name: 'Test', items: [] }

        store.addConceptToSet(mockConcept)

        expect(store.currentSet.items).toHaveLength(1)
        expect(store.currentSet.items[0].conceptId).toBe(mockConcept.conceptId)
      })

      it('should set error if no current set', () => {
        const store = useConceptSetsStore()

        store.addConceptToSet(mockConcept)

        expect(store.error).toBe('No concept set selected')
      })

      it('should set error if concept already exists', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          name: 'Test',
          items: [{
            conceptId: mockConcept.conceptId,
            conceptName: mockConcept.conceptName,
            conceptCode: mockConcept.conceptCode,
            domainId: mockConcept.domainId,
            vocabularyId: mockConcept.vocabularyId,
            conceptClassId: mockConcept.conceptClassId,
            standardConcept: mockConcept.standardConcept,
            invalidReason: mockConcept.invalidReason,
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false,
          }],
        }

        store.addConceptToSet(mockConcept)

        expect(store.error).toBe('Concept already exists in this set')
      })

      it('should clear error on successful add', () => {
        const store = useConceptSetsStore()
        store.currentSet = { name: 'Test', items: [] }
        store.error = 'Previous error'

        store.addConceptToSet(mockConcept)

        expect(store.error).toBeNull()
      })
    })

    describe('removeConceptFromSet', () => {
      it('should remove concept from current set', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          name: 'Test',
          items: [{
            conceptId: 12345,
            conceptName: 'Test',
            conceptCode: '12345',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            conceptClassId: 'Clinical Finding',
            standardConcept: 'S',
            invalidReason: null,
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false,
          }],
        }

        store.removeConceptFromSet(12345)

        expect(store.currentSet.items).toHaveLength(0)
      })

      it('should set error if no current set', () => {
        const store = useConceptSetsStore()

        store.removeConceptFromSet(12345)

        expect(store.error).toBe('No concept set selected')
      })
    })

    describe('toggleConceptFlag', () => {
      it('should toggle includeDescendants flag', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          name: 'Test',
          items: [{
            conceptId: 12345,
            conceptName: 'Test',
            conceptCode: '12345',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            conceptClassId: 'Clinical Finding',
            standardConcept: 'S',
            invalidReason: null,
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false,
          }],
        }

        store.toggleConceptFlag(12345, 'includeDescendants')

        expect(store.currentSet.items[0].includeDescendants).toBe(true)
      })

      it('should toggle includeMapped flag', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          name: 'Test',
          items: [{
            conceptId: 12345,
            conceptName: 'Test',
            conceptCode: '12345',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            conceptClassId: 'Clinical Finding',
            standardConcept: 'S',
            invalidReason: null,
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false,
          }],
        }

        store.toggleConceptFlag(12345, 'includeMapped')

        expect(store.currentSet.items[0].includeMapped).toBe(true)
      })

      it('should toggle isExcluded flag', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          name: 'Test',
          items: [{
            conceptId: 12345,
            conceptName: 'Test',
            conceptCode: '12345',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            conceptClassId: 'Clinical Finding',
            standardConcept: 'S',
            invalidReason: null,
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false,
          }],
        }

        store.toggleConceptFlag(12345, 'isExcluded')

        expect(store.currentSet.items[0].isExcluded).toBe(true)
      })

      it('should set error if no current set', () => {
        const store = useConceptSetsStore()

        store.toggleConceptFlag(12345, 'includeDescendants')

        expect(store.error).toBe('No concept set selected')
      })

      it('should do nothing if concept not found', () => {
        const store = useConceptSetsStore()
        store.currentSet = { name: 'Test', items: [] }

        store.toggleConceptFlag(99999, 'includeDescendants')

        // No error, no change
        expect(store.currentSet.items).toHaveLength(0)
      })
    })

    describe('isConceptInSet', () => {
      it('should return true if concept is in set', () => {
        const store = useConceptSetsStore()
        store.currentSet = {
          name: 'Test',
          items: [{
            conceptId: 12345,
            conceptName: 'Test',
            conceptCode: '12345',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            conceptClassId: 'Clinical Finding',
            standardConcept: 'S',
            invalidReason: null,
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false,
          }],
        }

        expect(store.isConceptInSet(12345)).toBe(true)
      })

      it('should return false if concept is not in set', () => {
        const store = useConceptSetsStore()
        store.currentSet = { name: 'Test', items: [] }

        expect(store.isConceptInSet(12345)).toBe(false)
      })

      it('should return false if no current set', () => {
        const store = useConceptSetsStore()

        expect(store.isConceptInSet(12345)).toBe(false)
      })
    })
  })
})
