/**
 * Concept Set Types
 * OHDSI standardized vocabulary concepts and concept sets
 */
import { z } from 'zod'

// Reference to a concept set (used in cohort events)
export interface ConceptSetReference {
  id: number | string
  name: string
  conceptCount?: number
}

export interface ConceptSet {
  id: number | string // Number from WebAPI, string (UUID) for client-side
  name: string
  concepts: Concept[]
  expression?: ConceptSetExpression // WebAPI format
  includeDescendants?: boolean
}

export interface Concept {
  conceptId: number
  conceptName: string
  conceptCode: string
  domainId: string
  vocabularyId: string
  conceptClassId: string
  standardConcept?: string
  includeDescendants?: boolean
  isExcluded?: boolean
  includeMapped?: boolean
}

// Zod validation schema for WebAPI concept search response
export const ConceptSchema = z.object({
  conceptId: z.number(),
  conceptName: z.string(),
  conceptCode: z.string(),
  domainId: z.string(),
  vocabularyId: z.string(),
  conceptClassId: z.string(),
  standardConcept: z.string().optional(),
  invalidReason: z.string().optional(),
})

export const ConceptSearchResponseSchema = z.array(ConceptSchema)

export type ConceptSearchResponse = z.infer<typeof ConceptSearchResponseSchema>

// Concept set expression for WebAPI
export interface ConceptSetExpression {
  items: ConceptSetExpressionItem[]
}

export interface ConceptSetExpressionItem {
  concept: Concept
  isExcluded?: boolean
  includeDescendants?: boolean
  includeMapped?: boolean
}
