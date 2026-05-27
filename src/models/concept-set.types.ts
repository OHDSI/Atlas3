/**
 * Concept Set Types
 * OHDSI standardized vocabulary concepts and concept sets
 */
import { z } from 'zod'

// ============================================================================
// Core Concept Type (standardized from WebAPI UPPERCASE fields to camelCase)
// ============================================================================

export interface Concept {
  conceptId: number
  conceptName: string
  conceptCode: string
  domainId: string // e.g., "Condition", "Drug", "Measurement"
  vocabularyId: string // e.g., "SNOMED", "RxNorm", "LOINC"
  conceptClassId: string // e.g., "Clinical Finding", "Ingredient"
  standardConcept: string | null // "S" = Standard, "C" = Classification, null = Non-standard
  invalidReason: string | null // null = Valid, otherwise invalid
  // Record counts from cdmresults
  recordCount?: number // RC - Record Count
  descendantRecordCount?: number // DRC - Descendant Record Count
  personCount?: number // PC - Person Count
  descendantPersonCount?: number // DPC - Descendant Person Count
  relationships?: string[]
}

// Zod validation schema for Concept
export const ConceptSchema = z.object({
  conceptId: z.number().int().positive(),
  conceptName: z.string().min(1).max(255),
  conceptCode: z.string().min(1),
  domainId: z.string().min(1),
  vocabularyId: z.string().min(1),
  conceptClassId: z.string().min(1),
  standardConcept: z.string().nullable(),
  invalidReason: z.string().nullable(),
})

// Zod validation schema for WebAPI concept search response (UPPERCASE fields)
export const ConceptSearchResponseSchema = z.array(
  z.object({
    CONCEPT_ID: z.number(),
    CONCEPT_NAME: z.string(),
    CONCEPT_CODE: z.string(),
    DOMAIN_ID: z.string(),
    VOCABULARY_ID: z.string(),
    CONCEPT_CLASS_ID: z.string(),
    STANDARD_CONCEPT: z.string().nullable(),
    INVALID_REASON: z.string().nullable(),
    RELATIONSHIPS: z.array(z.string()).optional(),
  })
)

export type ConceptSearchResponse = z.infer<typeof ConceptSearchResponseSchema>

// ============================================================================
// Concept Set Item (concept with configuration flags)
// ============================================================================

export interface ConceptSetItem {
  conceptId: number
  conceptName: string
  conceptCode: string
  domainId: string
  vocabularyId: string
  conceptClassId: string
  standardConcept: string | null
  invalidReason: string | null
  isExcluded: boolean // Exclude from cohort criteria
  includeDescendants: boolean // Include child concepts in hierarchy
  includeMapped: boolean // Include mapped concepts from other vocabularies
}

export const ConceptSetItemSchema = z.object({
  conceptId: z.number().int().positive(),
  conceptName: z.string(),
  conceptCode: z.string(),
  domainId: z.string(),
  vocabularyId: z.string(),
  conceptClassId: z.string(),
  standardConcept: z.string().nullable(),
  invalidReason: z.string().nullable(),
  isExcluded: z.boolean().default(false),
  includeDescendants: z.boolean().default(false),
  includeMapped: z.boolean().default(false),
})

// ============================================================================
// Concept Set (named collection of concepts)
// ============================================================================

export interface ConceptSet {
  id?: number | string // Optional for creation, required after save
  name: string
  description?: string // Optional description
  createdDate?: string | number // ISO 8601 datetime or Unix timestamp
  createdBy?: string // Username
  modifiedDate?: string | number // ISO 8601 datetime or Unix timestamp
  modifiedBy?: string // Username
  shared?: boolean // Visible to other users
  items: ConceptSetItem[] // Concepts in this set
}

export const ConceptSetSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  createdDate: z.union([z.string(), z.number()]).optional(),
  createdBy: z.string().nullable().optional(),
  modifiedDate: z.union([z.string(), z.number()]).optional(),
  modifiedBy: z.string().nullable().optional(),
  shared: z.boolean().default(false),
  items: z.array(ConceptSetItemSchema).default([]),
})

// ============================================================================
// WebAPI Concept Set Format (for API communication)
// ============================================================================

export interface ConceptSetExpression {
  items: ConceptSetExpressionItem[]
}

export interface ConceptSetExpressionItem {
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
}

// WebAPI response format for concept set list
export const ConceptSetListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdDate: z.union([z.string(), z.number()]).optional(), // Can be timestamp number or ISO string
  createdBy: z
    .union([
      z.string(),
      z.object({
        id: z.number(),
        name: z.string().nullable(),
        login: z.string(),
      }),
    ])
    .optional(),
  modifiedDate: z.union([z.string(), z.number()]).optional(), // Can be timestamp number or ISO string
  modifiedBy: z
    .union([
      z.string(),
      z.object({
        id: z.number(),
        name: z.string().nullable(),
        login: z.string(),
      }),
    ])
    .optional(),
})

export type ConceptSetListItem = z.infer<typeof ConceptSetListItemSchema>

export const ConceptSetListResponseSchema = z.array(ConceptSetListItemSchema)

// ============================================================================
// UI State Types
// ============================================================================

export interface ConceptSearchOptions {
  query: string
  page: number
  itemsPerPage: number
  sortBy?: string
  sortDesc?: boolean
}

export interface PaginationOptions {
  page: number
  itemsPerPage: number
  sortBy: string[]
  sortDesc: boolean[]
}

// ============================================================================
// Legacy types (for backward compatibility with existing code)
// ============================================================================

// Reference to a concept set (used in cohort events)
export interface ConceptSetReference {
  id: number | string
  name: string
  conceptCount?: number
  items?: ConceptSetItem[] // Full concept set items to embed in cohort definition
}

// ============================================================================
// Concept Set Comparison
// ============================================================================

export interface ComparisonResultItem {
  conceptId: number
  conceptIn1Only: number
  conceptIn2Only: number
  conceptIn1And2: number
  conceptName: string
  conceptCode: string
  conceptClassId: string
  domainId: string
  vocabularyId: string
  standardConcept: string | null
  invalidReason: string | null
  validStartDate: string | number | null
  validEndDate: string | number | null
  nameMismatch: boolean
}

export const ComparisonResultItemSchema = z.object({
  conceptId: z.number(),
  conceptIn1Only: z.number(),
  conceptIn2Only: z.number(),
  conceptIn1And2: z.number(),
  conceptName: z.string(),
  conceptCode: z.string(),
  conceptClassId: z.string(),
  domainId: z.string(),
  vocabularyId: z.string(),
  standardConcept: z
    .string()
    .nullable()
    .optional()
    .transform(v => v ?? null),
  invalidReason: z
    .string()
    .nullable()
    .optional()
    .transform(v => v ?? null),
  validStartDate: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform(v => v ?? null),
  validEndDate: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform(v => v ?? null),
  nameMismatch: z.boolean().optional().default(false),
})

export const ComparisonResultSchema = z.array(ComparisonResultItemSchema)

export type ComparisonResultResponse = z.infer<typeof ComparisonResultSchema>
