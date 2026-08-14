import type { ConceptSetReference } from '@/models/cohort.types'

/**
 * A concept set's `id` is its identity inside a cohort definition: it becomes
 * the Atlas `CodesetId` that every criterion points at, and it's the key the
 * cohort dedupes concept sets on. A freshly created (not-yet-persisted) concept
 * set arrives without a real id — the new-set path yields `id: undefined`.
 * If left unchanged, every new set shares the same placeholder and they
 * collapse onto each other: adding a second concept set silently overrides the
 * first wherever the cohort collects concept sets by id (export, Atlas
 * conversion, validation).
 *
 * `hasRealConceptSetId` reports whether a reference already carries a usable id.
 * The Atlas converter only emits a `CodesetId` for numeric ids, so a real id
 * here means a number (including 0, which is valid in legacy OHDSI/CIRCE cohorts).
 * Client-side UUIDs are produced by other pickers, but they don't survive Atlas
 * conversion; new sets assigned inside the cohort builder get a unique numeric id.
 */
export function hasRealConceptSetId(ref: Pick<ConceptSetReference, 'id'>): boolean {
  return typeof ref.id === 'number' && Number.isFinite(ref.id)
}

/**
 * Whether a reference carries a numeric id (including `0`, which is valid
 * in legacy OHDSI/CIRCE cohorts). Returns false for undefined/null placeholders.
 *
 * Surfaces that list the cohort's OWN sets (the in-definition picker, reuse-in-place)
 * must use this check, not `hasRealConceptSetId`, so that legacy id=0 sets remain
 * selectable. But this returns false for placeholder ids (undefined), which is correct
 * since those haven't been assigned yet.
 */
export function hasNumericConceptSetId(
  ref: Pick<ConceptSetReference, 'id'> | null | undefined
): boolean {
  return !!ref && typeof ref.id === 'number' && Number.isFinite(ref.id) && ref.id >= 0
}

/**
 * Pick the next free numeric concept-set id given the sets already used by the
 * cohort. Returns `0` when there are no existing sets, otherwise `max(existing) + 1`.
 * This ensures the first concept set in any cohort starts at `0` (valid in both
 * legacy OHDSI/CIRCE and new cohorts), and subsequent sets increment from there.
 */
export function nextConceptSetId(existing: ReadonlyArray<Pick<ConceptSetReference, 'id'>>): number {
  const numericIds = existing
    .map(cs => cs.id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
  return numericIds.length ? Math.max(...numericIds) + 1 : 0
}

/**
 * Whether two references point at the same concept set. Matching is by id + name.
 * For real (numeric) ids, id alone is authoritative. For placeholder ids (undefined),
 * the name disambiguates between different new sets.
 *
 * Identity is deliberately `id` + `name` only. `items` is NOT compared: a
 * stored reference often holds a stale or empty item snapshot (e.g. a set
 * assigned before its items were fetched, or edited after being referenced
 * elsewhere), while a fresh selection of the very same set carries the full
 * list. Comparing item counts would then read the same set as "different" and
 * hand it a new id — splitting one concept set across two CodesetIds.
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
 * it has a real numeric one AND nothing else in `existing` is a *different* set sharing
 * that id. It gets a fresh id when its id is undefined/null (placeholder), or when its id
 * is already taken by a different set (e.g. two new sets both with undefined placeholders).
 * Re-selecting the same existing set is preserved — it matches an entry in `existing`
 * and is returned unchanged so it dedupes to one.
 */
export function ensureUniqueConceptSetId(
  ref: ConceptSetReference,
  existing: ReadonlyArray<Pick<ConceptSetReference, 'id' | 'name' | 'items'>>
): ConceptSetReference {
  // Reusing one of the cohort's own sets is identity, not entry: return it
  // unchanged even if id is 0 (valid in legacy/imported cohorts). Only NEW sets
  // carrying the placeholder (undefined) fall through to get a fresh id.
  const isExistingSet = existing.some(cs => isSameConceptSet(cs, ref))
  if (isExistingSet && hasNumericConceptSetId(ref)) return ref

  const collidesWithDifferentSet = existing.some(cs => cs.id === ref.id && !isSameConceptSet(cs, ref))
  if (hasRealConceptSetId(ref) && !collidesWithDifferentSet) return ref
  return { ...ref, id: nextConceptSetId(existing) }
}
