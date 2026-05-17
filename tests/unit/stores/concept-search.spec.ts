import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn(),
  getConceptRecordCounts: vi.fn(),
}))

vi.mock('@/config/webapi', () => ({
  getSourceKey: vi.fn(() => ''),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({
    getValidVocabularySource: () => 'SYNPUF1K',
  })),
}))

let conceptSearchService: typeof import('@/services/concept-search.service')
let useConceptSearchStore: typeof import('@/stores/concept-search').useConceptSearchStore
let webapiConfig: typeof import('@/config/webapi')
let webapiStoreModule: typeof import('@/stores/webapi')

beforeAll(async () => {
  vi.resetModules()
  conceptSearchService = await import('@/services/concept-search.service')
  webapiConfig = await import('@/config/webapi')
  webapiStoreModule = await import('@/stores/webapi')
  ;({ useConceptSearchStore } = await import('@/stores/concept-search'))
})

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

    vi.mocked(conceptSearchService.getConceptRecordCounts).mockResolvedValue(new Map())
    vi.mocked(webapiStoreModule.useWebAPIStore).mockReturnValue({
      getValidVocabularySource: () => 'SYNPUF1K',
    } as unknown as ReturnType<typeof webapiStoreModule.useWebAPIStore>)
    vi.mocked(webapiConfig.getSourceKey).mockReturnValue('')
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
      expect(store.allConcepts).toHaveLength(3)
      expect(store.totalCount).toBe(3)
      expect(store.isEmpty).toBe(false)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(conceptSearchService.searchConcepts).toHaveBeenCalledTimes(1)
    })

    it('should not call service when term has fewer than 3 characters', async () => {
      const store = useConceptSearchStore()

      await store.search('di')

      expect(store.allConcepts).toEqual([])
      expect(store.error).toBeNull()
      expect(conceptSearchService.searchConcepts).not.toHaveBeenCalled()
    })

    it('should surface generic errors', async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockRejectedValue(
        new Error('Network error')
      )

      await store.search('diabetes')

      expect(store.error).toBe('Network error')
      expect(store.allConcepts).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.loadingRecordCounts).toBe(false)
    })

    it('should map 403 errors to an access-denied message', async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockRejectedValue(
        new Error('Request failed with status 403')
      )

      await store.search('diabetes')

      expect(store.error).toContain('Access denied')
    })

    it('should coerce non-Error throws via String()', async () => {
      const store = useConceptSearchStore()
      vi.mocked(conceptSearchService.searchConcepts).mockRejectedValue('boom')

      await store.search('diabetes')

      expect(store.error).toBe('boom')
    })

    it('should fall back to getSourceKey() when no valid vocabulary source on store', async () => {
      vi.mocked(webapiStoreModule.useWebAPIStore).mockReturnValue({
        getValidVocabularySource: () => null,
      } as unknown as ReturnType<typeof webapiStoreModule.useWebAPIStore>)
      vi.mocked(webapiConfig.getSourceKey).mockReturnValue('FALLBACK_SRC')
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })

      const store = useConceptSearchStore()
      await store.search('diabetes')

      expect(conceptSearchService.searchConcepts).toHaveBeenCalledWith('FALLBACK_SRC', 'diabetes')
    })

    it('should set error when no source is available', async () => {
      vi.mocked(webapiStoreModule.useWebAPIStore).mockReturnValue({
        getValidVocabularySource: () => null,
      } as unknown as ReturnType<typeof webapiStoreModule.useWebAPIStore>)
      vi.mocked(webapiConfig.getSourceKey).mockReturnValue('')

      const store = useConceptSearchStore()
      await store.search('diabetes')

      expect(store.error).toBe('No vocabulary source available.')
      expect(store.allConcepts).toEqual([])
    })

    it('should reset to first page on new search', async () => {
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })

      const store = useConceptSearchStore()
      store.updatePagination(2, 25)
      expect(store.page).toBe(2)

      await store.search('diabetes')
      expect(store.page).toBe(1)
    })

    it('should populate record counts onto returned concepts', async () => {
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })
      vi.mocked(conceptSearchService.getConceptRecordCounts).mockResolvedValue(
        new Map([
          [201826, { recordCount: 100, descendantRecordCount: 200, personCount: 50, descendantPersonCount: 75 }],
        ])
      )

      const store = useConceptSearchStore()
      await store.search('diabetes')

      const target = store.allConcepts.find(c => c.conceptId === 201826)
      expect(target?.recordCount).toBe(100)
      expect(target?.descendantRecordCount).toBe(200)
      expect(target?.personCount).toBe(50)
      expect(target?.descendantPersonCount).toBe(75)
    })

    it('should yield undefined record-count fields when source returns no data for the concept', async () => {
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })
      vi.mocked(conceptSearchService.getConceptRecordCounts).mockResolvedValue(new Map())

      const store = useConceptSearchStore()
      await store.search('diabetes')

      expect(store.allConcepts[0].recordCount).toBeUndefined()
    })
  })

  describe('Sorting', () => {
    beforeEach(async () => {
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })
      const store = useConceptSearchStore()
      await store.search('diabetes')
    })

    it('should sort by concept name ascending', () => {
      const store = useConceptSearchStore()
      store.updateSort('conceptName', false)

      const sortedNames = store.concepts.map(c => c.conceptName)
      expect(sortedNames).toEqual([
        'Diabetes mellitus',
        'Metformin',
        'Type 2 diabetes mellitus',
      ])
    })

    it('should sort by concept name descending', () => {
      const store = useConceptSearchStore()
      store.updateSort('conceptName', true)

      const sortedNames = store.concepts.map(c => c.conceptName)
      expect(sortedNames).toEqual([
        'Type 2 diabetes mellitus',
        'Metformin',
        'Diabetes mellitus',
      ])
    })

    it('should sort by concept ID ascending', () => {
      const store = useConceptSearchStore()
      store.updateSort('conceptId', false)

      expect(store.concepts.map(c => c.conceptId)).toEqual([201820, 201826, 4193704])
    })

    it('should sort by concept ID descending', () => {
      const store = useConceptSearchStore()
      store.updateSort('conceptId', true)

      expect(store.concepts.map(c => c.conceptId)).toEqual([4193704, 201826, 201820])
    })

    it('should skip sorting when sortBy is null', async () => {
      const store = useConceptSearchStore()
      store.sortBy = null
      // Pagination already includes everything; ensure mapping is preserved untouched
      expect(store.concepts.map(c => c.conceptId)).toEqual([201826, 201820, 4193704])
    })

    it('should rank null values last regardless of order', async () => {
      const store = useConceptSearchStore()
      const conceptsWithNull: Concept[] = [
        { ...mockConcepts[0], conceptName: 'A Concept' },
        { ...mockConcepts[1], conceptName: null as unknown as string },
        { ...mockConcepts[2], conceptName: 'Z Concept' },
      ]
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: conceptsWithNull,
        total: conceptsWithNull.length,
      })
      await store.search('test')
      store.updateSort('conceptName', false)

      const names = store.concepts.map(c => c.conceptName)
      expect(names[0]).toBe('A Concept')
      expect(names[1]).toBe('Z Concept')
      expect(names[2]).toBeNull()
    })

    it('should fall through to 0 when sort field is neither string nor number', async () => {
      const store = useConceptSearchStore()
      const oddConcepts = [
        { ...mockConcepts[0], invalidReason: { foo: 1 } as unknown as null },
        { ...mockConcepts[1], invalidReason: { bar: 2 } as unknown as null },
      ]
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: oddConcepts as Concept[],
        total: oddConcepts.length,
      })
      await store.search('test')
      store.updateSort('invalidReason', false)

      expect(store.concepts).toHaveLength(2)
    })
  })

  describe('Pagination', () => {
    beforeEach(async () => {
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
      const store = useConceptSearchStore()
      await store.search('test')
    })

    it('should paginate results with default page size', () => {
      const store = useConceptSearchStore()

      expect(store.concepts.length).toBe(25)
      expect(store.concepts[0].conceptId).toBe(1)
      expect(store.concepts[24].conceptId).toBe(25)
      expect(store.totalCount).toBe(100)
    })

    it('should navigate to different pages', () => {
      const store = useConceptSearchStore()

      store.updatePagination(2, 25)
      expect(store.concepts[0].conceptId).toBe(26)

      store.updatePagination(3, 25)
      expect(store.concepts[0].conceptId).toBe(51)
    })

    it('should compute page range text', () => {
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
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })

      const store = useConceptSearchStore()
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

  describe('Debounced Search', () => {
    it('should debounce search calls', async () => {
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: mockConcepts,
        total: mockConcepts.length,
      })
      const store = useConceptSearchStore()

      store.debouncedSearch('dia')
      store.debouncedSearch('diab')
      store.debouncedSearch('diabetes')

      await new Promise(resolve => setTimeout(resolve, 350))

      expect(conceptSearchService.searchConcepts).toHaveBeenCalledTimes(1)
      expect(store.searchTerm).toBe('diabetes')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty search results', async () => {
      vi.mocked(conceptSearchService.searchConcepts).mockResolvedValue({
        concepts: [],
        total: 0,
      })

      const store = useConceptSearchStore()
      await store.search('nonexistent')

      expect(store.isEmpty).toBe(true)
      expect(store.totalCount).toBe(0)
      expect(store.pageRangeText).toBe('0-0 of 0')
    })
  })
})
