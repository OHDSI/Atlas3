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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const NestedCriteriaSchema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
      id: z.string().uuid('Invalid UUID format for nested criteria ID'),
      logicType: LogicTypeSchema,
      count: z.number().int().positive('Count must be a positive integer').optional(),
      events: z.array(CohortEventSchema).min(0, 'Events array is required'),
    })
    .refine(
      data => {
        // Count is required for AT_LEAST and AT_MOST
        const needsCount = data.logicType === 'AT_LEAST' || data.logicType === 'AT_MOST'
        return needsCount ? data.count !== undefined : data.count === undefined
      },
      {
        message:
          'count is required for AT_LEAST/AT_MOST logic types, must be undefined for ALL/ANY',
        path: ['count'],
      }
    )
    .refine(
      data => {
        // If count is specified, it must be <= events.length
        if (data.count !== undefined) {
          return data.count <= data.events.length
        }
        return true
      },
      {
        message: 'count cannot exceed the number of events',
        path: ['count'],
      }
    )
)

/**
 * Schema for concept set reference (simplified)
 */
const ConceptSetReferenceSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
  })
  .optional()

/**
 * Cardinality type enumeration
 */
const CardinalityTypeSchema = z.enum(['AT_LEAST', 'EXACTLY', 'AT_MOST'])

/**
 * Counting method enumeration
 */
const CountingMethodSchema = z.enum([
  'ALL',
  'DISTINCT_CONCEPT',
  'DISTINCT_START_DATE',
  'DISTINCT_VISIT',
])

/**
 * Cardinality schema - validates occurrence count constraints
 */
const CardinalitySchema = z
  .object({
    type: CardinalityTypeSchema,
    count: z.number().int().min(0, 'Count must be >= 0'),
    countingMethod: CountingMethodSchema,
    isDistinct: z.boolean().optional(),
    countColumn: z.string().optional(),
  })
  .refine(
    data => {
      // AT_LEAST requires count >= 1
      if (data.type === 'AT_LEAST') {
        return data.count >= 1
      }
      return true
    },
    {
      message: 'AT_LEAST cardinality requires count >= 1',
      path: ['count'],
    }
  )

/**
 * Window reference point enumeration
 */
const ReferencePointSchema = z.enum(['INDEX_START', 'INDEX_END', 'EVENT_START', 'EVENT_END'])

/**
 * Before/After enumeration
 */
const BeforeAfterSchema = z.enum(['BEFORE', 'AFTER'])

/**
 * Window schema - defines a temporal boundary
 */
const WindowSchema = z.object({
  days: z.number().int().nullable(), // null means "all time"
  beforeAfter: BeforeAfterSchema,
  referencePoint: ReferencePointSchema,
})

/**
 * Temporal window schema - defines start and end temporal constraints
 */
const TemporalWindowSchema = z.object({
  startWindow: WindowSchema.optional(),
  endWindow: WindowSchema.optional(),
})

/**
 * Date field enumeration for date adjustments
 */
const DateFieldSchema = z.enum(['START_DATE', 'END_DATE'])

/**
 * Date adjustment schema - defines how criterion event dates are shifted
 */
const DateAdjustmentSchema = z.object({
  startWith: DateFieldSchema,
  startOffset: z.number().int(),
  endWith: DateFieldSchema,
  endOffset: z.number().int(),
})

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
 * Numeric range attribute schema (base - no refinements for discriminatedUnion)
 */
const NumericRangeAttributeBaseSchema = AttributeBaseSchema.extend({
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
})

/**
 * Numeric range attribute schema with refinements
 */
const NumericRangeAttributeSchema = NumericRangeAttributeBaseSchema.refine(
  data => {
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
 * Date range attribute schema (base - no refinements for discriminatedUnion)
 */
const DateRangeAttributeBaseSchema = AttributeBaseSchema.extend({
  type: z.literal('dateRange'),
  operator: z.enum(['GREATER_THAN', 'LESS_THAN', 'EQUAL', 'NOT_EQUAL', 'BETWEEN', 'NOT_BETWEEN']),
  value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date format (YYYY-MM-DD)'),
  extent: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date format (YYYY-MM-DD)')
    .optional(),
})

/**
 * Date range attribute schema with refinements
 */
const DateRangeAttributeSchema = DateRangeAttributeBaseSchema.refine(
  data => {
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
  concepts: z.array(ConceptSchema),
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
 * Temporal relationship attribute schema
 * Defines temporal windows relative to another event
 */
const TemporalRelationshipAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('temporalRelationship'),
  temporalWindow: TemporalWindowSchema,
})

/**
 * Date adjustment attribute schema
 * Defines how criterion event dates are shifted
 */
const DateAdjustmentAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('dateAdjustment'),
  dateAdjustment: DateAdjustmentSchema,
})

