import { describe, it, expect } from 'vitest'
import {
  hasRealConceptSetId,
  nextConceptSetId,
  ensureUniqueConceptSetId,
} from '@/utils/concept-set-id'
import type { ConceptSetReference } from '@/models/cohort.types'

describe('concept-set-id helpers', () => {
  describe('hasRealConceptSetId', () => {
    it('treats id 0, undefined and empty string as not-yet-assigned', () => {
      expect(hasRealConceptSetId({ id: 0 })).toBe(false)
      expect(hasRealConceptSetId({ id: undefined as unknown as number })).toBe(false)
      expect(hasRealConceptSetId({ id: '' })).toBe(false)
    })

    it('treats a positive numeric id as real', () => {
      expect(hasRealConceptSetId({ id: 5 })).toBe(true)
    })
  })

  describe('nextConceptSetId', () => {
    it('starts at 1 when there are no concept sets', () => {
      expect(nextConceptSetId([])).toBe(1)
    })

    it('returns one past the highest existing numeric id', () => {
      expect(nextConceptSetId([{ id: 1 }, { id: 7 }, { id: 3 }])).toBe(8)
    })

    it('ignores non-numeric ids', () => {
      expect(nextConceptSetId([{ id: 'abc' }, { id: 2 }])).toBe(3)
    })
  })

  describe('ensureUniqueConceptSetId', () => {
    it('assigns a unique id to a new (id 0) concept set so it does not override existing ones', () => {
      const existing: ConceptSetReference[] = [{ id: 1, name: 'Diabetes', items: [] }]
      const fresh: ConceptSetReference = { id: 0, name: 'Hypertension', items: [] }

      const result = ensureUniqueConceptSetId(fresh, existing)

      expect(result.id).toBe(2)
      // Distinct from the already-added set — appends rather than collides.
      expect(result.id).not.toBe(existing[0]?.id)
    })

    it('two consecutively added id-0 sets receive distinct ids', () => {
      const used: ConceptSetReference[] = []

      const a = ensureUniqueConceptSetId({ id: 0, name: 'A', items: [] }, used)
      used.push(a)
      const b = ensureUniqueConceptSetId({ id: 0, name: 'B', items: [] }, used)
      used.push(b)

      expect(a.id).toBe(1)
      expect(b.id).toBe(2)
    })

    it('reassigns a distinct set that collides on a positive id (both stamped id 1)', () => {
      const used: ConceptSetReference[] = []

      // The create path hands both new sets id 1 (a "real" positive id).
      const a = ensureUniqueConceptSetId({ id: 1, name: 'A', items: [] }, used)
      used.push(a)
      const b = ensureUniqueConceptSetId({ id: 1, name: 'B', items: [] }, used)
      used.push(b)

      expect(a.id).toBe(1)
      expect(b.id).toBe(2) // must not stay 1 and override A
      expect(used.map(cs => cs.id)).toEqual([1, 2])
    })

    it('preserves re-selecting the same existing set (same id, name and items)', () => {
      const shared: ConceptSetReference = { id: 5, name: 'Diabetes', items: [{}, {}] }
      const used: ConceptSetReference[] = [shared]

      // Selecting the very same concept set again for another criterion keeps id 5
      // so it dedupes to a single concept set rather than being split in two.
      const again = ensureUniqueConceptSetId({ id: 5, name: 'Diabetes', items: [{}, {}] }, used)
      expect(again.id).toBe(5)
    })

    it('leaves a concept set with a real, non-colliding id untouched', () => {
      const ref: ConceptSetReference = { id: 42, name: 'Existing', items: [] }
      expect(ensureUniqueConceptSetId(ref, [])).toBe(ref)
    })
  })
})
