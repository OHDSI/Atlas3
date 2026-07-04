import { describe, it, expect } from 'vitest'
import {
  hasRealConceptSetId,
  hasNumericConceptSetId,
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

  describe('hasNumericConceptSetId', () => {
    it('accepts id 0 — a valid CodesetId in legacy/imported cohorts', () => {
      expect(hasNumericConceptSetId({ id: 0 })).toBe(true)
      expect(hasNumericConceptSetId({ id: 5 })).toBe(true)
    })

    it('rejects id-less placeholders and non-numeric ids', () => {
      expect(hasNumericConceptSetId({ id: undefined as unknown as number })).toBe(false)
      expect(hasNumericConceptSetId({ id: '' })).toBe(false)
      expect(hasNumericConceptSetId({ id: 'uuid-string' })).toBe(false)
      expect(hasNumericConceptSetId({ id: -1 })).toBe(false)
      expect(hasNumericConceptSetId({ id: NaN })).toBe(false)
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

    it('keeps the same id when the stored item snapshot differs in length', () => {
      // The stored reference holds a stale/empty item snapshot (e.g. assigned
      // before items were fetched, or the set was later edited), while the fresh
      // selection of the SAME set carries the full list. Identity must not depend
      // on item count, otherwise the set is detached onto a new CodesetId and the
      // cohort exports the same concept set twice.
      const used: ConceptSetReference[] = [{ id: 5, name: 'Diabetes', items: [] }]

      const again = ensureUniqueConceptSetId(
        { id: 5, name: 'Diabetes', items: [{}, {}, {}] },
        used
      )
      expect(again.id).toBe(5)
    })

    it('leaves a concept set with a real, non-colliding id untouched', () => {
      const ref: ConceptSetReference = { id: 42, name: 'Existing', items: [] }
      expect(ensureUniqueConceptSetId(ref, [])).toBe(ref)
    })

    it('reuses an already-embedded id-0 set in place (legacy CodesetIds start at 0)', () => {
      // The Eunomia demo cohort embeds "diclofenac" at CodesetId 0. Selecting
      // it from the in-definition picker must keep id 0 — minting a fresh id
      // would split one concept set across two CodesetIds.
      const used: ConceptSetReference[] = [{ id: 0, name: 'diclofenac', items: [{}] }]
      const again = ensureUniqueConceptSetId({ id: 0, name: 'diclofenac', items: [{}] }, used)
      expect(again.id).toBe(0)
    })

    it('still mints a fresh id for a NEW set carrying the placeholder id 0', () => {
      // A different (new) set that happens to arrive with the placeholder 0
      // must NOT collide with the embedded id-0 set.
      const used: ConceptSetReference[] = [{ id: 0, name: 'diclofenac', items: [{}] }]
      const fresh = ensureUniqueConceptSetId({ id: 0, name: 'Hypertension', items: [] }, used)
      expect(fresh.id).toBe(1)
    })
  })
})
