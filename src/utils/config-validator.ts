/**
 * Configuration Validator Utility
 *
 * Provides validation functions for atlas-config.json with partial validation support.
 * Valid filters can be loaded even if some filters have errors (FR-021).
 *
 * Design: Per-filter validation allows graceful degradation - application remains
 * functional with valid filters while clearly reporting invalid ones.
 */

import type { ZodError } from 'zod'
import {
  AtlasConfigSchema,
  FilterTypeConfigSchema,
  AttributeConfigSchema,
  type AtlasConfig,
  type ValidationResult,
  type ValidationError,
} from '@/models/config.types'

/**
 * Validate the complete atlas-config.json structure with partial validation.
 *
 * @param config - Raw configuration object (unvalidated)
 * @returns ValidationResult with valid/invalid filter types separated
 *
 * Partial Validation Logic:
 * 1. Validate overall schema structure
 * 2. Validate each filter type individually
 * 3. Collect valid filters and invalid filters separately
 * 4. Return result allowing valid filters to be used
 */
export function validateAtlasConfig(config: unknown): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    validFilterTypes: [],
    invalidFilterTypes: [],
    timestamp: new Date(),
  }

  // Step 1: Validate overall structure
  try {
    const parsed = AtlasConfigSchema.parse(config)

    // Step 2: Validate each filter type individually (partial validation)
    for (const [filterType, filterConfig] of Object.entries(
      parsed.criteriaTypes
    )) {
      try {
        FilterTypeConfigSchema.parse(filterConfig)

        // Validate corresponding attributes
        const attributes = parsed.attributeMapping[filterType]
        if (!attributes) {
          result.warnings.push({
            filterType,
            message: `No attributes defined in attributeMapping for filter type '${filterType}'`,
            code: 'MISSING_ATTRIBUTES',
          })
          // Still mark as valid - attributes are optional for some filter types
          result.validFilterTypes.push(filterType)
          continue
        }

        // Validate each attribute
        let attributesValid = true
        for (const attr of attributes) {
          try {
            AttributeConfigSchema.parse(attr)

            // Additional validation: concept attributes should have domainFilter
            if (attr.type === 'concept' && !attr.domainFilter) {
              result.warnings.push({
                filterType,
                attributeId: attr.id,
                message: `Concept attribute '${attr.id}' missing domainFilter (recommended)`,
                code: 'MISSING_DOMAIN_FILTER',
              })
            }
          } catch (error) {
            attributesValid = false
            const zodError = error as ZodError
            result.errors.push({
              filterType,
              attributeId: attr.id,
              message: `Invalid attribute configuration: ${zodError.errors
                .map((e) => e.message)
                .join(', ')}`,
              code: 'INVALID_ATTRIBUTE',
              details: zodError.errors,
            })
          }
        }

        if (attributesValid) {
          result.validFilterTypes.push(filterType)
        } else {
          result.invalidFilterTypes.push(filterType)
        }
      } catch (error) {
        const zodError = error as ZodError
        result.errors.push({
          filterType,
          message: `Invalid filter type configuration: ${zodError.errors
            .map((e) => e.message)
            .join(', ')}`,
          code: 'INVALID_FILTER_TYPE',
          details: zodError.errors,
        })
        result.invalidFilterTypes.push(filterType)
      }
    }

    // Step 3: Validate cross-references
    validateCrossReferences(parsed, result)

    // Step 4: Determine overall validity
    result.valid = result.errors.length === 0
  } catch (error) {
    // Critical structural error - entire config is invalid
    const zodError = error as ZodError
    result.valid = false
    result.errors.push({
      message: `Configuration structure is invalid: ${zodError.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`,
      code: 'INVALID_SCHEMA',
      details: zodError.errors,
    })
  }

  return result
}

/**
 * Validate cross-references between configuration sections.
 *
 * Checks:
 * - attributeMapping keys match criteriaTypes keys
 * - excludeFromSections references valid section IDs
 * - Section excludeTypes reference valid filter types
 */
