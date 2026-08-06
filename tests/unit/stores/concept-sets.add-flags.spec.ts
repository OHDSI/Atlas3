import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/services/concept-set.service', () => ({
  getConceptSets: vi.fn().mockResolvedValue([]),
  getConceptSetById: vi.fn(),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
  getConceptSetExpression: vi.fn(),
  getConceptSetItems: vi.fn(),
  saveConceptSetItems: vi.fn(),
  checkConceptSetName: vi.fn(),
}))

vi.mock('@/services/concept-search.service', () => ({
  getRecommendedConcepts: vi.fn(),
  getConceptRecordCounts: vi.fn(),
  compareConceptSets: vi.fn(),
  resolveConceptSetExpression: vi.fn(),
  getMappedSourceCodes: vi.fn(),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({ getValidVocabularySource: () => 'SRC', sources: [] })),
}))

const concept: Concept = {
  conceptId: 313217,
  conceptName: 'Atrial fibrillation',
  conceptCode: '49436004',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

describe('addConceptToSet — add-time flags (#163)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function store() {
    const s = useConceptSetsStore()
    s.currentSet = { name: 'Test', items: [] }
    return s
  }

  it('defaults every flag to false when none are given', () => {
    const s = store()
    s.addConceptToSet(concept)

    expect(s.currentSet?.items[0]).toMatchObject({
      isExcluded: false,
      includeDescendants: false,
      includeMapped: false,
    })
  })

  it('applies descendants at add time', () => {
    const s = store()
    s.addConceptToSet(concept, { includeDescendants: true })

    expect(s.currentSet?.items[0]).toMatchObject({
      isExcluded: false,
      includeDescendants: true,
      includeMapped: false,
    })
  })

  it('applies exclude and mapped at add time', () => {
    const s = store()
    s.addConceptToSet(concept, { isExcluded: true, includeMapped: true })

    expect(s.currentSet?.items[0]).toMatchObject({
      isExcluded: true,
      includeDescendants: false,
      includeMapped: true,
    })
  })

  it('applies all three together', () => {
    const s = store()
    s.addConceptToSet(concept, {
      isExcluded: true,
      includeDescendants: true,
      includeMapped: true,
    })

    expect(s.currentSet?.items[0]).toMatchObject({
      isExcluded: true,
      includeDescendants: true,
      includeMapped: true,
    })
  })

  it('still rejects a duplicate regardless of the flags supplied', () => {
    const s = store()
    s.addConceptToSet(concept, { includeDescendants: true })
    s.addConceptToSet(concept, { isExcluded: true })

    expect(s.currentSet?.items).toHaveLength(1)
    expect(s.currentSet?.items[0]?.includeDescendants).toBe(true)
    expect(s.currentSet?.items[0]?.isExcluded).toBe(false)
    expect(s.error).toBe('Concept already exists in this set')
  })

  it('keeps flags independent per concept', () => {
    const s = store()
    s.addConceptToSet(concept, { includeDescendants: true })
    s.addConceptToSet({ ...concept, conceptId: 999 }, { isExcluded: true })

    expect(s.currentSet?.items[0]).toMatchObject({ includeDescendants: true, isExcluded: false })
    expect(s.currentSet?.items[1]).toMatchObject({ includeDescendants: false, isExcluded: true })
  })
})
