/**
 * Tests for the pure import helpers used by the Concept Set Editor:
 * parsePastedIds, parsePastedSourceCodes, and parseConceptSetJson.
 */
import { describe, it, expect } from 'vitest'
import {
  parsePastedIds,
  parsePastedSourceCodes,
  parseConceptSetJson,
} from '@/components/concepts/concept-set-import'

describe('parsePastedIds', () => {
  it('splits on spaces, commas, semicolons, tabs, and newlines', () => {
    expect(parsePastedIds('201826 313217,4329847;443238\n123\t456')).toEqual([
      201826, 313217, 4329847, 443238, 123, 456,
    ])
  })

  it('de-duplicates while preserving first-seen order', () => {
    expect(parsePastedIds('1 2 2 1 3')).toEqual([1, 2, 3])
  })

  it('ignores empty tokens, zero, negatives, and non-numeric tokens', () => {
    expect(parsePastedIds('  , ; abc 0 -5 12 \n')).toEqual([12])
  })

  it('returns an empty array for empty input', () => {
    expect(parsePastedIds('')).toEqual([])
    expect(parsePastedIds('   \n , ; ')).toEqual([])
  })
})

describe('parsePastedSourceCodes', () => {
  it('splits on commas, semicolons, tabs, and newlines but not inner spaces', () => {
    expect(parsePastedSourceCodes('E11.9, 250.00;44054006\nABC 123')).toEqual([
      'E11.9',
      '250.00',
      '44054006',
      'ABC 123',
    ])
  })

  it('trims surrounding whitespace and drops empty tokens', () => {
    expect(parsePastedSourceCodes('  E11.9  \n\n  ,  250.00 ')).toEqual(['E11.9', '250.00'])
  })

  it('de-duplicates while preserving first-seen order', () => {
    expect(parsePastedSourceCodes('A\nB\nA\nC')).toEqual(['A', 'B', 'C'])
  })

  it('returns an empty array for empty input', () => {
    expect(parsePastedSourceCodes('')).toEqual([])
    expect(parsePastedSourceCodes('  , ; \n ')).toEqual([])
  })
})

describe('parseConceptSetJson', () => {
  const validItem = (overrides: Record<string, unknown> = {}) => ({
    concept: {
      CONCEPT_ID: 201826,
      CONCEPT_NAME: 'Type 2 diabetes mellitus',
      CONCEPT_CODE: '44054006',
      DOMAIN_ID: 'Condition',
      VOCABULARY_ID: 'SNOMED',
      CONCEPT_CLASS_ID: 'Clinical Finding',
      STANDARD_CONCEPT: 'S',
      INVALID_REASON: null,
    },
    isExcluded: false,
    includeDescendants: true,
    includeMapped: false,
    ...overrides,
  })

  it('parses a raw expression shape and maps items with flags preserved', () => {
    const json = JSON.stringify({ items: [validItem()] })
    const result = parseConceptSetJson(json)

    expect(result.ok).toBe(true)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      conceptId: 201826,
      conceptName: 'Type 2 diabetes mellitus',
      conceptCode: '44054006',
      isExcluded: false,
      includeDescendants: true,
      includeMapped: false,
    })
  })

  it('accepts an expression nested under an "expression" key', () => {
    const json = JSON.stringify({ expression: { items: [validItem({ isExcluded: true })] } })
    const result = parseConceptSetJson(json)

    expect(result.ok).toBe(true)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ isExcluded: true })
  })

  it('returns an error for empty input', () => {
    const result = parseConceptSetJson('   ')
    expect(result.ok).toBe(false)
    expect(result.items).toEqual([])
    expect(result.error).toMatch(/paste a concept set/i)
  })

  it('returns an error for malformed JSON', () => {
    const result = parseConceptSetJson('{ not valid json')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/invalid json/i)
  })

  it('returns an error when there is no items array', () => {
    const result = parseConceptSetJson(JSON.stringify({ foo: 'bar' }))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/items.*array/i)
  })

  it('returns an error for a non-object top-level value', () => {
    const result = parseConceptSetJson('[1, 2, 3]')
    // Arrays are objects but have no `items` array -> falls through to items check.
    expect(result.ok).toBe(false)
  })

  it('returns an error when an item is missing a valid concept', () => {
    const json = JSON.stringify({ items: [validItem(), { isExcluded: false }] })
    const result = parseConceptSetJson(json)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/item 2/i)
  })

  it('returns an error when CONCEPT_ID is not numeric', () => {
    const bad = validItem()
    ;(bad.concept as Record<string, unknown>).CONCEPT_ID = 'nope'
    const result = parseConceptSetJson(JSON.stringify({ items: [bad] }))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/concept_id/i)
  })

  it('handles an empty items array as a valid (empty) import', () => {
    const result = parseConceptSetJson(JSON.stringify({ items: [] }))
    expect(result.ok).toBe(true)
    expect(result.items).toEqual([])
  })
})
