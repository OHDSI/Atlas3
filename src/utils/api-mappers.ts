/**
 * API Response Mappers
 * Convert WebAPI UPPERCASE responses to camelCase TypeScript interfaces
 */
import type {
  Concept,
  ConceptSearchResponseItem,
  ConceptSetItem,
  ConceptSet,
  ConceptSetExpression,
  ConceptSetExpressionItem,
  ComparisonResultItem,
} from '@/models/concept-set.types'
import type { Tag } from '@/models/cohort.types'

/**
 * WebAPI concept set metadata response format
 */
export interface ConceptSetAPIMetadata {
  id: number
  name: string
  createdDate?: string | number
  createdBy?: string | { id: number; name: string | null; login: string }
  modifiedDate?: string | number
  modifiedBy?: string | { id: number; name: string | null; login: string }
  shared?: boolean
  tags?: Tag[]
}

/**
 * WebAPI concept set expression response format
 */
export interface ConceptSetAPIExpression {
  items?: Array<{
    concept: {
      CONCEPT_ID: number
      CONCEPT_NAME: string
      CONCEPT_CODE: string
      DOMAIN_ID: string
      VOCABULARY_ID: string
      CONCEPT_CLASS_ID: string
      STANDARD_CONCEPT: string | null
      INVALID_REASON: string | null
    }
    isExcluded: boolean
    includeDescendants: boolean
    includeMapped: boolean
  }>
}

/**
 * Combined WebAPI concept set response (metadata + expression)
 */
export interface ConceptSetAPIResponse extends ConceptSetAPIMetadata {
  expression?: ConceptSetAPIExpression
}

/**
 * WebAPI returns `INVALID_REASON` as the literal string `"V"` for a valid
 * concept rather than `null`, on concept-set expressions (#221) and on
 * `/vocabulary/{key}/search` results alike (#297). Every UI badge and facet
 * checks `invalidReason` for truthiness, so a raw `"V"` reads as "invalid"
 * unless it is normalized back to `null` at each mapping boundary.
 */
export function normalizeInvalidReason(invalidReason: string | null | undefined): string | null {
  return invalidReason && invalidReason !== 'V' ? invalidReason : null
}

/**
 * Map a WebAPI concept-search response item (UPPERCASE) to Concept interface (camelCase)
 */
export function mapConceptFromAPI(raw: ConceptSearchResponseItem): Concept {
  const concept: Concept = {
    conceptId: raw.CONCEPT_ID,
    conceptName: raw.CONCEPT_NAME,
    conceptCode: raw.CONCEPT_CODE,
    domainId: raw.DOMAIN_ID,
    vocabularyId: raw.VOCABULARY_ID,
    conceptClassId: raw.CONCEPT_CLASS_ID ?? "",
    standardConcept: raw.STANDARD_CONCEPT ?? null,
    invalidReason: normalizeInvalidReason(raw.INVALID_REASON),
  }
  if (raw.RELATIONSHIPS !== undefined) {
    concept.relationships = raw.RELATIONSHIPS
  }
  return concept
}

/**
 * Map Concept to ConceptSetItem (adds default flags)
 */
export function conceptToConceptSetItem(
  concept: Concept,
  options?: {
    isExcluded?: boolean
    includeDescendants?: boolean
    includeMapped?: boolean
  }
): ConceptSetItem {
  return {
    ...concept,
    isExcluded: options?.isExcluded ?? false,
    includeDescendants: options?.includeDescendants ?? false,
    includeMapped: options?.includeMapped ?? false,
  }
}

/**
 * Map a WebAPI concept set expression (shared by the current-version and
 * per-version expression endpoints) to ConceptSetItem[]
 */
export function mapExpressionItemsFromAPI(
  expression: ConceptSetAPIExpression | undefined
): ConceptSetItem[] {
  return (
    expression?.items?.map(item => ({
      conceptId: item.concept.CONCEPT_ID,
      conceptName: item.concept.CONCEPT_NAME,
      conceptCode: item.concept.CONCEPT_CODE,
      domainId: item.concept.DOMAIN_ID,
      vocabularyId: item.concept.VOCABULARY_ID,
      conceptClassId: item.concept.CONCEPT_CLASS_ID,
      standardConcept: item.concept.STANDARD_CONCEPT,
      invalidReason: normalizeInvalidReason(item.concept.INVALID_REASON),
      isExcluded: item.isExcluded,
      includeDescendants: item.includeDescendants,
      includeMapped: item.includeMapped,
    })) || []
  )
}

/**
 * Map WebAPI concept set response to ConceptSet interface
 */
export function mapConceptSetFromAPI(raw: ConceptSetAPIResponse): ConceptSet {
  // Extract user login from user object if present
  const getLogin = (userOrString: string | { login: string } | undefined) => {
    if (!userOrString) return undefined
    if (typeof userOrString === 'string') return userOrString
    return userOrString.login
  }

  return {
    id: raw.id,
    name: raw.name,
    createdDate: raw.createdDate,
    createdBy: getLogin(raw.createdBy),
    modifiedDate: raw.modifiedDate,
    modifiedBy: getLogin(raw.modifiedBy),
    shared: raw.shared ?? false,
    tags: raw.tags ?? [],
    items: mapExpressionItemsFromAPI(raw.expression),
  }
}

/**
 * Map ConceptSetItem to WebAPI ConceptSetExpressionItem (UPPERCASE concept fields)
 */
export function conceptSetItemToExpressionItem(item: ConceptSetItem): ConceptSetExpressionItem {
  return {
    concept: {
      CONCEPT_ID: item.conceptId,
      CONCEPT_NAME: item.conceptName,
      CONCEPT_CODE: item.conceptCode,
      DOMAIN_ID: item.domainId,
      VOCABULARY_ID: item.vocabularyId,
      CONCEPT_CLASS_ID: item.conceptClassId,
      STANDARD_CONCEPT: item.standardConcept,
      INVALID_REASON: item.invalidReason,
    },
    isExcluded: item.isExcluded,
    includeDescendants: item.includeDescendants,
    includeMapped: item.includeMapped,
  }
}

export function mapComparisonItemFromAPI(raw: ComparisonResultItem): ComparisonResultItem {
  return raw
}

/**
 * Map ConceptSet to WebAPI format for save operations
 */
export function mapConceptSetToAPI(conceptSet: ConceptSet): {
  id?: number
  name: string
  shared?: boolean
  expression: ConceptSetExpression
} {
  return {
    id: typeof conceptSet.id === 'number' ? conceptSet.id : undefined,
    name: conceptSet.name,
    shared: conceptSet.shared,
    expression: {
      items: (conceptSet.items || []).map(item => ({
        concept: {
          CONCEPT_ID: item.conceptId,
          CONCEPT_NAME: item.conceptName,
          CONCEPT_CODE: item.conceptCode,
          DOMAIN_ID: item.domainId,
          VOCABULARY_ID: item.vocabularyId,
          CONCEPT_CLASS_ID: item.conceptClassId,
          STANDARD_CONCEPT: item.standardConcept,
          INVALID_REASON: item.invalidReason,
        },
        isExcluded: item.isExcluded,
        includeDescendants: item.includeDescendants,
        includeMapped: item.includeMapped,
      })),
    },
  }
}
