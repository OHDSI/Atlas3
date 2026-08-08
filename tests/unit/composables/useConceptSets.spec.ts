import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ApiError } from '@/services/api-error'
import { createMockConcept } from '../../helpers/mock-factories'

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn(),
}))

vi.mock('@/config/webapi', () => ({
  getSourceKey: vi.fn(() => 'SYNPUF1K'),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('useConceptSets', () => {
  const mockConcept = createMockConcept({ conceptId: 201826, conceptName: 'Type 2 diabetes mellitus' })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes only the concept-search surface', async () => {
    const { useConceptSets } = await import('@/composables/useConceptSets')
    expect(Object.keys(useConceptSets()).sort()).toEqual(
      ['isSearching', 'searchResults', 'searchError', 'searchConcepts', 'selectedConcepts'].sort()
    )
  })

  it('initializes with empty results and no error', async () => {
    const { useConceptSets } = await import('@/composables/useConceptSets')
    const { searchResults, isSearching, searchError, selectedConcepts } = useConceptSets()

    expect(searchResults.value).toEqual([])
    expect(isSearching.value).toBe(false)
    expect(searchError.value).toBeNull()
    expect(selectedConcepts.value).toEqual([])
  })

  describe('searchConcepts', () => {
    it('debounces search requests by 300ms', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      vi.mocked(searchConceptsApi).mockResolvedValue({ success: true, data: [mockConcept] })
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const { searchConcepts } = useConceptSets()

      searchConcepts('dia')
      searchConcepts('diab')
      searchConcepts('diabetes')

      vi.advanceTimersByTime(200)
      expect(searchConceptsApi).not.toHaveBeenCalled()

      vi.advanceTimersByTime(100)
      await vi.runAllTimersAsync()

      expect(searchConceptsApi).toHaveBeenCalledTimes(1)
      expect(searchConceptsApi).toHaveBeenCalledWith('SYNPUF1K', 'diabetes', { domain: undefined })
    })

    it('uses the configured source key', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      vi.mocked(searchConceptsApi).mockResolvedValue({ success: true, data: [mockConcept] })
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const { searchConcepts } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchConceptsApi).toHaveBeenCalledWith('SYNPUF1K', 'diabetes', { domain: undefined })
    })

    it('filters search by domain when provided', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      vi.mocked(searchConceptsApi).mockResolvedValue({ success: true, data: [mockConcept] })
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const { searchConcepts } = useConceptSets()

      searchConcepts('diabetes', 'Condition')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchConceptsApi).toHaveBeenCalledWith('SYNPUF1K', 'diabetes', { domain: 'Condition' })
    })

    it('clears results without calling the API for an empty query', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const { searchConcepts, searchResults } = useConceptSets()

      searchConcepts('')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchResults.value).toEqual([])
      expect(searchConceptsApi).not.toHaveBeenCalled()
    })

    it('clears results without calling the API for a whitespace-only query', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const { searchConcepts, searchResults } = useConceptSets()

      searchConcepts('   ')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchResults.value).toEqual([])
      expect(searchConceptsApi).not.toHaveBeenCalled()
    })

    it('toggles isSearching while a search is in flight', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      let resolveSearch: (value: { success: true; data: typeof mockConcept[] }) => void
      vi.mocked(searchConceptsApi).mockImplementation(
        () => new Promise(resolve => { resolveSearch = resolve })
      )
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const { searchConcepts, isSearching } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)

      expect(isSearching.value).toBe(true)

      resolveSearch!({ success: true, data: [mockConcept] })
      await vi.runAllTimersAsync()

      expect(isSearching.value).toBe(false)
    })

    it('surfaces a distinct error state when the API returns a failure result', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      vi.mocked(searchConceptsApi).mockResolvedValue({
        success: false,
        error: new ApiError('Invalid concept search response format', 0, null),
      })
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const { searchConcepts, searchResults, isSearching, searchError } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      // A failed search is not "no results" — the two must be distinguishable
      // so the UI can show an error instead of a false "no matches" state.
      expect(searchResults.value).toEqual([])
      expect(isSearching.value).toBe(false)
      expect(searchError.value).toBe('Invalid concept search response format')
    })

    it('clears a stale error once a new search starts', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      vi.mocked(searchConceptsApi).mockResolvedValueOnce({
        success: false,
        error: new ApiError('Invalid concept search response format', 0, null),
      })
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const { searchConcepts, searchError } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()
      expect(searchError.value).not.toBeNull()

      vi.mocked(searchConceptsApi).mockResolvedValueOnce({ success: true, data: [mockConcept] })
      searchConcepts('metformin')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchError.value).toBeNull()
    })

    it('stores the query in the picker store', async () => {
      const { searchConcepts: searchConceptsApi } = await import('@/services/concept-search.service')
      vi.mocked(searchConceptsApi).mockResolvedValue({ success: true, data: [mockConcept] })
      const { useConceptPickerStore } = await import('@/stores/concept-picker')
      const { useConceptSets } = await import('@/composables/useConceptSets')
      const store = useConceptPickerStore()
      const { searchConcepts } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(store.searchQuery).toBe('diabetes')
    })
  })
})
