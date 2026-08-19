import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useConceptPickerStore } from '@/stores/concept-picker'
import { createMockConcept, createMockConceptSet } from '../../helpers/mock-factories'
import { searchConcepts as searchConceptsApi } from '@/services/concept-search.service'
import { logger } from '@/utils/logger'

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

const searchConceptsMock = vi.mocked(searchConceptsApi)
const loggerMock = vi.mocked(logger)

describe('concept-picker store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    searchConceptsMock.mockReset()
    loggerMock.error.mockReset()
  })

  it('manages concept sets and search state helpers', () => {
    const store = useConceptPickerStore()
    const conceptSet = createMockConceptSet({ id: 1, name: 'Test set' })

    store.addConceptSet(conceptSet)
    store.addConceptSet({ ...conceptSet, id: undefined })
    expect(store.conceptSetsCount).toBe(1)
    expect(store.conceptSetsList).toHaveLength(1)
    expect(store.getConceptSetById(1)).toEqual(conceptSet)

    const updatedSet = { ...conceptSet, name: 'Updated set' }
    store.updateConceptSet(1, updatedSet)
    expect(store.getConceptSetById(1)?.name).toBe('Updated set')

    store.removeConceptSet(1)
    expect(store.conceptSetsCount).toBe(0)

    store.setSearchResults([createMockConcept({ conceptId: 1 })])
    store.setSearching(true)
    store.setSearchQuery('diabetes')
    store.setSearchError('boom')
    expect(store.searchResults).toHaveLength(1)
    expect(store.isSearching).toBe(true)
    expect(store.searchQuery).toBe('diabetes')
    expect(store.searchError).toBe('boom')

    store.clearSearch()
    expect(store.searchResults).toEqual([])
    expect(store.isSearching).toBe(false)
    expect(store.searchQuery).toBe('')
    expect(store.searchError).toBeNull()
  })

  it('searches concepts and stores results on success', async () => {
    const store = useConceptPickerStore()
    const concept = createMockConcept({ conceptId: 11, conceptName: 'Metformin' })
    searchConceptsMock.mockResolvedValue({ success: true, data: [concept] } as never)

    await store.searchConcepts('snomed', ' metformin ', 'Drug')

    expect(searchConceptsMock).toHaveBeenCalledWith('snomed', ' metformin ', { domain: 'Drug' })
    expect(store.isSearching).toBe(false)
    expect(store.searchQuery).toBe(' metformin ')
    expect(store.searchError).toBeNull()
    expect(store.searchResults).toHaveLength(1)
    expect(store.searchResults[0]?.conceptId).toBe(11)
  })

  it('records failures from the search API', async () => {
    const store = useConceptPickerStore()
    searchConceptsMock.mockResolvedValue({ success: false, error: { message: 'nope' } } as never)

    await store.searchConcepts('snomed', 'metformin')

    expect(loggerMock.error).toHaveBeenCalledWith(
      'ConceptPickerStore',
      'Search failed',
      expect.objectContaining({ sourceKey: 'snomed' })
    )
    expect(store.searchResults).toEqual([])
    expect(store.searchError).toBe('nope')
    expect(store.isSearching).toBe(false)
  })

  it('records thrown errors from the search API', async () => {
    const store = useConceptPickerStore()
    searchConceptsMock.mockRejectedValue(new Error('network down'))

    await store.searchConcepts('snomed', 'metformin')

    expect(loggerMock.error).toHaveBeenCalledWith(
      'ConceptPickerStore',
      'Search failed',
      expect.objectContaining({ sourceKey: 'snomed' })
    )
    expect(store.searchResults).toEqual([])
    expect(store.searchError).toBe('network down')
    expect(store.isSearching).toBe(false)
  })

  it('clears everything in one call', () => {
    const store = useConceptPickerStore()
    store.addConceptSet(createMockConceptSet({ id: 1, name: 'Test set' }))
    store.setSearchResults([createMockConcept({ conceptId: 1 })])
    store.setSearching(true)
    store.setSearchQuery('query')
    store.setSearchError('error')

    store.clearAll()

    expect(store.conceptSetsCount).toBe(0)
    expect(store.searchResults).toEqual([])
    expect(store.isSearching).toBe(false)
    expect(store.searchQuery).toBe('')
    expect(store.searchError).toBeNull()
  })
})