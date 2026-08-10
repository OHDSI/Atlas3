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
 * Supports both i18n keys and plain text values for backward compatibility.
 */
export const FilterTypeConfigSchema = z
  .object({
    /** i18n locale key for filter display name (e.g., "criteria.conditionOccurrence.name") */
    nameKey: z.string().min(1, 'Filter nameKey cannot be empty').optional(),

    /** Plain text display name (legacy format, use nameKey for i18n) */
    name: z.string().min(1, 'Filter name cannot be empty').optional(),

    /**
     * Context-specific i18n locale keys for descriptions
     * Keys: 'initial', 'censoring', 'group', or 'all'
     * Values: i18n locale keys (e.g., "criteria.conditionOccurrence.description.initial")
     */
    descriptionKeys: z
      .record(z.string(), z.string().min(1, 'Description key cannot be empty'))
      .optional(),

    /**
     * Context-specific plain text descriptions (legacy format, use descriptionKeys for i18n)
     * Keys: 'initial', 'censoring', 'group', or 'all'
     * Values: Plain text descriptions
     */
    descriptions: z.record(z.string(), z.string().min(1, 'Description cannot be empty')).optional(),

    /** If false, concept set selector is hidden in UI (default: true) */
    requiresConceptSet: z.boolean().default(true).optional(),

    /** If true, filter only available in criteria groups, not initial/censoring events (default: false) */
    groupOnly: z.boolean().default(false).optional(),
  })
  .refine(data => data.nameKey || data.name, { message: 'Either nameKey or name must be provided' })
  .refine(data => data.descriptionKeys || data.descriptions, {
    message: 'Either descriptionKeys or descriptions must be provided',
  })

export type FilterTypeConfig = z.infer<typeof FilterTypeConfigSchema>

/**
 * Attribute Configuration Schema
 *
 * Defines metadata for a single attribute within a filter type.
 * Supports both i18n keys and plain text values for backward compatibility.
 */
export const AttributeConfigSchema = z.object({
  /** Attribute identifier (camelCase, must match attribute keys in cohort definition) */
  id: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, 'Attribute id must be camelCase'),

  /** i18n locale key for attribute display label (e.g., "attributes.age.name") */
  nameKey: z.string().min(1, 'Attribute nameKey cannot be empty').optional(),

  /** Plain text display label (legacy format, use nameKey for i18n) */
  name: z.string().min(1, 'Attribute name cannot be empty').optional(),

  /** i18n locale key for attribute help text/tooltip (e.g., "attributes.age.description") */
  descriptionKey: z.string().min(1, 'Attribute descriptionKey cannot be empty').optional(),

  /** Plain text help text (legacy format, use descriptionKey for i18n) */
  description: z.string().min(1, 'Attribute description cannot be empty').optional(),

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

export type OccurrenceOperatorConfig = z.infer<typeof OccurrenceOperatorConfigSchema>

/**
 * Root Atlas Configuration Schema
 *
 * Defines the complete structure of atlas-config.json with partial validation support.
 */
export const AtlasConfigSchema = z.object({
  /** Map of filter type key to filter configuration */
  criteriaTypes: z.record(FilterTypeConfigSchema),

  /** Section definitions (sections can be object or array - handle both) */
  sections: z.union([z.array(SectionConfigSchema), z.record(SectionConfigSchema)]),

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

// ============================================================================
// Configuration Panel Types
// ============================================================================

/**
 * Tag interface - represents a tag or tag group in Atlas
 * Tag Groups are tags with empty groups array
 * Tags have a parent group in the groups array
 */
export interface Tag {
  id?: number
  name: string
  color?: string
  icon?: string
  mandatory?: boolean
  showGroup?: boolean
  multiSelection?: boolean
  allowCustom?: boolean
  description?: string
  createdDate?: string
  createdBy?: { login: string }
  groups: Tag[]
  count?: number
  permissionProtected?: boolean
}

/**
 * Alias for backward compatibility
 */
export type TagGroup = Tag

/**
 * Vocabulary Schema Configuration interface
 */
export interface VocabularySchemaConfig {
  schema: string
}

/**
 * Configuration Panel State interface - manages UI state for the panel
 */
export type ConfigPanelSection =
  | 'cache'
  | 'sources'
  | 'vocabulary'
  | 'tags'
  | 'permissions'
  | 'jobs'
  | `plugin:${string}:${string}`

export interface ConfigPanelState {
  isOpen: boolean
  activeSection: ConfigPanelSection
  scrollPosition: number
}

/**
 * Zod schema for Tag/TagGroup validation (Atlas format)
 */
export const tagSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  color: z
    .string()
    .regex(/^(#[0-9A-F]{6})?$/i, 'Invalid color format (must be hex: #RRGGBB)')
    .optional(),
  icon: z.string().max(50, 'Icon name too long').optional(),
  mandatory: z.boolean().optional(),
  showGroup: z.boolean().optional(),
  multiSelection: z.boolean().optional(),
  allowCustom: z.boolean().optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  createdDate: z.union([z.string(), z.number()]).optional(),
  modifiedDate: z.union([z.string(), z.number()]).optional(),
  createdBy: z.object({ login: z.string() }).passthrough().optional(),
  modifiedBy: z.object({ login: z.string() }).passthrough().optional(),
  type: z.string().optional(),
  writeAccess: z.boolean().optional(),
  readAccess: z.boolean().optional(),
  groups: z.array(z.any()).default([]),
  count: z.number().optional(),
  permissionProtected: z.boolean().optional(),
})

/**
 * Alias for backward compatibility
 */
export const tagGroupSchema = tagSchema

/**
 * Zod schema for Vocabulary Schema configuration
 */
export const vocabularySchemaSchema = z.object({
  schema: z
    .string()
    .min(1, 'Schema name is required')
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      'Schema must start with letter/underscore and contain only alphanumeric characters and underscores'
    )
    .max(63, 'Schema name too long (max 63 characters)'),
})

/**
 * Type inference from Zod schemas
 */
export type TagGroupInput = z.infer<typeof tagGroupSchema>
export type VocabularySchemaInput = z.infer<typeof vocabularySchemaSchema>

/**
 * Validates a schema name according to PostgreSQL identifier rules
 *
 * @param schema - The schema name to validate
 * @returns True if valid, error message if invalid
 */
export function validateSchemaName(schema: string): true | string {
  if (!schema || schema.length === 0) {
    return 'Schema name is required'
  }

  if (schema.length > 63) {
    return 'Schema name too long (max 63 characters)'
  }

  if (!/^[a-zA-Z_]/.test(schema)) {
    return 'Schema must start with a letter or underscore'
  }

  if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
    return 'Schema can only contain letters, numbers, and underscores'
  }

  return true
}
