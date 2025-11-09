/**
 * Concept Search Store Tests
 * Tests for concept search state management
 * Task: T035 [P1] [US1]
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptSearchStore } from '@/stores/concept-search'
import * as conceptSearchService from '@/services/concept-search.service'
import type { Concept } from '@/models/concept-set.types'

// Mock the service
vi.mock('@/services/concept-search.service')

// Mock data
const mockConcepts: Concept[] = [
  {
    conceptId: 201826,
    conceptName: 'Type 2 diabetes mellitus',
    conceptCode: '44054006',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  },
  {
    conceptId: 201820,
    conceptName: 'Diabetes mellitus',
    conceptCode: '73211009',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  },
  {
    conceptId: 4193704,
    conceptName: 'Metformin',
    conceptCode: '6809',
    domainId: 'Drug',
    vocabularyId: 'RxNorm',
    conceptClassId: 'Ingredient',
    standardConcept: 'S',
    invalidReason: null,
  },
]

describe('Concept Search Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    
    // Mock getConceptRecordCounts to return empty map by default
    vi.mocked(conceptSearchService.getConceptRecordCounts).mockResolvedValue(new Map())
  })

  describe('Initial State', () => {
    it('should initialize with empty state', () => {
      const store = useConceptSearchStore()

      expect(store.searchTerm).toBe('')
      expect(store.concepts).toEqual([])
      expect(store.allConcepts).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.page).toBe(1)
      expect(store.itemsPerPage).toBe(25)
      expect(store.sortBy).toBe('conceptId')
      expect(store.sortDesc).toBe(false)
    })

    it('should have correct computed properties', () => {
      const store = useConceptSearchStore()

      expect(store.totalCount).toBe(0)
      expect(store.isEmpty).toBe(true)
      expect(store.pageRangeText).toBe('0-0 of 0')
    })
  })

  describe('Search Action', () => {
    it('should search for concepts successfully', async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })

      await store.search('diabetes')

      expect(store.searchTerm).toBe('diabetes')
      expect(store.allConcepts).toEqual(mockConcepts)
      expect(store.totalCount).toBe(3)
      expect(store.isEmpty).toBe(false)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(conceptSearchService.searchConcepts).toHaveBeenCalledTimes(1)
    })

    it('should handle search with less than 3 characters', async () => {
      const store = useConceptSearchStore()
      
      await store.search('di')

      expect(store.allConcepts).toEqual([])
      expect(store.error).toBeNull()
      expect(conceptSearchService.searchConcepts).not.toHaveBeenCalled()
    })

    it('should handle search errors', async () => {
      const store = useConceptSearchStore()
      const errorMessage = 'Network error'
      vi.mocked(conceptSearchService.searchConcepts).mockRejectedValue(new Error(errorMessage))

      await store.search('diabetes')

      expect(store.error).toBe(errorMessage)
      expect(store.allConcepts).toEqual([])
      expect(store.loading).toBe(false)
    })

    it('should set loading state during search', async () => {
      const store = useConceptSearchStore()
      let resolveSearch: (value: any) => void
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve
      })
      vi.mocked(conceptSearchService.searchConcepts).mockReturnValue(searchPromise as any)

      const searchPromiseResult = store.search('diabetes')
      expect(store.loading).toBe(true)

      resolveSearch!({ concepts: mockConcepts, total: mockConcepts.length })
      await searchPromiseResult
      expect(store.loading).toBe(false)
    })

    it('should reset to first page on new search', async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })

      // Set to page 2
      store.updatePagination(2, 25)
      expect(store.page).toBe(2)

      // New search should reset to page 1
      await store.search('diabetes')
      expect(store.page).toBe(1)
    })
  })

  describe('Debounced Search', () => {
    it('should debounce search calls', async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })

      // Call debounced search multiple times rapidly
      store.debouncedSearch('dia')
      store.debouncedSearch('diab')
      store.debouncedSearch('diabe')
      store.debouncedSearch('diabet')
      store.debouncedSearch('diabetes')

      // Wait for debounce delay (300ms)
      await new Promise((resolve) => setTimeout(resolve, 350))

      // Should only call the service once with the final value
      expect(conceptSearchService.searchConcepts).toHaveBeenCalledTimes(1)
      expect(store.searchTerm).toBe('diabetes')
    })
  })

  describe('Sorting', () => {
    beforeEach(async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })
      await store.search('diabetes')
    })

    it('should sort by concept name ascending', () => {
      const store = useConceptSearchStore()
      store.updateSort('conceptName', false)

      const sortedNames = store.concepts.map((c) => c.conceptName)
      expect(sortedNames).toEqual([
        'Diabetes mellitus',
        'Metformin',
        'Type 2 diabetes mellitus',
      ])
    })

    it('should sort by concept name descending', () => {
      const store = useConceptSearchStore()
      store.updateSort('conceptName', true)

      const sortedNames = store.concepts.map((c) => c.conceptName)
      expect(sortedNames).toEqual([
        'Type 2 diabetes mellitus',
        'Metformin',
        'Diabetes mellitus',
      ])
    })

    it('should sort by concept ID ascending', () => {
      const store = useConceptSearchStore()
      store.updateSort('conceptId', false)

      const sortedIds = store.concepts.map((c) => c.conceptId)
      expect(sortedIds).toEqual([201820, 201826, 4193704])
    })

    it('should sort by concept ID descending', () => {
      const store = useConceptSearchStore()
      store.updateSort('conceptId', true)

      const sortedIds = store.concepts.map((c) => c.conceptId)
      expect(sortedIds).toEqual([4193704, 201826, 201820])
    })
  })

  describe('Pagination', () => {
    beforeEach(async () => {
      const store = useConceptSearchStore()
      // Create 100 mock concepts for pagination testing
      const manyConcepts = Array.from({ length: 100 }, (_, i) => ({
        conceptId: i + 1,
        conceptName: `Concept ${i + 1}`,
        conceptCode: `CODE${i + 1}`,
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S' as const,
        invalidReason: null,
      }))

      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: manyConcepts,
        total: manyConcepts.length,
      })
      await store.search('test')
    })

    it('should paginate results with default page size', () => {
      const store = useConceptSearchStore()

      expect(store.concepts.length).toBe(25) // Default page size
      expect(store.concepts[0].conceptId).toBe(1)
      expect(store.concepts[24].conceptId).toBe(25)
      expect(store.totalCount).toBe(100)
    })

    it('should navigate to different pages', () => {
      const store = useConceptSearchStore()

      store.updatePagination(2, 25)
      expect(store.concepts[0].conceptId).toBe(26)
      expect(store.concepts[24].conceptId).toBe(50)

      store.updatePagination(3, 25)
      expect(store.concepts[0].conceptId).toBe(51)
      expect(store.concepts[24].conceptId).toBe(75)
    })

    it('should handle different page sizes', () => {
      const store = useConceptSearchStore()

      store.updatePagination(1, 50)
      expect(store.concepts.length).toBe(50)
      expect(store.concepts[0].conceptId).toBe(1)
      expect(store.concepts[49].conceptId).toBe(50)

      store.updatePagination(1, 100)
      expect(store.concepts.length).toBe(100)
    })

    it('should calculate correct page range text', () => {
      const store = useConceptSearchStore()

      expect(store.pageRangeText).toBe('1-25 of 100')

      store.updatePagination(2, 25)
      expect(store.pageRangeText).toBe('26-50 of 100')

      store.updatePagination(4, 25)
      expect(store.pageRangeText).toBe('76-100 of 100')
    })
  })

  describe('Clear Search', () => {
    it('should clear all search state', async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })

      await store.search('diabetes')
      store.updatePagination(2, 50)
      expect(store.allConcepts.length).toBeGreaterThan(0)

      store.clearSearch()

      expect(store.searchTerm).toBe('')
      expect(store.allConcepts).toEqual([])
      expect(store.error).toBeNull()
      expect(store.page).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: [],
        total: 0,
      })

      await store.search('nonexistent')

      expect(store.isEmpty).toBe(true)
      expect(store.totalCount).toBe(0)
      expect(store.pageRangeText).toBe('0-0 of 0')
    })

    it('should handle concepts with null values during sorting', async () => {
      const store = useConceptSearchStore()
      const conceptsWithNull: Concept[] = [
        { ...mockConcepts[0], conceptName: 'A Concept' },
        { ...mockConcepts[1], conceptName: null as any },
        { ...mockConcepts[2], conceptName: 'Z Concept' },
      ]

      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: conceptsWithNull,
        total: conceptsWithNull.length,
      })

      await store.search('test')
      store.updateSort('conceptName', false)

      // Null values should be sorted to the end
      const names = store.concepts.map((c) => c.conceptName)
      expect(names[0]).toBe('A Concept')
      expect(names[1]).toBe('Z Concept')
      expect(names[2]).toBeNull()
    })
  })
})