/**
 * User defined period schema (base - no refinements for discriminatedUnion)
 */
const UserDefinedPeriodBaseSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date format (YYYY-MM-DD)'),
})

/**
 * User defined period schema with refinements
 */
const UserDefinedPeriodSchema = UserDefinedPeriodBaseSchema.refine(
  data => {
    // Ensure end date is after or equal to start date
    return data.endDate >= data.startDate
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
)

/**
 * User defined period attribute schema (base - no refinements for discriminatedUnion)
 * Defines a custom period with start and end dates
 */
const UserDefinedPeriodAttributeBaseSchema = AttributeBaseSchema.extend({
  type: z.literal('userDefinedPeriod'),
  period: UserDefinedPeriodBaseSchema,
})

/**
 * User defined period attribute schema with refinements
 */
const UserDefinedPeriodAttributeSchema = AttributeBaseSchema.extend({
  type: z.literal('userDefinedPeriod'),
  period: UserDefinedPeriodSchema,
})

/**
 * Complete event attribute schema (discriminated union for better type inference)
 * Uses base schemas without refinements for discriminatedUnion compatibility
 */
const EventAttributeSchema = z.discriminatedUnion('type', [
  NumericRangeAttributeBaseSchema,
  DateRangeAttributeBaseSchema,
  ConceptSetAttributeSchema,
  ConceptAttributeSchema,
  TextAttributeSchema,
  BooleanAttributeSchema,
  TemporalRelationshipAttributeSchema,
  DateAdjustmentAttributeSchema,
  UserDefinedPeriodAttributeBaseSchema,
])

/**
 * Event attribute schema with all refinements (for strict validation)
 */
export const EventAttributeSchemaWithRefinements = z.union([
  NumericRangeAttributeSchema,
  DateRangeAttributeSchema,
  ConceptSetAttributeSchema,
  ConceptAttributeSchema,
  TextAttributeSchema,
  BooleanAttributeSchema,
  TemporalRelationshipAttributeSchema,
  DateAdjustmentAttributeSchema,
  UserDefinedPeriodAttributeSchema,
])

/**
 * Validation schema for CohortEvent
 * Supports recursive nested criteria within events
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CohortEventSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().uuid('Invalid UUID format for event ID'),
    criteriaType: z.string().min(1, 'Criteria type is required'),
    conceptSet: ConceptSetReferenceSchema,
    cardinality: CardinalitySchema.optional(),
    temporalWindow: TemporalWindowSchema.optional(),
    attributes: z.array(EventAttributeSchema).default([]),
    nestedCriteria: NestedCriteriaSchema.optional(),
    restrictVisit: z.boolean().optional(),
    ignoreObservationPeriod: z.boolean().optional(),
    dateAdjustment: DateAdjustmentSchema.optional(),
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
 * Validate cardinality and return result
 */
export function validateCardinality(data: unknown) {
  return CardinalitySchema.safeParse(data)
}

/**
 * Validate temporal window and return result
 */
export function validateTemporalWindow(data: unknown) {
  return TemporalWindowSchema.safeParse(data)
}

/**
 * Validate date adjustment and return result
 */
export function validateDateAdjustment(data: unknown) {
  return DateAdjustmentSchema.safeParse(data)
}

/**
 * Custom validation: Check for circular references in nested criteria
 */
export function validateNoCircularReferences(
  event: CohortEvent,
  ancestors: Set<string> = new Set()
): {
  valid: boolean
  circularEventId?: string
  path?: string[]
} {
  if (ancestors.has(event.id)) {
    return {
      valid: false,
      circularEventId: event.id,
      path: Array.from(ancestors),
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
export function validateDepthLimit(
  event: CohortEvent,
  maxDepth = 10,
  currentDepth = 0
): {
  valid: boolean
  actualDepth: number
  exceedsLimit: boolean
} {
  if (!event.nestedCriteria || event.nestedCriteria.events.length === 0) {
    return {
      valid: currentDepth <= maxDepth,
      actualDepth: currentDepth,
      exceedsLimit: currentDepth > maxDepth,
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
    exceedsLimit: maxChildDepth > maxDepth,
  }
}
