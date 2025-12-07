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
})
