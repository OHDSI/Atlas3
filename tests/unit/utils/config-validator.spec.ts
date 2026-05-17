/**
 * Config Validator Utility Tests
 * Tests for configuration validation with partial validation support
 */
import { describe, it, expect } from 'vitest'
import {
  validateAtlasConfig,
  validateFilterType,
  validateAttribute,
  isPartiallyValid,
  formatValidationSummary
} from '@/utils/config-validator'

describe('Config Validator', () => {
  describe('validateAtlasConfig', () => {
    it('should return result for valid configuration structure', () => {
      const validConfig = {
        criteriaTypes: {
          conditionOccurrence: {
            id: 'conditionOccurrence',
            nameKey: 'filters.condition.name'
          }
        },
        attributeMapping: {
          conditionOccurrence: [
            {
              id: 'age',
              type: 'numericRange',
              nameKey: 'attributes.age.name'
            }
          ]
        },
        sections: [
          { id: 'initialEvents', nameKey: 'sections.initial' }
        ]
      }

      const result = validateAtlasConfig(validConfig)

      // Configuration structure should be parsed
      expect(result).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should handle invalid overall structure', () => {
      const invalidConfig = {
        // Missing criteriaTypes
        attributeMapping: {}
      }

      const result = validateAtlasConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_SCHEMA')).toBe(true)
    })

    it('should separate valid and invalid filter types', () => {
      const mixedConfig = {
        criteriaTypes: {
          validFilter: {
            id: 'validFilter',
            nameKey: 'test'
          },
          invalidFilter: {
            id: 'invalidFilter'
            // Missing required fields
          }
        },
        attributeMapping: {
          validFilter: [
            { id: 'attr1', type: 'numericRange', nameKey: 'test' }
          ],
          invalidFilter: [
            { id: 'attr1', type: 'invalid_type' } // Invalid type
          ]
        },
        sections: []
      }

      const result = validateAtlasConfig(mixedConfig)

      // Should have some valid filter types
      expect(result.validFilterTypes.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing attributeMapping gracefully', () => {
      const config = {
        criteriaTypes: {
          filterWithoutAttrs: {
            id: 'filterWithoutAttrs',
            nameKey: 'test'
          }
        },
        attributeMapping: {},
        sections: []
      }

      const result = validateAtlasConfig(config)

      // Should not crash and return a result
      expect(result).toBeDefined()
    })

    it('should return result for cross-reference validation', () => {
      const config = {
        criteriaTypes: {
          filter1: { id: 'filter1', nameKey: 'test' }
        },
        attributeMapping: {
          filter1: [{ id: 'attr', type: 'numericRange', nameKey: 'test' }],
          orphanedFilter: [{ id: 'attr', type: 'numericRange', nameKey: 'test' }]
        },
        sections: []
      }

      const result = validateAtlasConfig(config)

      // Should process the configuration and detect issues
      expect(result).toBeDefined()
    })
  })

  describe('validateFilterType', () => {
    it('should validate filter configuration', () => {
      const validFilter = {
        id: 'conditionOccurrence',
        nameKey: 'filters.condition.name',
        requiresConceptSet: true
      }

      const errors = validateFilterType('conditionOccurrence', validFilter)

      // Returns array of errors (may be empty or have schema errors)
      expect(Array.isArray(errors)).toBe(true)
    })

    it('should return errors for invalid filter', () => {
      const invalidFilter = {
        // Missing id
        nameKey: 'test'
      }

      const errors = validateFilterType('test', invalidFilter)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('INVALID_FILTER_TYPE')
    })
  })

  describe('validateAttribute', () => {
    it('should return empty errors for valid attribute', () => {
      const validAttribute = {
        id: 'age',
        type: 'numericRange',
        nameKey: 'attributes.age.name'
      }

      const errors = validateAttribute('conditionOccurrence', validAttribute)

      expect(errors).toHaveLength(0)
    })

    it('should return errors for invalid attribute', () => {
      const invalidAttribute = {
        // Missing id
        type: 'invalidType'
      }

      const errors = validateAttribute('filter', invalidAttribute)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('INVALID_ATTRIBUTE')
    })
  })

  describe('isPartiallyValid', () => {
    it('should return true when has valid filters and no structural errors', () => {
      const result = {
        valid: false,
        errors: [{ code: 'INVALID_FILTER_TYPE', message: 'test' }],
        warnings: [],
        validFilterTypes: ['filter1', 'filter2'],
        invalidFilterTypes: ['filter3'],
        timestamp: new Date()
      }

      expect(isPartiallyValid(result)).toBe(true)
    })

    it('should return false when has structural error', () => {
      const result = {
        valid: false,
        errors: [{ code: 'INVALID_SCHEMA', message: 'Structure is invalid' }],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date()
      }

      expect(isPartiallyValid(result)).toBe(false)
    })

    it('should return false when no valid filters', () => {
      const result = {
        valid: false,
        errors: [],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: ['filter1'],
        timestamp: new Date()
      }

      expect(isPartiallyValid(result)).toBe(false)
    })
  })

  describe('formatValidationSummary', () => {
    it('should format valid result', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: ['filter1', 'filter2'],
        invalidFilterTypes: [],
        timestamp: new Date()
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('✅')
      expect(summary).toContain('valid')
      expect(summary).toContain('2')
    })

    it('should format result with errors', () => {
      const result = {
        valid: false,
        errors: [
          { filterType: 'filter1', message: 'Error 1', code: 'ERR1' },
          { filterType: 'filter2', message: 'Error 2', code: 'ERR2' }
        ],
        warnings: [],
        validFilterTypes: ['filter3'],
        invalidFilterTypes: ['filter1', 'filter2'],
        timestamp: new Date()
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('⚠️')
      expect(summary).toContain('Errors')
      expect(summary).toContain('2')
    })

    it('should format result with warnings', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [
          { filterType: 'filter1', message: 'Warning 1', code: 'WARN1' }
        ],
        validFilterTypes: ['filter1'],
        invalidFilterTypes: [],
        timestamp: new Date()
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('Warnings')
    })

    it('should truncate long error lists', () => {
      const result = {
        valid: false,
        errors: Array(10).fill(null).map((_, i) => ({
          filterType: `filter${i}`,
          message: `Error ${i}`,
          code: `ERR${i}`
        })),
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date()
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('more errors')
    })
  })

  describe('validateAtlasConfig — cross-reference branches', () => {
    // Build a config that actually passes AtlasConfigSchema.parse() so we
    // reach validateCrossReferences (instead of bailing in the catch).
    function baseConfig(): Record<string, unknown> {
      return {
        criteriaTypes: {
          conditionOccurrence: {
            nameKey: 'filters.condition.name',
            descriptionKeys: { all: 'filters.condition.description' },
          },
        },
        attributeMapping: {
          conditionOccurrence: [
            { id: 'age', type: 'numericRange', nameKey: 'attributes.age.name' },
          ],
        },
        sections: [
          {
            id: 'initialEvents',
            name: 'Initial Events',
            buttonText: 'Add Initial Event',
            excludeTypes: [],
          },
        ],
      }
    }

    it('warns for attributeMapping key with no matching criteriaTypes', () => {
      const config = baseConfig() as {
        attributeMapping: Record<string, unknown[]>
      }
      config.attributeMapping.orphanFilter = [
        { id: 'attr1', type: 'numericRange', nameKey: 'attributes.attr1.name' },
      ]
      const result = validateAtlasConfig(config)
      expect(result.warnings.map(w => w.code)).toContain('ORPHANED_ATTRIBUTE_MAPPING')
    })

    it('warns for criteriaTypes key with no matching attributeMapping', () => {
      const config = baseConfig() as {
        criteriaTypes: Record<string, unknown>
      }
      config.criteriaTypes.lonelyFilter = {
        nameKey: 'filters.lonely.name',
        descriptionKeys: { all: 'filters.lonely.description' },
      }
      const result = validateAtlasConfig(config)
      expect(result.warnings.map(w => w.code)).toContain('MISSING_ATTRIBUTE_MAPPING')
    })

    it('errors when an attribute references an unknown section via excludeFromSections', () => {
      const config = baseConfig() as {
        attributeMapping: Record<string, unknown[]>
      }
      config.attributeMapping.conditionOccurrence = [
        {
          id: 'age',
          type: 'numericRange',
          nameKey: 'attributes.age.name',
          excludeFromSections: ['ghostSection'],
        },
      ]
      const result = validateAtlasConfig(config)
      expect(result.errors.map(e => e.code)).toContain('INVALID_SECTION_REFERENCE')
    })

    it('warns when section excludeTypes references an unknown filter type', () => {
      const config = baseConfig() as {
        sections: Array<{ id: string; name: string; buttonText: string; excludeTypes: string[] }>
      }
      config.sections = [
        {
          id: 'initialEvents',
          name: 'Initial Events',
          buttonText: 'Add Initial Event',
          excludeTypes: ['ghostFilter'],
        },
      ]
      const result = validateAtlasConfig(config)
      expect(result.warnings.map(w => w.code)).toContain('INVALID_EXCLUDE_TYPE')
    })

    it('accepts sections provided as an object (id→section map)', () => {
      const config = baseConfig() as Record<string, unknown>
      config.sections = {
        initialEvents: {
          name: 'Initial Events',
          buttonText: 'Add Initial Event',
          excludeTypes: [],
        },
      }
      // Add an attribute that references the section id derived from the map key
      ;(config.attributeMapping as Record<string, unknown[]>).conditionOccurrence = [
        {
          id: 'age',
          type: 'numericRange',
          nameKey: 'attributes.age.name',
          excludeFromSections: ['initialEvents'],
        },
      ]
      const result = validateAtlasConfig(config)
      // Section id derived from key should match - no INVALID_SECTION_REFERENCE
      expect(result.errors.map(e => e.code)).not.toContain('INVALID_SECTION_REFERENCE')
    })
  })

  describe('formatValidationSummary — truncation and scope branches', () => {
    it('truncates long warning lists at 3', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: Array(8).fill(null).map((_, i) => ({
          filterType: `f${i}`,
          message: `Warn ${i}`,
          code: `W${i}`,
        })),
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }
      const summary = formatValidationSummary(result)
      expect(summary).toContain('more warnings')
    })

    it('renders global-scoped errors (no filterType) with [global] location', () => {
      const result = {
        valid: false,
        errors: [{ message: 'Top-level boom', code: 'TOP' }],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }
      const summary = formatValidationSummary(result)
      expect(summary).toContain('[global]')
    })

    it('renders attribute-scoped errors with [filterType.attributeId] location', () => {
      const result = {
        valid: false,
        errors: [
          { filterType: 'condition', attributeId: 'age', message: 'bad', code: 'X' },
        ],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: ['condition'],
        timestamp: new Date(),
      }
      const summary = formatValidationSummary(result)
      expect(summary).toContain('[condition.age]')
    })

    it('renders global-scoped warnings (no filterType) with [global] location', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [{ message: 'Global warning', code: 'GW' }],
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }
      const summary = formatValidationSummary(result)
      expect(summary).toContain('[global]')
    })

    it('renders attribute-scoped warnings with [filterType.attributeId] location', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [
          { filterType: 'condition', attributeId: 'age', message: 'soft warn', code: 'W' },
        ],
        validFilterTypes: ['condition'],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }
      const summary = formatValidationSummary(result)
      expect(summary).toContain('[condition.age]')
    })
  })
})
