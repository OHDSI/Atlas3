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

vi.mock('@/services/concept-search.service', () => ({
  getRecommendedConcepts: vi.fn(),
  getConceptRecordCounts: vi.fn(),
  compareConceptSets: vi.fn(),
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
  conceptSetItemToExpressionItem: vi.fn((item: ConceptSetItem) => ({
    concept: {
      CONCEPT_ID: item.conceptId,
      CONCEPT_NAME: item.conceptName,
      CONCEPT_CODE: item.conceptCode,
      DOMAIN_ID: item.domainId,
      VOCABULARY_ID: item.vocabularyId,
      CONCEPT_CLASS_ID: item.conceptClassId,
      STANDARD_CONCEPT: item.standardConcept,
      INVALID_REASON: item.invalidReason,
    },
    isExcluded: item.isExcluded,
    includeDescendants: item.includeDescendants,
    includeMapped: item.includeMapped,
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
import {
  getRecommendedConcepts,
  getConceptRecordCounts,
  compareConceptSets,
} from '@/services/concept-search.service'
import type { ComparisonResultItem } from '@/models/concept-set.types'

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

  describe('Recommended Concepts', () => {
    function makeItem(conceptId: number, isExcluded = false): ConceptSetItem {
      return {
        conceptId,
        conceptName: `Concept ${conceptId}`,
        conceptCode: `${conceptId}`,
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
        isExcluded,
        includeDescendants: false,
        includeMapped: false,
      }
    }

    function makeRecommended(conceptId: number): Concept {
      return {
        conceptId,
        conceptName: `Recommended ${conceptId}`,
        conceptCode: `${conceptId}`,
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
      }
    }

    it('should have correct initial recommended state', () => {
      const store = useConceptSetsStore()
      expect(store.recommendedConcepts).toEqual([])
      expect(store.loadingRecommended).toBe(false)
      expect(store.isRecommendedAvailable).toBe(true)
      expect(store.recommendedError).toBeNull()
    })

    it('should not call service if no current set', async () => {
      const store = useConceptSetsStore()

      await store.loadRecommendedConcepts('TEST')

      expect(getRecommendedConcepts).not.toHaveBeenCalled()
      expect(store.recommendedConcepts).toEqual([])
      expect(store.isRecommendedAvailable).toBe(true)
      expect(store.recommendedError).toBeNull()
    })

    it('should not call service if current set has no items', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { name: 'Empty', items: [] }

      await store.loadRecommendedConcepts('TEST')

      expect(getRecommendedConcepts).not.toHaveBeenCalled()
      expect(store.recommendedConcepts).toEqual([])
    })

    it('should not call service if all items are excluded', async () => {
      const store = useConceptSetsStore()
      store.currentSet = {
        name: 'AllExcluded',
        items: [makeItem(1, true), makeItem(2, true)],
      }

      await store.loadRecommendedConcepts('TEST')

      expect(getRecommendedConcepts).not.toHaveBeenCalled()
      expect(store.recommendedConcepts).toEqual([])
    })

    it('should filter out concepts already in the set, enrich with record counts, and set recommendedConcepts', async () => {
      const store = useConceptSetsStore()
      store.currentSet = {
        name: 'Test',
        items: [makeItem(1), makeItem(2, true), makeItem(3)],
      }

      const recommended = [
        makeRecommended(2), // already in set (even if excluded)
        makeRecommended(10),
        makeRecommended(11),
      ]

      vi.mocked(getRecommendedConcepts).mockResolvedValue({
        available: true,
        concepts: recommended,
      })
      const counts = new Map<
        number,
        { recordCount: number; descendantRecordCount: number; personCount: number; descendantPersonCount: number }
      >([
        [10, { recordCount: 100, descendantRecordCount: 200, personCount: 50, descendantPersonCount: 75 }],
        [11, { recordCount: 5, descendantRecordCount: 6, personCount: 3, descendantPersonCount: 4 }],
      ])
      vi.mocked(getConceptRecordCounts).mockResolvedValue(counts)

      await store.loadRecommendedConcepts('TEST')

      // Seed = items where !isExcluded, so [1, 3]
      expect(getRecommendedConcepts).toHaveBeenCalledWith('TEST', [1, 3])

      // 2 was filtered out because it's already in the set
      expect(store.recommendedConcepts).toHaveLength(2)
      const ids = store.recommendedConcepts.map((c) => c.conceptId).sort()
      expect(ids).toEqual([10, 11])

      // Enrichment merged
      const c10 = store.recommendedConcepts.find((c) => c.conceptId === 10)!
      expect(c10.recordCount).toBe(100)
      expect(c10.descendantRecordCount).toBe(200)
      expect(c10.personCount).toBe(50)
      expect(c10.descendantPersonCount).toBe(75)

      expect(getConceptRecordCounts).toHaveBeenCalledWith('TEST', expect.arrayContaining([10, 11]))
      expect(store.isRecommendedAvailable).toBe(true)
      expect(store.recommendedError).toBeNull()
      expect(store.loadingRecommended).toBe(false)
    })

    it('should flip isRecommendedAvailable to false when service returns available:false', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { name: 'Test', items: [makeItem(1)] }

      vi.mocked(getRecommendedConcepts).mockResolvedValue({
        available: false,
        concepts: [],
      })

      await store.loadRecommendedConcepts('TEST')

      expect(store.isRecommendedAvailable).toBe(false)
      expect(store.recommendedConcepts).toEqual([])
      expect(store.loadingRecommended).toBe(false)
      expect(getConceptRecordCounts).not.toHaveBeenCalled()
    })

    it('should set recommendedError and not flip availability when service throws', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { name: 'Test', items: [makeItem(1)] }

      vi.mocked(getRecommendedConcepts).mockRejectedValue(new Error('boom'))

      await store.loadRecommendedConcepts('TEST')

      expect(store.recommendedError).toContain('boom')
      expect(store.recommendedConcepts).toEqual([])
      expect(store.isRecommendedAvailable).toBe(true)
      expect(store.loadingRecommended).toBe(false)
    })

    it('should toggle loadingRecommended true during call and false in finally', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { name: 'Test', items: [makeItem(1)] }

      let resolve: (v: { available: true; concepts: Concept[] }) => void = () => {}
      const pending = new Promise<{ available: true; concepts: Concept[] }>((r) => {
        resolve = r
      })
      vi.mocked(getRecommendedConcepts).mockReturnValue(pending)
      vi.mocked(getConceptRecordCounts).mockResolvedValue(new Map())

      const inFlight = store.loadRecommendedConcepts('TEST')
      // After kicking off, loading should be true and error reset
      expect(store.loadingRecommended).toBe(true)
      expect(store.recommendedError).toBeNull()

      resolve({ available: true, concepts: [] })
      await inFlight

      expect(store.loadingRecommended).toBe(false)
    })
  })

  describe('Concept Set Comparison', () => {
    function makeItem(conceptId: number): ConceptSetItem {
      return {
        conceptId,
        conceptName: `Concept ${conceptId}`,
        conceptCode: `${conceptId}`,
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
        isExcluded: false,
        includeDescendants: false,
        includeMapped: false,
      }
    }

    function makeComparisonRow(conceptId: number, membership: '1only' | '2only' | 'both'): ComparisonResultItem {
      return {
        conceptId,
        conceptIn1Only: membership === '1only' ? 1 : 0,
        conceptIn2Only: membership === '2only' ? 1 : 0,
        conceptIn1And2: membership === 'both' ? 1 : 0,
        conceptName: `Concept ${conceptId}`,
        conceptCode: `${conceptId}`,
        conceptClassId: 'Clinical Finding',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        standardConcept: 'S',
        invalidReason: null,
        validStartDate: null,
        validEndDate: null,
        nameMismatch: false,
      }
    }

    it('should have correct initial comparison state', () => {
      const store = useConceptSetsStore()
      expect(store.comparison).toEqual([])
      expect(store.comparisonOtherSet).toBeNull()
      expect(store.loadingComparison).toBe(false)
      expect(store.comparisonError).toBeNull()
    })

    it('should set error and not call service when no current set is loaded', async () => {
      const store = useConceptSetsStore()

      await store.loadComparison('TEST', 2)

      expect(getConceptSetById).not.toHaveBeenCalled()
      expect(compareConceptSets).not.toHaveBeenCalled()
      expect(store.comparison).toEqual([])
      expect(store.comparisonOtherSet).toBeNull()
      expect(store.comparisonError).toBe('No concept set loaded')
    })

    it('should set error and not call service when current set has no items', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { id: 1, name: 'Empty', items: [] }

      await store.loadComparison('TEST', 2)

      expect(getConceptSetById).not.toHaveBeenCalled()
      expect(compareConceptSets).not.toHaveBeenCalled()
      expect(store.comparisonError).toBe('No concept set loaded')
    })

    it('should set error and not call service when comparing with self (same id)', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { id: 7, name: 'Self', items: [makeItem(1)] }

      await store.loadComparison('TEST', 7)

      expect(getConceptSetById).not.toHaveBeenCalled()
      expect(compareConceptSets).not.toHaveBeenCalled()
      expect(store.comparisonError).toBe('Cannot compare a concept set with itself')
    })

    it('happy path: fetches CS2, builds two expressions, calls service, sets comparison + comparisonOtherSet', async () => {
      const store = useConceptSetsStore()
      store.currentSet = {
        id: 1,
        name: 'CS1',
        items: [makeItem(100), makeItem(101)],
      }

      const cs2: ConceptSet = {
        id: 2,
        name: 'CS2',
        items: [makeItem(101), makeItem(200)],
      }
      vi.mocked(getConceptSetById).mockResolvedValue(cs2)

      const rows: ComparisonResultItem[] = [
        makeComparisonRow(100, '1only'),
        makeComparisonRow(200, '2only'),
        makeComparisonRow(101, 'both'),
      ]
      vi.mocked(compareConceptSets).mockResolvedValue(rows)

      await store.loadComparison('TEST', 2)

      expect(getConceptSetById).toHaveBeenCalledWith(2)
      expect(compareConceptSets).toHaveBeenCalledTimes(1)
      const [sourceKey, expr1, expr2] = vi.mocked(compareConceptSets).mock.calls[0]
      expect(sourceKey).toBe('TEST')
      expect(expr1.items).toHaveLength(2)
      expect(expr1.items[0].concept.CONCEPT_ID).toBe(100)
      expect(expr2.items).toHaveLength(2)
      expect(expr2.items[0].concept.CONCEPT_ID).toBe(101)

      expect(store.comparison).toEqual(rows)
      expect(store.comparisonOtherSet).toEqual(cs2)
      expect(store.comparisonError).toBeNull()
      expect(store.loadingComparison).toBe(false)
    })

    it('should set comparisonError when CS2 fetch returns null', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { id: 1, name: 'CS1', items: [makeItem(100)] }

      vi.mocked(getConceptSetById).mockResolvedValue(null)

      await store.loadComparison('TEST', 999)

      expect(store.comparisonError).toBe('Other concept set not found')
      expect(store.comparison).toEqual([])
      expect(store.comparisonOtherSet).toBeNull()
      expect(store.loadingComparison).toBe(false)
      expect(compareConceptSets).not.toHaveBeenCalled()
    })

    it('should set comparisonError, clear comparison and other set when service throws', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { id: 1, name: 'CS1', items: [makeItem(100)] }

      vi.mocked(getConceptSetById).mockResolvedValue({
        id: 2,
        name: 'CS2',
        items: [makeItem(200)],
      })
      vi.mocked(compareConceptSets).mockRejectedValue(new Error('boom'))

      await store.loadComparison('TEST', 2)

      expect(store.comparisonError).toContain('boom')
      expect(store.comparison).toEqual([])
      expect(store.comparisonOtherSet).toBeNull()
      expect(store.loadingComparison).toBe(false)
    })

    it('should toggle loadingComparison true during call and false in finally', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { id: 1, name: 'CS1', items: [makeItem(100)] }

      vi.mocked(getConceptSetById).mockResolvedValue({
        id: 2,
        name: 'CS2',
        items: [makeItem(200)],
      })

      let resolve: (v: ComparisonResultItem[]) => void = () => {}
      const pending = new Promise<ComparisonResultItem[]>((r) => {
        resolve = r
      })
      vi.mocked(compareConceptSets).mockReturnValue(pending)

      const inFlight = store.loadComparison('TEST', 2)
      // Need to await microtasks so the awaited getConceptSetById resolves
      // and we reach the compareConceptSets call where loading is set true.
      await Promise.resolve()
      await Promise.resolve()
      expect(store.loadingComparison).toBe(true)
      expect(store.comparisonError).toBeNull()

      resolve([])
      await inFlight

      expect(store.loadingComparison).toBe(false)
    })
  })
})
