import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { ConceptSet, ConceptSetItem } from '@/models/concept-set.types'

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
  getMappedSourceCodes: vi.fn(),
}))
vi.mock('@/stores/webapi', () => ({ useWebAPIStore: vi.fn(() => ({ getValidVocabularySource: () => 'SRC' })) }))

import { useConceptSetsStore } from '@/stores/concept-sets'
import { getConceptSetById } from '@/services/concept-set.service'
import { compareConceptSets, resolveConceptSetExpression, getMappedSourceCodes } from '@/services/concept-search.service'

const item = (id: number, name = `C${id}`): ConceptSetItem => ({
  conceptId: id,
  conceptName: name,
  conceptCode: `code${id}`,
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
})

const cs1: ConceptSet = { id: 1, name: 'CS1', items: [item(1), item(2)] }
const cs2: ConceptSet = { id: 2, name: 'CS2', items: [item(2), item(3)] }

describe('concept-sets store — comparison modes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ;(getConceptSetById as ReturnType<typeof vi.fn>).mockResolvedValue(cs2)
  })

  it('defaults comparisonMode to included', () => {
    const store = useConceptSetsStore()
    expect(store.comparisonMode).toBe('included')
  })

  it('expression mode diffs items client-side without calling compareConceptSets', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { ...cs1 }
    await store.loadComparisonForMode('SRC', 2, 'expression')

    expect(compareConceptSets).not.toHaveBeenCalled()
    expect(store.comparisonMode).toBe('expression')
    const by = Object.fromEntries(store.comparison.map(r => [r.conceptId, r]))
    expect(by[1].conceptIn1Only).toBe(1)
    expect(by[2].conceptIn1And2).toBe(1)
    expect(by[3].conceptIn2Only).toBe(1)
  })

  it('included mode delegates to compareConceptSets', async () => {
    ;(compareConceptSets as ReturnType<typeof vi.fn>).mockResolvedValue([
      { conceptId: 9, conceptIn1And2: 1, conceptIn1Only: 0, conceptIn2Only: 0, conceptName: 'X', conceptCode: 'x', conceptClassId: '', domainId: '', vocabularyId: '', standardConcept: 'S', invalidReason: null, validStartDate: null, validEndDate: null, nameMismatch: false },
    ])
    const store = useConceptSetsStore()
    store.currentSet = { ...cs1 }
    await store.loadComparisonForMode('SRC', 2, 'included')

    expect(compareConceptSets).toHaveBeenCalledTimes(1)
    expect(store.comparison[0].conceptId).toBe(9)
  })

  it('caches a computed mode (toggling back does not recompute)', async () => {
    ;(compareConceptSets as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const store = useConceptSetsStore()
    store.currentSet = { ...cs1 }
    await store.loadComparisonForMode('SRC', 2, 'included')
    await store.loadComparisonForMode('SRC', 2, 'expression')
    await store.loadComparisonForMode('SRC', 2, 'included') // cached
    expect(compareConceptSets).toHaveBeenCalledTimes(1)
  })

  it('loadComparison remains an included-mode wrapper', async () => {
    ;(compareConceptSets as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const store = useConceptSetsStore()
    store.currentSet = { ...cs1 }
    await store.loadComparison('SRC', 2)
    expect(compareConceptSets).toHaveBeenCalledTimes(1)
    expect(store.comparisonMode).toBe('included')
  })

  it('source mode resolves both sets and diffs their mapped source codes', async () => {
    ;(resolveConceptSetExpression as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([item(10)])
      .mockResolvedValueOnce([item(20)])
    ;(getMappedSourceCodes as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([item(100), item(101)])
      .mockResolvedValueOnce([item(101), item(102)])
    const store = useConceptSetsStore()
    store.currentSet = { ...cs1 }
    await store.loadComparisonForMode('SRC', 2, 'source')

    expect(resolveConceptSetExpression).toHaveBeenCalledTimes(2)
    expect(getMappedSourceCodes).toHaveBeenCalledTimes(2)
    const by = Object.fromEntries(store.comparison.map(r => [r.conceptId, r]))
    expect(by[100].conceptIn1Only).toBe(1)
    expect(by[101].conceptIn1And2).toBe(1)
    expect(by[102].conceptIn2Only).toBe(1)
  })
})