function validateCrossReferences(
  config: AtlasConfig,
  result: ValidationResult
): void {
  const criteriaTypeKeys = Object.keys(config.criteriaTypes)
  const attributeMappingKeys = Object.keys(config.attributeMapping)

  // Convert sections to array if it's an object, and add id field from keys
  const sections = Array.isArray(config.sections)
    ? config.sections
    : Object.entries(config.sections).map(([id, section]) => ({
        ...section,
        id,
      }))

  const sectionIds = sections.map((s) => s.id)

  // Check for attributeMapping keys that don't have corresponding criteriaTypes
  for (const key of attributeMappingKeys) {
    if (!criteriaTypeKeys.includes(key)) {
      result.warnings.push({
        filterType: key,
        message: `attributeMapping key '${key}' has no corresponding entry in criteriaTypes`,
        code: 'ORPHANED_ATTRIBUTE_MAPPING',
      })
    }
  }

  // Check for criteriaTypes without attributeMapping
  for (const key of criteriaTypeKeys) {
    if (!attributeMappingKeys.includes(key)) {
      result.warnings.push({
        filterType: key,
        message: `criteriaTypes key '${key}' has no corresponding entry in attributeMapping`,
        code: 'MISSING_ATTRIBUTE_MAPPING',
      })
    }
  }

  // Validate excludeFromSections references
  for (const [filterType, attributes] of Object.entries(
    config.attributeMapping
  )) {
    for (const attr of attributes) {
      if (attr.excludeFromSections) {
        for (const sectionId of attr.excludeFromSections) {
          if (!sectionIds.includes(sectionId)) {
            result.errors.push({
              filterType,
              attributeId: attr.id,
              message: `excludeFromSections references invalid section '${sectionId}'`,
              code: 'INVALID_SECTION_REFERENCE',
            })
          }
        }
      }
    }
  }

  // Validate section excludeTypes references
  for (const section of sections) {
    if (section.excludeTypes) {
      for (const excludeType of section.excludeTypes) {
        if (!criteriaTypeKeys.includes(excludeType)) {
          result.warnings.push({
            message: `Section '${section.id}' excludeTypes references unknown filter type '${excludeType}'`,
            code: 'INVALID_EXCLUDE_TYPE',
          })
        }
      }
    }
  }
}

/**
 * Validate a single filter type configuration.
 *
 * @param filterType - Filter type key
 * @param config - Filter type configuration
 * @returns Array of validation errors (empty if valid)
 */
export function validateFilterType(
  filterType: string,
  config: unknown
): ValidationError[] {
  const errors: ValidationError[] = []

  try {
    FilterTypeConfigSchema.parse(config)
  } catch (error) {
    const zodError = error as ZodError
    errors.push({
      filterType,
      message: `Invalid filter type configuration: ${zodError.errors
        .map((e) => e.message)
        .join(', ')}`,
      code: 'INVALID_FILTER_TYPE',
      details: zodError.errors,
    })
  }

  return errors
}

/**
 * Validate a single attribute configuration.
 *
 * @param filterType - Parent filter type key
 * @param attribute - Attribute configuration
 * @returns Array of validation errors (empty if valid)
 */
export function validateAttribute(
  filterType: string,
  attribute: unknown
): ValidationError[] {
  const errors: ValidationError[] = []

  try {
    const parsed = AttributeConfigSchema.parse(attribute)

    // Additional semantic validation
    if (parsed.type === 'concept' && !parsed.domainFilter) {
      // This is a warning, not an error - don't block loading
      // Caller should add to warnings array instead
    }
  } catch (error) {
    const zodError = error as ZodError
    errors.push({
      filterType,
      attributeId: (attribute as { id?: string }).id,
      message: `Invalid attribute configuration: ${zodError.errors
        .map((e) => e.message)
        .join(', ')}`,
      code: 'INVALID_ATTRIBUTE',
      details: zodError.errors,
    })
  }

  return errors
}

/**
 * Check if a validation result has any blocking errors.
 *
 * @param result - Validation result
 * @returns True if configuration is usable despite errors
 */
export function isPartiallyValid(result: ValidationResult): boolean {
  // Configuration is partially valid if:
  // 1. Overall structure is valid (no INVALID_SCHEMA errors)
  // 2. At least one filter type is valid
  const hasStructuralError = result.errors.some(
    (e) => e.code === 'INVALID_SCHEMA'
  )
  const hasValidFilters = result.validFilterTypes.length > 0

  return !hasStructuralError && hasValidFilters
}

/**
 * Format validation result as human-readable summary.
 *
 * @param result - Validation result
 * @returns Formatted summary string
 */
export function formatValidationSummary(result: ValidationResult): string {
  const lines: string[] = []

  if (result.valid) {
    lines.push('✅ Configuration is valid')
    lines.push(`   - ${result.validFilterTypes.length} filter types validated`)
  } else {
    lines.push('⚠️  Configuration has errors')
    lines.push(`   - Valid filter types: ${result.validFilterTypes.length}`)
    lines.push(`   - Invalid filter types: ${result.invalidFilterTypes.length}`)
  }

  if (result.errors.length > 0) {
    lines.push(`\n❌ Errors (${result.errors.length}):`)
    result.errors.slice(0, 5).forEach((error) => {
      const location = error.filterType
        ? `[${error.filterType}${error.attributeId ? `.${error.attributeId}` : ''}]`
        : '[global]'
      lines.push(`   ${location} ${error.message}`)
    })
    if (result.errors.length > 5) {
      lines.push(`   ... and ${result.errors.length - 5} more errors`)
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`\n⚠️  Warnings (${result.warnings.length}):`)
    result.warnings.slice(0, 3).forEach((warning) => {
      const location = warning.filterType
        ? `[${warning.filterType}${warning.attributeId ? `.${warning.attributeId}` : ''}]`
        : '[global]'
      lines.push(`   ${location} ${warning.message}`)
    })
    if (result.warnings.length > 3) {
      lines.push(`   ... and ${result.warnings.length - 3} more warnings`)
    }
  }

  return lines.join('\n')
}
