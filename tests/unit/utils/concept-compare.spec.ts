import { describe, it, expect } from 'vitest'
import { diffConceptLists } from '@/utils/concept-compare'
import type { Concept } from '@/models/concept-set.types'

const c = (id: number, name = `C${id}`): Concept => ({
  conceptId: id,
  conceptName: name,
  conceptCode: `code${id}`,
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
})

describe('diffConceptLists', () => {
  it('classifies left-only, right-only and shared concepts', () => {
    const rows = diffConceptLists([c(1), c(2)], [c(2), c(3)])
    const by = Object.fromEntries(rows.map(r => [r.conceptId, r]))
    expect(by[1].conceptIn1Only).toBe(1)
    expect(by[1].conceptIn1And2).toBe(0)
    expect(by[3].conceptIn2Only).toBe(1)
    expect(by[2].conceptIn1And2).toBe(1)
    expect(by[2].conceptIn1Only).toBe(0)
    expect(rows).toHaveLength(3)
  })

  it('flags nameMismatch when the same id has different names', () => {
    const rows = diffConceptLists([c(1, 'Alpha')], [c(1, 'Beta')])
    expect(rows[0].conceptIn1And2).toBe(1)
    expect(rows[0].nameMismatch).toBe(true)
  })

  it('does not flag nameMismatch for matching names', () => {
    const rows = diffConceptLists([c(1, 'Same')], [c(1, 'Same')])
    expect(rows[0].nameMismatch).toBe(false)
  })

  it('returns an empty array for two empty lists', () => {
    expect(diffConceptLists([], [])).toEqual([])
  })
})
