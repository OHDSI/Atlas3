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
  standardConcept?: string | null
  invalidReason?: string | null
  standardConceptCaption: string
  invalidReasonCaption: string
  validStartDate: number
  validEndDate: number
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
  if (isCirceItem(item)) return withCirceCaptions(item)

  return {
    concept: {
      CONCEPT_ID: item.conceptId,
      CONCEPT_NAME: item.conceptName ?? '',
      STANDARD_CONCEPT_CAPTION: item.standardConceptCaption || standardConceptCaption(item.standardConcept),
      INVALID_REASON_CAPTION: item.invalidReasonCaption || invalidReasonCaption(item.invalidReason),
      CONCEPT_CODE: item.conceptCode ?? '',
      STANDARD_CONCEPT: item.standardConcept ?? null,
      INVALID_REASON: item.invalidReason ?? null,
      DOMAIN_ID: item.domainId ?? '',
      VOCABULARY_ID: item.vocabularyId ?? '',
      CONCEPT_CLASS_ID: item.conceptClassId ?? '',
    },
    isExcluded: item.isExcluded,
    includeDescendants: item.includeDescendants,
    includeMapped: item.includeMapped,
  }
}

/**
 * Converts a nested circe concept-set item back into the flat Atlas-facing
 * shape used by the concept-set editor and builder UIs.
 */
export function convertCirceItemToAtlas(item: CirceConceptSetItem): AtlasConceptSetItem {
  const concept = item.concept
  return {
    conceptId: concept?.CONCEPT_ID ?? 0,
    conceptName: concept?.CONCEPT_NAME ?? '',
    conceptCode: concept?.CONCEPT_CODE ?? '',
    domainId: concept?.DOMAIN_ID ?? '',
    vocabularyId: concept?.VOCABULARY_ID ?? '',
    conceptClassId: concept?.CONCEPT_CLASS_ID ?? '',
    standardConcept: concept?.STANDARD_CONCEPT ?? null,
    invalidReason: concept?.INVALID_REASON ?? null,
    standardConceptCaption: concept?.STANDARD_CONCEPT_CAPTION ?? '',
    invalidReasonCaption: concept?.INVALID_REASON_CAPTION ?? '',
    validStartDate: 0,
    validEndDate: 0,
    isExcluded: item.isExcluded ?? false,
    includeDescendants: item.includeDescendants ?? false,
    includeMapped: item.includeMapped ?? false,
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
 *
 * Repository ids and the expression's local codeset ids are separate number
 * spaces that overlap, so a numeric id is only kept when no *different* set in
 * the expression already holds it — otherwise the criterion built from this id
 * would resolve to that other set. Identity is approximated by id+name, the
 * same way useCirceConceptSetPicker does it.
 */
export function circeConceptSetFromAtlas(
  set: {
    id?: number | string | null
    name?: string
    items?: Array<AtlasConceptSetItem | CirceConceptSetItem>
  },
  existing?: ReadonlyArray<ConceptSet>,
): ConceptSet | undefined {
  const id = resolveCodesetId(set.id, set.name ?? '', existing)
  if (typeof id !== 'number') return undefined

  return {
    id,
    name: set.name ?? '',
    expression: { items: (set.items ?? []).map(convertAtlasItemToCirce) },
  }
}

function resolveCodesetId(
  id: number | string | null | undefined,
  name: string,
  existing?: ReadonlyArray<ConceptSet>,
): number | undefined {
  if (typeof id !== 'number') return existing && nextConceptSetId(existing)
  if (!existing) return id

  const collision = existing.find(cs => cs.id === id)
  if (!collision || collision.name === name) return id

  return nextConceptSetId(existing)
}

/**
 * STANDARD_CONCEPT_CAPTION / INVALID_REASON_CAPTION are computed getters on
 * circe's Java Concept, so they only appear when WebAPI re-serializes an
 * expression through circe (cohort definitions do; IR analyses store the
 * client's string verbatim). Atlas-side items usually lack them, so derive them
 * here the same way circe does to keep every expression schema-valid.
 */
function standardConceptCaption(standardConcept: string | null | undefined): string {
  switch (standardConcept) {
    case 'N': return 'Non-Standard'
    case 'S': return 'Standard'
    case 'C': return 'Classification'
    default: return 'Unknown'
  }
}

function invalidReasonCaption(invalidReason: string | null | undefined): string {
  switch (invalidReason) {
    case 'V': return 'Valid'
    case 'D':
    case 'U': return 'Invalid'
    default: return 'Unknown'
  }
}

function withCirceCaptions(item: CirceConceptSetItem): CirceConceptSetItem {
  const concept = item.concept
  if (!concept || (concept.STANDARD_CONCEPT_CAPTION && concept.INVALID_REASON_CAPTION)) return item
  return {
    ...item,
    concept: {
      ...concept,
      STANDARD_CONCEPT_CAPTION: concept.STANDARD_CONCEPT_CAPTION || standardConceptCaption(concept.STANDARD_CONCEPT),
      INVALID_REASON_CAPTION: concept.INVALID_REASON_CAPTION || invalidReasonCaption(concept.INVALID_REASON),
    },
  }
}

/**
 * Fills missing concept captions across a raw (not yet validated) ConceptSets
 * array, e.g. one read back from a stored expression saved before captions
 * were derived on conversion. Anything that is not a nested circe item is left
 * untouched for the schema to judge.
 */
export function fillConceptSetCaptions(conceptSets: unknown): unknown {
  if (!Array.isArray(conceptSets)) return conceptSets
  return conceptSets.map(set => {
    const items = set?.expression?.items
    if (!Array.isArray(items)) return set
    return {
      ...set,
      expression: {
        ...set.expression,
        items: items.map(item => (item && isCirceItem(item) ? withCirceCaptions(item) : item)),
      },
    }
  })
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
