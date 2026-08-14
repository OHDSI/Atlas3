/**
 * atlas-concept-set.ts
 *
 * Converts a concept set from the flat Atlas shape used by the repository, the
 * concept-set editor and the agent bridge into the nested circe shape the cohort
 * expression stores.
 *
 * The two differ in more than naming: Atlas items carry concept fields inline
 * (`conceptId`, `conceptName`, …) while circe nests them under `concept` in
 * SCREAMING_CASE (`CONCEPT_ID`, `CONCEPT_NAME`, …). Writing an Atlas-shaped item
 * into the expression produces a codeset that matches nothing, because WebAPI
 * reads the nested form.
 *
 * This lived as two identical private copies, in useCirceConceptSetPicker and in
 * CohortBuilder. Whichever one a caller happened to reach determined whether the
 * items survived, so it is shared here.
 */
import type { ConceptSetItem as CirceConceptSetItem, ConceptSet } from '@/models/circe-types'

/** The flat item shape used throughout the Atlas-facing side of the app. */
export interface AtlasConceptSetItem {
  conceptId: number
  conceptName?: string
  conceptCode?: string
  standardConcept?: string
  invalidReason?: string | null
  domainId?: string
  vocabularyId?: string
  conceptClassId?: string
  isExcluded?: boolean
  includeDescendants?: boolean
  includeMapped?: boolean
}

/**
 * Items reach this from two directions: the repository and concept-set editor
 * send the flat Atlas shape, while the agent bridge and anything read back out
 * of an expression already carry the nested circe shape. Converting one that is
 * already converted reads `item.conceptId` off an object that has no such field
 * and produces `CONCEPT_ID: undefined` — a codeset that matches nothing, which
 * is the very failure this conversion exists to prevent. So already-circe items
 * pass through untouched.
 */
export function convertAtlasItemToCirce(
  item: AtlasConceptSetItem | CirceConceptSetItem
): CirceConceptSetItem {
  if (isCirceItem(item)) return item

  return {
    concept: {
      CONCEPT_ID: item.conceptId,
      CONCEPT_NAME: item.conceptName,
      CONCEPT_CODE: item.conceptCode,
      STANDARD_CONCEPT: item.standardConcept,
      INVALID_REASON: item.invalidReason,
      DOMAIN_ID: item.domainId,
      VOCABULARY_ID: item.vocabularyId,
      CONCEPT_CLASS_ID: item.conceptClassId,
    },
    isExcluded: item.isExcluded,
    includeDescendants: item.includeDescendants,
    includeMapped: item.includeMapped,
  }
}

/**
 * Builds the expression-level concept set entry for a set that arrived in Atlas
 * shape.
 *
 * A `CodesetId` can only reference a numeric id, but sets reaching here often
 * carry a client-minted string uid instead (that is what the agent bridge
 * produces). Passing `existing` lets one be allocated from the expression's own
 * sets, so the caller does not depend on something upstream having done it
 * first. Without `existing`, a non-numeric id yields undefined.
 */
export function circeConceptSetFromAtlas(
  set: {
    id?: number | string | null
    name?: string
    items?: Array<AtlasConceptSetItem | CirceConceptSetItem>
  },
  existing?: ReadonlyArray<ConceptSet>,
): ConceptSet | undefined {
  const id = typeof set.id === 'number' ? set.id : existing && nextConceptSetId(existing)
  if (typeof id !== 'number') return undefined

  return {
    id,
    name: set.name ?? '',
    expression: { items: (set.items ?? []).map(convertAtlasItemToCirce) },
  }
}

function isCirceItem(item: AtlasConceptSetItem | CirceConceptSetItem): item is CirceConceptSetItem {
  return typeof (item as CirceConceptSetItem).concept === 'object'
    && (item as CirceConceptSetItem).concept !== null
}

/** Lowest unused numeric id across the expression's concept sets. */
export function nextConceptSetId(existing: ReadonlyArray<Pick<ConceptSet, 'id'>>): number {
  const numericIds = existing
    .map(cs => cs.id)
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))

  return numericIds.length ? Math.max(...numericIds) + 1 : 0
}
