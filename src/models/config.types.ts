/**
 * Configuration Types and Zod Schemas for Configuration-Driven Filter System
 *
 * This file defines TypeScript types and Zod runtime validation schemas for the
 * atlas-config.json configuration file structure.
 *
 * Design: Zod schemas provide both runtime validation and TypeScript type inference,
 * ensuring type safety at compile-time and data validation at runtime.
 */

import { z } from 'zod'

/**
 * Attribute type enum - defines the UI component type for each attribute
 */
export const AttributeTypeSchema = z.enum([
  'numericRange',
  'dateRange',
  'concept',
  'conceptSet',
  'text',
  'boolean',
  'temporalRelationship',
  'dateAdjustment',
  'nested',
  'userDefinedPeriod',
])

export type AttributeType = z.infer<typeof AttributeTypeSchema>

/**
 * Filter Type Configuration Schema
 *
 * Defines metadata for a single filter type (e.g., Condition Occurrence, Drug Exposure).
 * Uses i18n locale keys for all user-facing text.
 */
export const FilterTypeConfigSchema = z.object({
  /** i18n locale key for filter display name (e.g., "criteria.conditionOccurrence.name") */
  nameKey: z.string().min(1, 'Filter nameKey cannot be empty'),

  /**
   * Context-specific i18n locale keys for descriptions
   * Keys: 'initial', 'censoring', 'group', or 'all'
   * Values: i18n locale keys (e.g., "criteria.conditionOccurrence.description.initial")
   */
  descriptionKeys: z.record(
    z.string(),
    z.string().min(1, 'Description key cannot be empty')
  ),

  /** If false, concept set selector is hidden in UI (default: true) */
  requiresConceptSet: z.boolean().default(true).optional(),

  /** If true, filter only available in criteria groups, not initial/censoring events (default: false) */
  groupOnly: z.boolean().default(false).optional(),
})

export type FilterTypeConfig = z.infer<typeof FilterTypeConfigSchema>

/**
 * Attribute Configuration Schema
 *
 * Defines metadata for a single attribute within a filter type.
 * Uses i18n locale keys for labels and descriptions.
 */
export const AttributeConfigSchema = z.object({
  /** Attribute identifier (camelCase, must match attribute keys in cohort definition) */
  id: z
    .string()
    .regex(/^[a-z][a-zA-Z0-9]*$/, 'Attribute id must be camelCase'),

  /** i18n locale key for attribute display label (e.g., "attributes.age.name") */
  nameKey: z.string().min(1, 'Attribute nameKey cannot be empty'),

  /** i18n locale key for attribute help text/tooltip (e.g., "attributes.age.description") */
  descriptionKey: z.string().min(1, 'Attribute descriptionKey cannot be empty'),

  /** Attribute type - determines which UI component to render */
  type: AttributeTypeSchema,

  /**
   * Concept domain filter for 'concept' type attributes
   * Examples: 'Condition', 'Drug', 'Gender', 'Visit', 'Measurement'
   */
  domainFilter: z.string().optional(),

  /**
   * Sections where this attribute should be hidden
   * Array can contain: 'initialEvents', 'censoringEvents', 'criteriaGroup'
   */
  excludeFromSections: z.array(z.string()).optional(),
})

export type AttributeConfig = z.infer<typeof AttributeConfigSchema>

/**
 * Section Configuration Schema
 *
 * Defines metadata for cohort definition sections (where filters can be added).
 */
export const SectionConfigSchema = z.object({
  /** Section identifier: 'initialEvents', 'censoringEvents', or 'criteriaGroup' */
  id: z.string().optional(), // Optional since it's added from object keys

  /** Display name for the section */
  name: z.string(),

  /** Button text for adding criteria (e.g., "Add Initial Event") */
  buttonText: z.string(),

  /** Filter types that should not appear in this section */
  excludeTypes: z.array(z.string()).optional(), // Optional for sections using includeAll

  /** If true, all filter types are available (ignoring groupOnly flag) */
  includeAll: z.boolean().optional(),
})

export type SectionConfig = z.infer<typeof SectionConfigSchema>

/**
 * Temporal Window Configuration Schema
 *
 * Defines temporal relationship options (e.g., before, after, between).
 */
export const TemporalWindowConfigSchema = z.object({
  /** Temporal option key */
  id: z.string(),

  /** Display name */
  name: z.string(),

  /** Help text */
  description: z.string(),
})

export type TemporalWindowConfig = z.infer<typeof TemporalWindowConfigSchema>

/**
 * Occurrence Operator Configuration Schema
 *
 * Defines cardinality operators (e.g., at least, exactly, between).
 */
export const OccurrenceOperatorConfigSchema = z.object({
  /** Operator key */
  id: z.string(),

  /** Display name */
  name: z.string(),

  /** Mathematical symbol (e.g., '>=', '=') */
  symbol: z.string(),
})

export type OccurrenceOperatorConfig = z.infer<
  typeof OccurrenceOperatorConfigSchema
>

/**
 * Root Atlas Configuration Schema
 *
 * Defines the complete structure of atlas-config.json with partial validation support.
 */
export const AtlasConfigSchema = z.object({
  /** Map of filter type key to filter configuration */
  criteriaTypes: z.record(FilterTypeConfigSchema),

  /** Section definitions (sections can be object or array - handle both) */
  sections: z.union([
    z.array(SectionConfigSchema),
    z.record(SectionConfigSchema),
  ]),

  /** Map of filter type key to array of attribute configurations */
  attributeMapping: z.record(z.array(AttributeConfigSchema)),

  /** Temporal window options for temporal relationship attributes */
  temporalWindows: z.array(TemporalWindowConfigSchema).optional(),

  /** Occurrence operator options */
  occurrenceOperators: z.array(OccurrenceOperatorConfigSchema).optional(),
})

export type AtlasConfig = z.infer<typeof AtlasConfigSchema>

/**
 * Validation Error
 *
 * Represents a critical configuration validation error.
 */
export interface ValidationError {
  /** Filter type where error occurred (if applicable) */
  filterType?: string

  /** Attribute ID where error occurred (if applicable) */
  attributeId?: string

  /** Error message */
  message: string

  /** Error code for categorization */
  code: string

  /** Additional context for debugging */
  details?: unknown
}

/**
 * Validation Warning
 *
 * Represents a non-blocking configuration validation warning.
 */
export interface ValidationWarning {
  /** Filter type where warning occurred (if applicable) */
  filterType?: string

  /** Attribute ID where warning occurred (if applicable) */
  attributeId?: string

  /** Warning message */
  message: string

  /** Warning code for categorization */
  code: string

  /** Additional context */
  details?: unknown
}

/**
 * Validation Result
 *
 * Result of configuration validation with partial validation support.
 * Valid filters can be loaded even if some filters have errors.
 */
export interface ValidationResult {
  /** True if no errors (warnings are allowed) */
  valid: boolean

  /** Critical validation errors */
  errors: ValidationError[]

  /** Non-blocking validation warnings */
  warnings: ValidationWarning[]

  /** Filter types that passed validation */
  validFilterTypes: string[]

  /** Filter types that failed validation */
  invalidFilterTypes: string[]

  /** Timestamp of validation */
  timestamp: Date
}
