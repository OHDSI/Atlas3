/**
 * Concept Sets Store Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptPickerStore } from '@/stores/concept-picker'
import type { ConceptSet } from '@/models/concept-set.types'

describe('Concept Sets Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Initial State', () => {
    it('should have empty concept sets map initially', () => {
      const store = useConceptPickerStore()
      expect(store.conceptSets.size).toBe(0)
      expect(store.conceptSetsList).toEqual([])
      expect(store.conceptSetsCount).toBe(0)
    })

    it('should have empty search results initially', () => {
      const store = useConceptPickerStore()
      expect(store.searchResults).toEqual([])
      expect(store.isSearching).toBe(false)
      expect(store.searchQuery).toBe('')
    })
  })

  describe('Concept Set Management', () => {
    it('should add concept set', () => {
      const store = useConceptPickerStore()
      const conceptSet: ConceptSet = {
        id: 1,
        name: 'Test Concept Set',
        concepts: [],
      }

      store.addConceptSet(conceptSet)

      expect(store.conceptSets.size).toBe(1)
      expect(store.conceptSets.get(1)).toEqual(conceptSet)
      expect(store.conceptSetsList).toHaveLength(1)
      expect(store.conceptSetsCount).toBe(1)
    })

    it('should update concept set', () => {
      const store = useConceptPickerStore()
      const conceptSet: ConceptSet = {
        id: 1,
        name: 'Original Name',
        concepts: [],
      }

      store.addConceptSet(conceptSet)

      const updated: ConceptSet = {
        id: 1,
        name: 'Updated Name',
        concepts: [],
      }

      store.updateConceptSet(1, updated)

      expect(store.conceptSets.get(1)?.name).toBe('Updated Name')
    })

    it('should not update non-existent concept set', () => {
      const store = useConceptPickerStore()
      const conceptSet: ConceptSet = {
        id: 999,
        name: 'Test',
        concepts: [],
      }

      store.updateConceptSet(999, conceptSet)

      expect(store.conceptSets.size).toBe(0)
    })

    it('should remove concept set', () => {
      const store = useConceptPickerStore()
      const conceptSet: ConceptSet = {
        id: 1,
        name: 'Test',
        concepts: [],
      }

      store.addConceptSet(conceptSet)
      expect(store.conceptSets.size).toBe(1)

      store.removeConceptSet(1)
      expect(store.conceptSets.size).toBe(0)
    })

    it('should get concept set by ID', () => {
      const store = useConceptPickerStore()
      const conceptSet: ConceptSet = {
        id: 1,
        name: 'Test',
        concepts: [],
      }

      store.addConceptSet(conceptSet)

      expect(store.getConceptSetById(1)).toEqual(conceptSet)
      expect(store.getConceptSetById(999)).toBeUndefined()
    })
  })

  describe('Search Management', () => {
    it('should set search results', () => {
      const store = useConceptPickerStore()
      const results = [
        {
          conceptId: 1,
          conceptName: 'Test Concept',
          conceptCode: 'TC001',
          domainId: 'Condition',
          vocabularyId: 'SNOMED',
          conceptClassId: 'Clinical Finding',
          standardConcept: 'S',
        },
      ]

      store.setSearchResults(results)

      expect(store.searchResults).toEqual(results)
    })

    it('should set searching state', () => {
      const store = useConceptPickerStore()

      store.setSearching(true)
      expect(store.isSearching).toBe(true)

      store.setSearching(false)
      expect(store.isSearching).toBe(false)
    })

    it('should set search query', () => {
      const store = useConceptPickerStore()

      store.setSearchQuery('diabetes')
      expect(store.searchQuery).toBe('diabetes')
    })

    it('should clear search', () => {
      const store = useConceptPickerStore()

      store.setSearchQuery('test')
      store.setSearching(true)
      store.setSearchResults([{
        conceptId: 1,
        conceptName: 'Test',
        conceptCode: 'T001',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
      }])

      store.clearSearch()

      expect(store.searchResults).toEqual([])
      expect(store.searchQuery).toBe('')
      expect(store.isSearching).toBe(false)
    })
  })

  describe('Clear All', () => {
    it('should clear all concept sets and search state', () => {
      const store = useConceptPickerStore()

      store.addConceptSet({ id: 1, name: 'Test', concepts: [] })
      store.setSearchQuery('test')
      store.setSearching(true)

      store.clearAll()

      expect(store.conceptSets.size).toBe(0)
      expect(store.searchResults).toEqual([])
      expect(store.searchQuery).toBe('')
      expect(store.isSearching).toBe(false)
    })
  })
})
