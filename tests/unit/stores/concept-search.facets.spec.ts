import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn(),
  getConceptRecordCounts: vi.fn(),
}))
vi.mock('@/config/webapi', () => ({ getSourceKey: vi.fn(() => '') }))
vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({ getValidVocabularySource: () => 'SYNPUF1K' })),
}))

import { useConceptSearchStore } from '@/stores/concept-search'

function concept(p: Partial<Concept>): Concept {
  return {
    conceptId: 1, conceptName: 'X', conceptCode: 'C', domainId: 'Condition',
    vocabularyId: 'SNOMED', conceptClassId: 'Clinical Finding',
    standardConcept: 'S', invalidReason: null, ...p,
  }
}

const data: Concept[] = [
  concept({ conceptId: 1, vocabularyId: 'SNOMED', domainId: 'Condition' }),
  concept({ conceptId: 2, vocabularyId: 'RxNorm', domainId: 'Drug' }),
]

describe('concept-search store facets', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('exposes facet options derived from results', () => {
    const store = useConceptSearchStore()
    store.allConcepts = [...data]
    expect(store.facetOptions.vocabularyId.map(o => o.value)).toEqual(['RxNorm', 'SNOMED'])
    expect(store.activeFacetCount).toBe(0)
  })

  it('totalCount and concepts reflect the filtered set', () => {
    const store = useConceptSearchStore()
    store.allConcepts = [...data]
    store.setFacet('vocabularyId', ['SNOMED'])
    expect(store.totalCount).toBe(1)
    expect(store.concepts.map(c => c.conceptId)).toEqual([1])
  })

  it('resets page to 1 when a facet selection changes', async () => {
    const store = useConceptSearchStore()
    store.allConcepts = [...data]
    store.page = 3
    store.setFacet('vocabularyId', ['SNOMED'])
    await nextTick()
    expect(store.page).toBe(1)
  })

  it('reports zero matches without becoming empty', () => {
    const store = useConceptSearchStore()
    store.allConcepts = [...data]
    store.setFacet('vocabularyId', ['NOPE'])
    expect(store.totalCount).toBe(0)
    expect(store.concepts).toHaveLength(0)
    expect(store.isEmpty).toBe(false)
  })

  it('clearFacets restores the full set', () => {
    const store = useConceptSearchStore()
    store.allConcepts = [...data]
    store.setFacet('vocabularyId', ['SNOMED'])
    store.clearFacets()
    expect(store.totalCount).toBe(2)
    expect(store.activeFacetCount).toBe(0)
  })
})
