import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { ConceptSetListItem } from '@/models/concept-set.types'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/services/concept-set.service', () => ({
  getAllConceptSets: vi.fn(),
  getConceptSetById: vi.fn(),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
}))
vi.mock('@/services/concept-set-versions.service', () => ({ getVersion: vi.fn() }))
vi.mock('@/services/concept-search.service', () => ({
  getRecommendedConcepts: vi.fn(),
  getConceptRecordCounts: vi.fn(),
  compareConceptSets: vi.fn(),
  resolveConceptSetExpression: vi.fn(),
}))
vi.mock('@/stores/webapi', () => ({ useWebAPIStore: vi.fn(() => ({})) }))

import { useConceptSetsStore } from '@/stores/concept-sets'

const day = 86400000
const sets: ConceptSetListItem[] = [
  { id: 1, name: 'Diabetes', createdBy: { id: 1, name: 'Alice', login: 'alice' }, createdDate: Date.now() - day * 30, modifiedDate: Date.now() - day },
  { id: 2, name: 'Hypertension', createdBy: 'bob', createdDate: Date.now() - day * 10, modifiedDate: Date.now() - day * 2 },
  { id: 3, name: 'Diabetic neuropathy', createdBy: { id: 1, name: 'Alice', login: 'alice' }, createdDate: Date.now() - day * 5, modifiedDate: Date.now() },
]

describe('concept-sets store filters', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('returns all sets with no filters', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    expect(store.filteredSets).toHaveLength(3)
    expect(store.activeFilterCount).toBe(0)
  })

  it('filters by name search (via filterTerm alias)', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    store.filterTerm = 'diabet'
    expect(store.filteredSets.map(s => s.id)).toEqual([1, 3])
  })

  it('derives distinct authors normalizing string and object forms', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    expect(store.availableAuthors).toEqual(['alice', 'bob'])
  })

  it('filters by author', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    store.setFilters({ searchQuery: '', author: 'bob', createdDateRange: {}, modifiedDateRange: {} })
    expect(store.filteredSets.map(s => s.id)).toEqual([2])
    expect(store.activeFilterCount).toBe(1)
  })

  it('filters by created date range', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    store.setFilters({
      searchQuery: '', author: '',
      createdDateRange: { from: new Date(Date.now() - day * 12) },
      modifiedDateRange: {},
    })
    expect(store.filteredSets.map(s => s.id).sort()).toEqual([2, 3])
  })

  it('clearFilters resets everything', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    store.setFilters({ searchQuery: 'x', author: 'bob', createdDateRange: {}, modifiedDateRange: {} })
    store.clearFilters()
    expect(store.filteredSets).toHaveLength(3)
    expect(store.activeFilterCount).toBe(0)
    expect(store.filterTerm).toBe('')
  })
})
