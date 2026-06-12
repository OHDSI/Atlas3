import type { ConceptSetReference } from '@/models/cohort.types'

/**
 * A concept set's `id` is its identity inside a cohort definition: it becomes
 * the Atlas `CodesetId` that every criterion points at, and it's the key the
 * cohort dedupes concept sets on. A freshly created (not-yet-persisted) concept
 * set arrives without a real id — the new-set/WebAPI path yields `id: 0` (or
 * `undefined`). If left unchanged, every new set shares the same id and they
 * collapse onto each other: adding a second concept set silently overrides the
 * first wherever the cohort collects concept sets by id (export, Atlas
 * conversion, validation).
 *
 * `hasRealConceptSetId` reports whether a reference already carries a usable id.
 * The Atlas converter only emits a `CodesetId` for numeric ids, so a real id
 * here means a positive number. (Client-side UUID strings are produced by other
 * pickers, but they don't survive Atlas conversion; new sets assigned inside the
 * cohort builder get a unique numeric id instead.)
 */
export function hasRealConceptSetId(ref: Pick<ConceptSetReference, 'id'>): boolean {
  return typeof ref.id === 'number' && Number.isFinite(ref.id) && ref.id > 0
}

/**
 * Pick the next free numeric concept-set id given the sets already used by the
 * cohort. Returns `max(existing numeric ids) + 1`, or `1` when there are none.
 */
export function nextConceptSetId(existing: ReadonlyArray<Pick<ConceptSetReference, 'id'>>): number {
  const numericIds = existing
    .map(cs => cs.id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
  return (numericIds.length ? Math.max(...numericIds) : 0) + 1
}

/**
 * Whether two references point at the same concept set. Two freshly created
 * sets can carry the same (broken) id — 0 or, depending on the create path, 1 —
 * so id alone can't tell them apart; name and concept count disambiguate.
 */
function isSameConceptSet(
  a: Pick<ConceptSetReference, 'id' | 'name' | 'items'>,
  b: Pick<ConceptSetReference, 'id' | 'name' | 'items'>
): boolean {
  return a.id === b.id && a.name === b.name && (a.items?.length ?? 0) === (b.items?.length ?? 0)
}

/**
 * Ensure a concept-set reference has an id that's unique among the sets already
 * used by the cohort, before it enters the cohort. A reference keeps its id when
 * it has a real one AND nothing else in `existing` is a *different* set sharing
 * that id. It gets a fresh id when its id is missing/zero, or when its id is
 * already taken by a different set (e.g. two new sets the create path both
 * stamped with id 1). Re-selecting the same existing set is preserved — it
 * matches an entry in `existing` and is returned unchanged so it dedupes to one.
 */
export function ensureUniqueConceptSetId(
  ref: ConceptSetReference,
  existing: ReadonlyArray<Pick<ConceptSetReference, 'id' | 'name' | 'items'>>
): ConceptSetReference {
  const collidesWithDifferentSet = existing.some(cs => cs.id === ref.id && !isSameConceptSet(cs, ref))
  if (hasRealConceptSetId(ref) && !collidesWithDifferentSet) return ref
  return { ...ref, id: nextConceptSetId(existing) }
}
