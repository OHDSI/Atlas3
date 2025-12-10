import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptSets } from '@/composables/useConceptSets'
import { useConceptPickerStore } from '@/stores/concept-picker'
import type { Concept, ConceptSet } from '@/models/concept-set.types'
import * as webapi from '@/services/webapi'

// Mock the webapi service
vi.mock('@/services/webapi', () => ({
  searchConcepts: vi.fn(),
  getConceptSet: vi.fn(),
  getAllConceptSets: vi.fn(),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
}))

// Mock logger to avoid console output during tests
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('useConceptSets', () => {
  const mockConcept: Concept = {
    conceptId: 201826,
    conceptName: 'Type 2 diabetes mellitus',
    conceptCode: '44054006',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  }

  const mockConceptSet: ConceptSet = {
    id: 123,
    name: 'Type 2 Diabetes',
    items: [
      {
        ...mockConcept,
        isExcluded: false,
        includeDescendants: true,
        includeMapped: false,
      },
    ],
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty search results', () => {
      const { searchResults, isSearching, selectedConcepts } = useConceptSets()

      expect(searchResults.value).toEqual([])
      expect(isSearching.value).toBe(false)
      expect(selectedConcepts.value).toEqual([])
    })

    it('should expose computed properties from store', () => {
      const { searchResults, isSearching, searchQuery, conceptSetsList } = useConceptSets()

      expect(searchResults.value).toBeDefined()
      expect(isSearching.value).toBeDefined()
      expect(searchQuery.value).toBeDefined()
      expect(conceptSetsList.value).toBeDefined()
    })
  })

  describe('searchConcepts', () => {
    it('should debounce search requests by 300ms', async () => {
      vi.mocked(webapi.searchConcepts).mockResolvedValue({ success: true, data: [mockConcept] })
      const { searchConcepts } = useConceptSets()

      // Call search multiple times rapidly
      searchConcepts('dia')
      searchConcepts('diab')
      searchConcepts('diabet')
      searchConcepts('diabetes')

      // Advance timer by less than 300ms - should not trigger
      vi.advanceTimersByTime(200)
      expect(webapi.searchConcepts).not.toHaveBeenCalled()

      // Advance timer to complete 300ms debounce
      vi.advanceTimersByTime(100)
      await vi.runAllTimersAsync()

      // Only the last search should be executed
      expect(webapi.searchConcepts).toHaveBeenCalledTimes(1)
      expect(webapi.searchConcepts).toHaveBeenCalledWith('SYNPUF1K', 'diabetes', undefined)
    })

    it('should search concepts successfully', async () => {
      const mockResults = [mockConcept, { ...mockConcept, conceptId: 201827 }]
      vi.mocked(webapi.searchConcepts).mockResolvedValue({ success: true, data: mockResults })

      const { searchConcepts, searchResults, isSearching } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchResults.value).toEqual(mockResults)
      expect(isSearching.value).toBe(false)
    })

    it('should filter search by domain if provided', async () => {
      vi.mocked(webapi.searchConcepts).mockResolvedValue({ success: true, data: [mockConcept] })

      const { searchConcepts } = useConceptSets()

      searchConcepts('diabetes', 'Condition')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(webapi.searchConcepts).toHaveBeenCalledWith('SYNPUF1K', 'diabetes', 'Condition')
    })

    it('should use default source key from environment', async () => {
      vi.mocked(webapi.searchConcepts).mockResolvedValue({ success: true, data: [mockConcept] })

      const { searchConcepts } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(webapi.searchConcepts).toHaveBeenCalledWith('SYNPUF1K', 'diabetes', undefined)
    })

    it('should clear search results when query is empty', async () => {
      const store = useConceptPickerStore()
      store.setSearchResults([mockConcept])

      const { searchConcepts, searchResults } = useConceptSets()

      searchConcepts('')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchResults.value).toEqual([])
      expect(webapi.searchConcepts).not.toHaveBeenCalled()
    })

    it('should clear search results when query is only whitespace', async () => {
      const store = useConceptPickerStore()
      store.setSearchResults([mockConcept])

      const { searchConcepts, searchResults } = useConceptSets()

      searchConcepts('   ')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchResults.value).toEqual([])
      expect(webapi.searchConcepts).not.toHaveBeenCalled()
    })

    it('should set isSearching to true during search', async () => {
      vi.mocked(webapi.searchConcepts).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([mockConcept]), 100)
        })
      })

      const store = useConceptPickerStore()
      const { searchConcepts } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)

      // Check that isSearching is set before promise resolves
      const searchPromise = vi.runAllTimersAsync()
      expect(store.isSearching).toBe(true)

      await searchPromise
      expect(store.isSearching).toBe(false)
    })

    it('should handle API returning error result', async () => {
      // Test the case where API returns { success: false } instead of throwing
      vi.mocked(webapi.searchConcepts).mockResolvedValue({ success: false, data: [], error: 'Search failed' })

      const { searchConcepts, searchResults, isSearching } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(searchResults.value).toEqual([])
      expect(isSearching.value).toBe(false)
    })

    it('should set search query in store', async () => {
      vi.mocked(webapi.searchConcepts).mockResolvedValue({ success: true, data: [mockConcept] })
      const store = useConceptPickerStore()

      const { searchConcepts } = useConceptSets()

      searchConcepts('diabetes')
      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(store.searchQuery).toBe('diabetes')
    })
  })

  describe('createConceptSet', () => {
    it('should create a new concept set successfully', async () => {
      const newConceptSet = { ...mockConceptSet, id: undefined }
      const createdConceptSet = { ...mockConceptSet, id: 456 }
      vi.mocked(webapi.createConceptSet).mockResolvedValue(createdConceptSet)

      const store = useConceptPickerStore()
      const { createConceptSet } = useConceptSets()

      const result = await createConceptSet(newConceptSet)

      expect(result).toEqual(createdConceptSet)
      expect(webapi.createConceptSet).toHaveBeenCalledWith(newConceptSet)
      expect(store.getConceptSetById(456)).toEqual(createdConceptSet)
    })

    it('should return null when creation fails', async () => {
      vi.mocked(webapi.createConceptSet).mockResolvedValue(null)

      const { createConceptSet } = useConceptSets()
      const newConceptSet = { ...mockConceptSet, id: undefined }

      const result = await createConceptSet(newConceptSet)

      expect(result).toBeNull()
    })

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed')
      vi.mocked(webapi.createConceptSet).mockRejectedValue(error)

      const { createConceptSet } = useConceptSets()
      const newConceptSet = { ...mockConceptSet, id: undefined }

      await expect(createConceptSet(newConceptSet)).rejects.toThrow('Creation failed')
    })

    it('should not add to store when API returns null', async () => {
      vi.mocked(webapi.createConceptSet).mockResolvedValue(null)

      const store = useConceptPickerStore()
      const { createConceptSet } = useConceptSets()
      const newConceptSet = { ...mockConceptSet, id: undefined }

      await createConceptSet(newConceptSet)

      expect(store.conceptSetsCount).toBe(0)
    })
  })

  describe('updateConceptSet', () => {
    it('should update an existing concept set successfully', async () => {
      const updatedConceptSet = { ...mockConceptSet, name: 'Updated Name' }
      vi.mocked(webapi.updateConceptSet).mockResolvedValue(updatedConceptSet)

      const store = useConceptPickerStore()
      store.addConceptSet(mockConceptSet)

      const { updateConceptSet } = useConceptSets()

      await updateConceptSet(updatedConceptSet)

      expect(webapi.updateConceptSet).toHaveBeenCalledWith(updatedConceptSet)
      expect(store.getConceptSetById(123)?.name).toBe('Updated Name')
    })

    it('should handle update errors', async () => {
      const error = new Error('Update failed')
      vi.mocked(webapi.updateConceptSet).mockRejectedValue(error)

      const { updateConceptSet } = useConceptSets()

      await expect(updateConceptSet(mockConceptSet)).rejects.toThrow('Update failed')
    })

    it('should not update store when API returns null', async () => {
      vi.mocked(webapi.updateConceptSet).mockResolvedValue(null)

      const store = useConceptPickerStore()
      store.addConceptSet(mockConceptSet)

      const { updateConceptSet } = useConceptSets()
      const updatedConceptSet = { ...mockConceptSet, name: 'Updated Name' }

      await updateConceptSet(updatedConceptSet)

      expect(store.getConceptSetById(123)?.name).toBe('Type 2 Diabetes')
    })

    it('should not update store when API returns concept set without id', async () => {
      const updatedWithoutId = { ...mockConceptSet, id: undefined, name: 'Updated Name' }
      vi.mocked(webapi.updateConceptSet).mockResolvedValue(updatedWithoutId)

      const store = useConceptPickerStore()
      store.addConceptSet(mockConceptSet)

      const { updateConceptSet } = useConceptSets()

      await updateConceptSet(mockConceptSet)

      expect(store.getConceptSetById(123)?.name).toBe('Type 2 Diabetes')
    })
  })

  describe('deleteConceptSet', () => {
    it('should delete a concept set by numeric ID', async () => {
      vi.mocked(webapi.deleteConceptSet).mockResolvedValue(true)

      const store = useConceptPickerStore()
      store.addConceptSet(mockConceptSet)

      const { deleteConceptSet } = useConceptSets()

      await deleteConceptSet(123)

      expect(webapi.deleteConceptSet).toHaveBeenCalledWith(123)
      expect(store.getConceptSetById(123)).toBeUndefined()
    })

    it('should delete a concept set by string ID', async () => {
      const conceptSetWithStringId = { ...mockConceptSet, id: 'cs-123' }
      vi.mocked(webapi.deleteConceptSet).mockResolvedValue(true)

      const store = useConceptPickerStore()
      store.addConceptSet(conceptSetWithStringId)

      const { deleteConceptSet } = useConceptSets()

      await deleteConceptSet('cs-123')

      expect(webapi.deleteConceptSet).toHaveBeenCalledWith('cs-123')
      expect(store.getConceptSetById('cs-123')).toBeUndefined()
    })

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed')
      vi.mocked(webapi.deleteConceptSet).mockRejectedValue(error)

      const { deleteConceptSet } = useConceptSets()

      await expect(deleteConceptSet(123)).rejects.toThrow('Delete failed')
    })

    it('should not remove from store when API returns false', async () => {
      vi.mocked(webapi.deleteConceptSet).mockResolvedValue(false)

      const store = useConceptPickerStore()
      store.addConceptSet(mockConceptSet)

      const { deleteConceptSet } = useConceptSets()

      await deleteConceptSet(123)

      expect(store.getConceptSetById(123)).toBeDefined()
    })
  })

  describe('getConceptSet', () => {
    it('should return cached concept set from store if available', async () => {
      const store = useConceptPickerStore()
      store.addConceptSet(mockConceptSet)

      const { getConceptSet } = useConceptSets()

      const result = await getConceptSet(123)

      expect(result).toEqual(mockConceptSet)
      expect(webapi.getConceptSet).not.toHaveBeenCalled()
    })

    it('should fetch from API when not in store', async () => {
      vi.mocked(webapi.getConceptSet).mockResolvedValue(mockConceptSet)

      const { getConceptSet } = useConceptSets()

      const result = await getConceptSet(123)

      expect(result).toEqual(mockConceptSet)
      expect(webapi.getConceptSet).toHaveBeenCalledWith(123)
    })

    it('should add fetched concept set to store', async () => {
      vi.mocked(webapi.getConceptSet).mockResolvedValue(mockConceptSet)

      const store = useConceptPickerStore()
      const { getConceptSet } = useConceptSets()

      await getConceptSet(123)

      expect(store.getConceptSetById(123)).toEqual(mockConceptSet)
    })

    it('should return null when API returns null', async () => {
      vi.mocked(webapi.getConceptSet).mockResolvedValue(null)

      const { getConceptSet } = useConceptSets()

      const result = await getConceptSet(999)

      expect(result).toBeNull()
    })

    it('should handle get errors', async () => {
      const error = new Error('Fetch failed')
      vi.mocked(webapi.getConceptSet).mockRejectedValue(error)

      const { getConceptSet } = useConceptSets()

      await expect(getConceptSet(123)).rejects.toThrow('Fetch failed')
    })

    it('should work with string IDs', async () => {
      const conceptSetWithStringId = { ...mockConceptSet, id: 'cs-123' }
      vi.mocked(webapi.getConceptSet).mockResolvedValue(conceptSetWithStringId)

      const { getConceptSet } = useConceptSets()

      const result = await getConceptSet('cs-123')

      expect(result).toEqual(conceptSetWithStringId)
      expect(webapi.getConceptSet).toHaveBeenCalledWith('cs-123')
    })

    it('should not add to store when API returns concept set without id', async () => {
      const conceptSetWithoutId = { ...mockConceptSet, id: undefined }
      vi.mocked(webapi.getConceptSet).mockResolvedValue(conceptSetWithoutId)

      const store = useConceptPickerStore()
      const { getConceptSet } = useConceptSets()

      await getConceptSet(123)

      expect(store.conceptSetsCount).toBe(0)
    })
  })

  describe('loadAllConceptSets', () => {
    it('should load all concept sets from API', async () => {
      const conceptSets = [
        mockConceptSet,
        { ...mockConceptSet, id: 124, name: 'Type 1 Diabetes' },
        { ...mockConceptSet, id: 125, name: 'Gestational Diabetes' },
      ]
      vi.mocked(webapi.getAllConceptSets).mockResolvedValue({ success: true, data: conceptSets })

      const store = useConceptPickerStore()
      const { loadAllConceptSets } = useConceptSets()

      await loadAllConceptSets()

      expect(webapi.getAllConceptSets).toHaveBeenCalled()
      expect(store.conceptSetsCount).toBe(3)
      expect(store.getConceptSetById(123)).toEqual(conceptSets[0])
      expect(store.getConceptSetById(124)).toEqual(conceptSets[1])
      expect(store.getConceptSetById(125)).toEqual(conceptSets[2])
    })

    it('should handle load errors', async () => {
      const error = new Error('Load failed')
      vi.mocked(webapi.getAllConceptSets).mockRejectedValue(error)

      const { loadAllConceptSets } = useConceptSets()

      await expect(loadAllConceptSets()).rejects.toThrow('Load failed')
    })

    it('should handle empty array response', async () => {
      vi.mocked(webapi.getAllConceptSets).mockResolvedValue({ success: true, data: [] })

      const store = useConceptPickerStore()
      const { loadAllConceptSets } = useConceptSets()

      await loadAllConceptSets()

      expect(store.conceptSetsCount).toBe(0)
    })
  })

  describe('concept selection', () => {
    it('should toggle concept selection', () => {
      const { selectedConcepts, toggleConceptSelection } = useConceptSets()

      toggleConceptSelection(mockConcept)

      expect(selectedConcepts.value).toHaveLength(1)
      expect(selectedConcepts.value[0]).toEqual(mockConcept)
    })

    it('should deselect concept when toggled again', () => {
      const { selectedConcepts, toggleConceptSelection } = useConceptSets()

      toggleConceptSelection(mockConcept)
      expect(selectedConcepts.value).toHaveLength(1)

      toggleConceptSelection(mockConcept)
      expect(selectedConcepts.value).toHaveLength(0)
    })

    it('should support selecting multiple concepts', () => {
      const concept2 = { ...mockConcept, conceptId: 201827, conceptName: 'Type 1 diabetes' }
      const concept3 = { ...mockConcept, conceptId: 201828, conceptName: 'Gestational diabetes' }

      const { selectedConcepts, toggleConceptSelection } = useConceptSets()

      toggleConceptSelection(mockConcept)
      toggleConceptSelection(concept2)
      toggleConceptSelection(concept3)

      expect(selectedConcepts.value).toHaveLength(3)
      expect(selectedConcepts.value).toContainEqual(mockConcept)
      expect(selectedConcepts.value).toContainEqual(concept2)
      expect(selectedConcepts.value).toContainEqual(concept3)
    })

    it('should check if a concept is selected', () => {
      const { toggleConceptSelection, isConceptSelected } = useConceptSets()

      expect(isConceptSelected(mockConcept.conceptId)).toBe(false)

      toggleConceptSelection(mockConcept)

      expect(isConceptSelected(mockConcept.conceptId)).toBe(true)
    })

    it('should check if a concept is not selected', () => {
      const { isConceptSelected } = useConceptSets()

      expect(isConceptSelected(999999)).toBe(false)
    })

    it('should clear all selected concepts', () => {
      const concept2 = { ...mockConcept, conceptId: 201827 }
      const { selectedConcepts, toggleConceptSelection, clearSelectedConcepts } = useConceptSets()

      toggleConceptSelection(mockConcept)
      toggleConceptSelection(concept2)
      expect(selectedConcepts.value).toHaveLength(2)

      clearSelectedConcepts()

      expect(selectedConcepts.value).toEqual([])
    })

    it('should maintain selection state independently across instances', () => {
      const instance1 = useConceptSets()
      const instance2 = useConceptSets()

      instance1.toggleConceptSelection(mockConcept)

      // Each instance has its own selectedConcepts ref (not shared)
      expect(instance1.selectedConcepts.value).toHaveLength(1)
      expect(instance2.selectedConcepts.value).toHaveLength(0)
    })
  })

  describe('conceptSetsList', () => {
    it('should return empty array initially', () => {
      const { conceptSetsList } = useConceptSets()

      expect(conceptSetsList.value).toEqual([])
    })

    it('should return all concept sets from store', () => {
      const store = useConceptPickerStore()
      store.addConceptSet(mockConceptSet)
      store.addConceptSet({ ...mockConceptSet, id: 124, name: 'Another Set' })

      const { conceptSetsList } = useConceptSets()

      expect(conceptSetsList.value).toHaveLength(2)
      expect(conceptSetsList.value).toContainEqual(mockConceptSet)
    })

    it('should be reactive to store changes', () => {
      const store = useConceptPickerStore()
      const { conceptSetsList } = useConceptSets()

      expect(conceptSetsList.value).toHaveLength(0)

      store.addConceptSet(mockConceptSet)

      expect(conceptSetsList.value).toHaveLength(1)
    })
  })
})
