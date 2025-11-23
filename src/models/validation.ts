/**
 * Zod validation schemas for cohort definition data models
 * Ensures data integrity and type safety for nested criteria
 */

import { z } from 'zod'
import type { CohortEvent } from './cohort.types'

/**
 * Logic type enumeration schema
 */
export const LogicTypeSchema = z.enum(['ALL', 'ANY', 'AT_LEAST', 'AT_MOST'])

/**
 * Validation schema for NestedCriteria
 * Recursively validates nested event structures
 */
export const NestedCriteriaSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().uuid('Invalid UUID format for nested criteria ID'),
    logicType: LogicTypeSchema,
    count: z.number().int().positive('Count must be a positive integer').optional(),
    events: z.array(CohortEventSchema).min(0, 'Events array is required')
  }).refine(
    (data) => {
      // Count is required for AT_LEAST and AT_MOST
      const needsCount = data.logicType === 'AT_LEAST' || data.logicType === 'AT_MOST'
      return needsCount ? data.count !== undefined : data.count === undefined
    },
    {
      message: 'count is required for AT_LEAST/AT_MOST logic types, must be undefined for ALL/ANY',
      path: ['count']
    }
  ).refine(
    (data) => {
      // If count is specified, it must be <= events.length
      if (data.count !== undefined) {
        return data.count <= data.events.length
      }
      return true
    },
    {
      message: 'count cannot exceed the number of events',
      path: ['count']
    }
  )
)

/**
 * Schema for concept set reference (simplified)
 */
const ConceptSetReferenceSchema = z.object({
  id: z.number().int(),
  name: z.string()
}).optional()

/**
 * Concept schema (for single concept attributes)
 */
const ConceptSchema = z.object({
  CONCEPT_ID: z.number().int(),
  CONCEPT_NAME: z.string(),
  CONCEPT_CODE: z.string().optional(),
  DOMAIN_ID: z.string().optional(),
  VOCABULARY_ID: z.string().optional(),
  CONCEPT_CLASS_ID: z.string().optional(),
  STANDARD_CONCEPT: z.string().optional(),
  INVALID_REASON: z.string().optional(),
})

/**
 * Base attribute schema
 */
const AttributeBaseSchema = z.object({
  attributeKey: z.string().min(1, 'Attribute key is required'),
})

/**
 * Numeric range attribute schema
 */
const NumericRangeAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('numericRange'),
  operator: z.enum([
    'GREATER_THAN',
    'LESS_THAN',
    'EQUAL',
    'NOT_EQUAL',
    'BETWEEN',
    'NOT_BETWEEN',
    'GREATER_THAN_OR_EQUAL',
    'LESS_THAN_OR_EQUAL',
  ]),
  value: z.number(),
  extent: z.number().optional(),
}).refine(
  (data) => {
    // BETWEEN/NOT_BETWEEN requires extent
    if (data.operator === 'BETWEEN' || data.operator === 'NOT_BETWEEN') {
      return data.extent !== undefined
    }
    return true
  },
  {
    message: 'extent is required for BETWEEN/NOT_BETWEEN operators',
    path: ['extent'],
  }
)

/**
 * Date range attribute schema
 */
const DateRangeAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('dateRange'),
  operator: z.enum([
    'GREATER_THAN',
    'LESS_THAN',
    'EQUAL',
    'NOT_EQUAL',
    'BETWEEN',
    'NOT_BETWEEN',
  ]),
  value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date format (YYYY-MM-DD)'),
  extent: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date format (YYYY-MM-DD)').optional(),
}).refine(
  (data) => {
    // BETWEEN requires both value and extent
    if (data.operator === 'BETWEEN') {
      return data.value && data.extent
    }
    return true
  },
  {
    message: 'Both value and extent are required for BETWEEN operator',
    path: ['extent'],
  }
)

/**
 * Concept set attribute schema
 */
const ConceptSetAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('conceptSet'),
  conceptSet: z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
  }),
})

/**
 * Single concept attribute schema
 */
const ConceptAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('concept'),
  concept: ConceptSchema.nullable(),
})

/**
 * Text attribute schema
 */
const TextAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('text'),
  operator: z.enum(['CONTAINS', 'EQUALS', 'STARTS_WITH', 'ENDS_WITH']),
  value: z.string().min(1, 'Text value cannot be empty'),
})

/**
 * Boolean attribute schema
 */
const BooleanAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('boolean'),
  value: z.boolean(),
})

/**
 * Complete event attribute schema (union)
 * Note: Using z.union instead of z.discriminatedUnion because some schemas use .refine()
 */
const EventAttributeSchema = z.union([
  NumericRangeAttributeSchema,
  DateRangeAttributeSchema,
  ConceptSetAttributeSchema,
  ConceptAttributeSchema,
  TextAttributeSchema,
  BooleanAttributeSchema,
])

/**
 * Validation schema for CohortEvent
 * Supports recursive nested criteria within events
 */
export const CohortEventSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().uuid('Invalid UUID format for event ID'),
    criteriaType: z.string().min(1, 'Criteria type is required'),
    conceptSet: ConceptSetReferenceSchema,
    cardinality: z.any().optional(), // TODO: Add specific cardinality schema
    temporalWindow: z.any().optional(), // TODO: Add specific temporal window schema
    attributes: z.array(EventAttributeSchema).default([]),
    nestedCriteria: NestedCriteriaSchema.optional(),
    restrictVisit: z.boolean().optional(),
    ignoreObservationPeriod: z.boolean().optional(),
    dateAdjustment: z.any().optional() // TODO: Add specific date adjustment schema
  })
)

/**
 * Validate nested criteria and return result
 */
export function validateNestedCriteria(data: unknown) {
  return NestedCriteriaSchema.safeParse(data)
}

/**
 * Validate cohort event and return result
 */
export function validateCohortEvent(data: unknown) {
  return CohortEventSchema.safeParse(data)
}

/**
 * Custom validation: Check for circular references in nested criteria
 */
export function validateNoCircularReferences(event: CohortEvent, ancestors: Set<string> = new Set()): {
  valid: boolean
  circularEventId?: string
  path?: string[]
} {
  if (ancestors.has(event.id)) {
    return {
      valid: false,
      circularEventId: event.id,
      path: Array.from(ancestors)
    }
  }

  if (!event.nestedCriteria) {
    return { valid: true }
  }

  const newAncestors = new Set(ancestors).add(event.id)

  for (const childEvent of event.nestedCriteria.events) {
    const result = validateNoCircularReferences(childEvent, newAncestors)
    if (!result.valid) {
      return result
    }
  }

  return { valid: true }
}

/**
 * Custom validation: Check nesting depth doesn't exceed limit
 */
export function validateDepthLimit(event: CohortEvent, maxDepth = 10, currentDepth = 0): {
  valid: boolean
  actualDepth: number
  exceedsLimit: boolean
} {
  if (!event.nestedCriteria || event.nestedCriteria.events.length === 0) {
    return {
      valid: currentDepth <= maxDepth,
      actualDepth: currentDepth,
      exceedsLimit: currentDepth > maxDepth
    }
  }

  let maxChildDepth = currentDepth

  for (const childEvent of event.nestedCriteria.events) {
    const childResult = validateDepthLimit(childEvent, maxDepth, currentDepth + 1)
    if (childResult.actualDepth > maxChildDepth) {
      maxChildDepth = childResult.actualDepth
    }
  }

  return {
    valid: maxChildDepth <= maxDepth,
    actualDepth: maxChildDepth,
    exceedsLimit: maxChildDepth > maxDepth
  }
}
