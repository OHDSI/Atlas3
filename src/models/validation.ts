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
 * Schema for event attributes (simplified for now)
 */
const EventAttributeSchema = z.object({
  attributeType: z.string(),
  operator: z.string().optional(),
  value: z.union([z.string(), z.number(), z.boolean()]).optional()
})

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
