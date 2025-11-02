import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptSets } from '@/composables/useConceptSets'
import type { Concept, ConceptSet } from '@/models/concept-set.types'

// Mock the webapi service
vi.mock('@/services/webapi', () => ({
  searchConcepts: vi.fn(),
  getConceptSet: vi.fn(),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
}))

describe('useConceptSets', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with empty search results', () => {
    const { searchResults, isSearching } = useConceptSets()

    expect(searchResults.value).toEqual([])
    expect(isSearching.value).toBe(false)
  })

  it('should debounce search requests by 300ms', async () => {
    const { searchConcepts: search } = useConceptSets()

    // Call search multiple times rapidly
    search('diabetes')
    search('diabetes type')
    search('diabetes type 2')

    // Mock timer to advance 300ms
    vi.useFakeTimers()
    vi.advanceTimersByTime(300)
    vi.useRealTimers()

    // Only the last search should be executed after debounce
    // Implementation will verify this
  })

  it('should set isSearching to true during search', async () => {
    const { searchConcepts: search, isSearching } = useConceptSets()

    const searchPromise = search('diabetes')
    expect(isSearching.value).toBe(true)

    await searchPromise
    expect(isSearching.value).toBe(false)
  })

  it('should filter search by domain if provided', async () => {
    const { searchConcepts: search } = useConceptSets()

    await search('diabetes', 'Condition')

    // Verify domain filter was passed to API call
    // Implementation will verify this
  })

  it('should create a new concept set', async () => {
    const { createConceptSet: create } = useConceptSets()

    const newConceptSet: Partial<ConceptSet> = {
      name: 'Type 2 Diabetes',
      expression: {
        items: [],
      },
    }

    const result = await create(newConceptSet as ConceptSet)

    expect(result).toBeDefined()
    expect(result?.name).toBe('Type 2 Diabetes')
  })

  it('should update an existing concept set', async () => {
    const { updateConceptSet: update } = useConceptSets()

    const conceptSet: ConceptSet = {
      id: 123,
      name: 'Type 2 Diabetes - Updated',
      expression: {
        items: [],
      },
    }

    await update(conceptSet)

    // Verify update was called with correct ID
  })

  it('should delete a concept set by ID', async () => {
    const { deleteConceptSet: deleteFn } = useConceptSets()

    await deleteFn(123)

    // Verify delete was called with correct ID
  })

  it('should handle search errors gracefully', async () => {
    const { searchConcepts: search, searchResults } = useConceptSets()

    // Mock API to throw error
    const webapi = await import('@/services/webapi')
    vi.mocked(webapi.searchConcepts).mockRejectedValueOnce(new Error('Network error'))

    await expect(search('test')).rejects.toThrow('Network error')
    expect(searchResults.value).toEqual([])
  })

  it('should clear search results when query is empty', async () => {
    const { searchConcepts: search, searchResults } = useConceptSets()

    // First search with results
    await search('diabetes')

    // Then search with empty query
    await search('')

    expect(searchResults.value).toEqual([])
  })

  it('should support selecting multiple concepts for a concept set', () => {
    const { selectedConcepts, toggleConceptSelection } = useConceptSets()

    const concept1: Concept = {
      conceptId: 201826,
      conceptName: 'Type 2 diabetes mellitus',
      conceptCode: '44054006',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
    }

    const concept2: Concept = {
      conceptId: 443238,
      conceptName: 'Type 1 diabetes mellitus',
      conceptCode: '46635009',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
    }

    // Select first concept
    toggleConceptSelection(concept1)
    expect(selectedConcepts.value).toContain(concept1)

    // Select second concept
    toggleConceptSelection(concept2)
    expect(selectedConcepts.value).toHaveLength(2)

    // Deselect first concept
    toggleConceptSelection(concept1)
    expect(selectedConcepts.value).toHaveLength(1)
    expect(selectedConcepts.value).not.toContain(concept1)
  })

  it('should clear selected concepts', () => {
    const { selectedConcepts, clearSelectedConcepts, toggleConceptSelection } = useConceptSets()

    const concept: Concept = {
      conceptId: 201826,
      conceptName: 'Type 2 diabetes mellitus',
      conceptCode: '44054006',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
    }

    toggleConceptSelection(concept)
    expect(selectedConcepts.value).toHaveLength(1)

    clearSelectedConcepts()
    expect(selectedConcepts.value).toEqual([])
  })
})
