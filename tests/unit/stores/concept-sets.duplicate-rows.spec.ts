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

const other: Concept = { ...concept, conceptId: 999, conceptName: 'Other' }

/**
 * Once one concept can hold several rows, every edit has to name the row it
 * means. Addressing by concept id would hit the row's siblings too (#226).
 */
describe('per-row edits when a concept appears more than once', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function storeWithBothRows() {
    const s = useConceptSetsStore()
    s.currentSet = { name: 'Test', items: [] }
    // The "descendants of X but not X itself" pair.
    s.addConceptToSet(concept, { includeDescendants: true })
    s.addConceptToSet(concept, { isExcluded: true })
    return s
  }

  it('removes only the row it was given', () => {
    const s = storeWithBothRows()
    const excludedRow = s.currentSet!.items[1]!

    s.removeConceptItem(excludedRow)

    expect(s.currentSet?.items).toHaveLength(1)
    expect(s.currentSet?.items[0]).toMatchObject({
      conceptId: 313217,
      includeDescendants: true,
      isExcluded: false,
    })
  })

  it('toggles a flag on the row it was given, leaving its sibling alone', () => {
    const s = storeWithBothRows()
    const excludedRow = s.currentSet!.items[1]!

    s.toggleConceptItemFlag(excludedRow, 'includeMapped')

    expect(s.currentSet?.items[0]).toMatchObject({ includeMapped: false })
    expect(s.currentSet?.items[1]).toMatchObject({ includeMapped: true })
  })

  it('refuses a toggle that would make two rows identical', () => {
    const s = useConceptSetsStore()
    s.currentSet = { name: 'Test', items: [] }
    s.addConceptToSet(concept, { includeDescendants: true })
    s.addConceptToSet(concept, { includeDescendants: false })

    // Turning the second row's descendants on would duplicate the first row,
    // which addConceptToSet would equally have refused.
    s.toggleConceptItemFlag(s.currentSet!.items[1]!, 'includeDescendants')

    expect(s.currentSet?.items[1]).toMatchObject({ includeDescendants: false })
    expect(s.error).toBe('Another entry for this concept already uses those options')
  })

  it('accepts a copy of the row rather than the stored object', () => {
    const s = storeWithBothRows()
    const copy = { ...s.currentSet!.items[1]! }

    s.removeConceptItem(copy)

    expect(s.currentSet?.items).toHaveLength(1)
    expect(s.currentSet?.items[0]).toMatchObject({ includeDescendants: true })
  })

  it('sets all flags on one row at once', () => {
    const s = storeWithBothRows()

    s.setConceptItemFlags(s.currentSet!.items[0]!, {
      isExcluded: false,
      includeDescendants: false,
      includeMapped: true,
    })

    expect(s.currentSet?.items[0]).toMatchObject({
      includeDescendants: false,
      includeMapped: true,
      isExcluded: false,
    })
    expect(s.currentSet?.items[1]).toMatchObject({ isExcluded: true, includeMapped: false })
  })

  it('leaves other concepts untouched', () => {
    const s = storeWithBothRows()
    s.addConceptToSet(other)

    s.removeConceptItem(s.currentSet!.items[0]!)

    expect(s.currentSet?.items.map(i => i.conceptId)).toEqual([313217, 999])
  })

  describe('with no concept set open', () => {
    it('reports the missing set rather than mutating nothing silently', () => {
      const s = useConceptSetsStore()
      const row = { conceptId: 1 } as never

      s.removeConceptItem(row)
      expect(s.error).toBe('No concept set selected')

      s.error = null
      s.toggleConceptItemFlag(row, 'isExcluded')
      expect(s.error).toBe('No concept set selected')

      s.error = null
      s.setConceptItemFlags(row, { isExcluded: true })
      expect(s.error).toBe('No concept set selected')
    })
  })
})
