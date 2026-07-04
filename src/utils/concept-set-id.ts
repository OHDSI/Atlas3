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
 * Whether a reference carries a numeric id at all — including `0`.
 *
 * `0` is ambiguous: it's the placeholder the new-set path stamps on
 * not-yet-persisted sets (see `hasRealConceptSetId`), but it's ALSO a
 * perfectly valid CodesetId in classic Atlas/CIRCE cohort JSON, whose
 * ConceptSets arrays start at 0 (the Eunomia demo cohorts do). A set that is
 * already embedded in the cohort definition with id 0 is real by construction
 * — it exists — so surfaces that list the cohort's OWN sets (the in-definition
 * picker, reuse-in-place) must use this check, not `hasRealConceptSetId`,
 * or every id-0 legacy set becomes unselectable.
 */
export function hasNumericConceptSetId(ref: Pick<ConceptSetReference, 'id'>): boolean {
  return typeof ref.id === 'number' && Number.isFinite(ref.id) && ref.id >= 0
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
 * so id alone can't tell them apart; the name disambiguates.
 *
 * Identity is deliberately `id` + `name` only. `items` is NOT compared: a
 * stored reference often holds a stale or empty item snapshot (e.g. a set
 * assigned before its items were fetched, or edited after being referenced
 * elsewhere), while a fresh selection of the very same set carries the full
 * list. Comparing item counts would then read the same set as "different" and
 * hand it a new id — splitting one concept set across two CodesetIds. The id of
 * a real (server-assigned) set is authoritative; the name only breaks ties
 * between not-yet-persisted sets sharing a placeholder id.
 */
function isSameConceptSet(
  a: Pick<ConceptSetReference, 'id' | 'name'>,
  b: Pick<ConceptSetReference, 'id' | 'name'>
): boolean {
  return a.id === b.id && a.name === b.name
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
  // Reusing one of the cohort's own sets is identity, not entry: return it
  // unchanged even at id 0 (legacy/imported cohorts start CodesetIds at 0).
  // Only NEW sets carrying the placeholder 0 fall through to get a fresh id.
  const isExistingSet = existing.some(cs => isSameConceptSet(cs, ref))
  if (isExistingSet && hasNumericConceptSetId(ref)) return ref

  const collidesWithDifferentSet = existing.some(cs => cs.id === ref.id && !isSameConceptSet(cs, ref))
  if (hasRealConceptSetId(ref) && !collidesWithDifferentSet) return ref
  return { ...ref, id: nextConceptSetId(existing) }
}
