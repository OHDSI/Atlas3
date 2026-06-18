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
    store.setFilters({ searchQuery: '', author: 'bob', selectedTags: [], createdDateRange: {}, modifiedDateRange: {} })
    expect(store.filteredSets.map(s => s.id)).toEqual([2])
    expect(store.activeFilterCount).toBe(1)
  })

  it('filters by created date range', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    store.setFilters({
      searchQuery: '', author: '', selectedTags: [],
      createdDateRange: { from: new Date(Date.now() - day * 12) },
      modifiedDateRange: {},
    })
    expect(store.filteredSets.map(s => s.id).sort()).toEqual([2, 3])
  })

  it('filters by modified date range', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    // Oldest modifiedDate is set 2 (now - day*2). A `from` of now - day*1.5
    // excludes set 2 while keeping set 1 (now - day) and set 3 (now).
    store.setFilters({
      searchQuery: '', author: '', selectedTags: [],
      createdDateRange: {},
      modifiedDateRange: { from: new Date(Date.now() - day * 1.5) },
    })
    expect(store.filteredSets.map(s => s.id).sort()).toEqual([1, 3])
    expect(store.activeFilterCount).toBe(1)
  })

  it('filters by created date range with ISO-string createdDate', () => {
    const store = useConceptSetsStore()
    const isoSet: ConceptSetListItem = {
      id: 4,
      name: 'Asthma',
      createdBy: 'carol',
      createdDate: new Date(Date.now() - day * 3).toISOString(),
      modifiedDate: Date.now(),
    }
    store.conceptSets = [...sets, isoSet]
    // Range from now - day*4 includes the ISO-dated set (now - day*3) and
    // set 3 (now - day*5 is excluded; set 3 is now - day*5 -> excluded).
    store.setFilters({
      searchQuery: '', author: '', selectedTags: [],
      createdDateRange: { from: new Date(Date.now() - day * 4) },
      modifiedDateRange: {},
    })
    expect(store.filteredSets.map(s => s.id)).toContain(4)

    // A narrower range that ends before the ISO set's date excludes it,
    // confirming `new Date(isoString)` is compared correctly.
    store.setFilters({
      searchQuery: '', author: '', selectedTags: [],
      createdDateRange: { to: new Date(Date.now() - day * 4) },
      modifiedDateRange: {},
    })
    expect(store.filteredSets.map(s => s.id)).not.toContain(4)
  })

  it('clearFilters resets everything', () => {
    const store = useConceptSetsStore()
    store.conceptSets = [...sets]
    store.setFilters({ searchQuery: 'x', author: 'bob', selectedTags: [], createdDateRange: {}, modifiedDateRange: {} })
    store.clearFilters()
    expect(store.filteredSets).toHaveLength(3)
    expect(store.activeFilterCount).toBe(0)
    expect(store.filterTerm).toBe('')
  })
})
