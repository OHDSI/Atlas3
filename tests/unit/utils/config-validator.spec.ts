/**
 * Unit Tests: Config Validator
 * Tests for src/utils/config-validator.ts
 */

import { describe, it, expect } from 'vitest'
import {
  validateAtlasConfig,
  validateFilterType,
  validateAttribute,
  isPartiallyValid,
  formatValidationSummary,
} from '@/utils/config-validator'

describe('config-validator', () => {
  describe('validateAtlasConfig', () => {
    const validConfig = {
      criteriaTypes: {
        CONDITION_OCCURRENCE: {
          name: 'Condition',
          descriptions: { all: 'Medical conditions' },
        },
      },
      attributeMapping: {
        CONDITION_OCCURRENCE: [
          { id: 'age', type: 'numericRange', name: 'Age' },
        ],
      },
      sections: [
        { id: 'entry', name: 'Entry Events', buttonText: 'Add Entry Event' },
      ],
    }

    it('validates a correct config', () => {
      const result = validateAtlasConfig(validConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.validFilterTypes).toContain('CONDITION_OCCURRENCE')
    })

    it('returns errors for invalid schema', () => {
      const invalidConfig = {
        criteriaTypes: 'not-an-object',
      }

      const result = validateAtlasConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].code).toBe('INVALID_SCHEMA')
    })

    it('tracks valid filter types with proper attributes', () => {
      // Schema validation happens first for all attributes.
      // Partial validation tracks which filter types have valid attributes.
      const configWithMultipleTypes = {
        criteriaTypes: {
          TYPE_A: { name: 'Type A', descriptions: { all: 'Description A' } },
          TYPE_B: { name: 'Type B', descriptions: { all: 'Description B' } },
        },
        attributeMapping: {
          TYPE_A: [{ id: 'attr1', type: 'boolean' }],
          TYPE_B: [{ id: 'attr2', type: 'numericRange' }],
        },
        sections: [],
      }

      const result = validateAtlasConfig(configWithMultipleTypes)

      expect(result.valid).toBe(true)
      expect(result.validFilterTypes).toContain('TYPE_A')
      expect(result.validFilterTypes).toContain('TYPE_B')
      expect(result.invalidFilterTypes).toHaveLength(0)
    })

    it('adds warnings for missing attributes', () => {
      const configWithMissingAttrs = {
        criteriaTypes: {
          TEST_TYPE: { name: 'Test', descriptions: { all: 'Test type' } },
        },
        attributeMapping: {},
        sections: [],
      }

      const result = validateAtlasConfig(configWithMissingAttrs)

      expect(result.warnings.some(w => w.code === 'MISSING_ATTRIBUTES')).toBe(true)
    })

    it('validates cross-references between sections', () => {
      const configWithBadRefs = {
        criteriaTypes: {
          TEST_TYPE: { name: 'Test', descriptions: { all: 'Test type' } },
        },
        attributeMapping: {
          TEST_TYPE: [
            { id: 'attr1', type: 'numericRange', name: 'Attr', excludeFromSections: ['nonexistent'] },
          ],
        },
        sections: [
          { id: 'entry', name: 'Entry', buttonText: 'Add Entry' },
        ],
      }

      const result = validateAtlasConfig(configWithBadRefs)

      expect(result.errors.some(e => e.code === 'INVALID_SECTION_REFERENCE')).toBe(true)
    })

    it('warns about orphaned attribute mappings', () => {
      const configWithOrphans = {
        criteriaTypes: {
          TYPE_A: { name: 'A', descriptions: { all: 'Type A' } },
        },
        attributeMapping: {
          TYPE_A: [],
          TYPE_B: [], // Not in criteriaTypes
        },
        sections: [],
      }

      const result = validateAtlasConfig(configWithOrphans)

      expect(result.warnings.some(w => w.code === 'ORPHANED_ATTRIBUTE_MAPPING')).toBe(true)
    })

    it('warns about missing attribute mappings', () => {
      const configWithMissing = {
        criteriaTypes: {
          TYPE_A: { name: 'A', descriptions: { all: 'Type A' } },
          TYPE_B: { name: 'B', descriptions: { all: 'Type B' } },
        },
        attributeMapping: {
          TYPE_A: [],
        },
        sections: [],
      }

      const result = validateAtlasConfig(configWithMissing)

      expect(result.warnings.some(w => w.code === 'MISSING_ATTRIBUTE_MAPPING')).toBe(true)
    })
  })

  describe('validateFilterType', () => {
    it('returns empty array for valid filter type with name and descriptions', () => {
      const filterConfig = {
        name: 'Test Filter',
        descriptions: { all: 'A test filter description' },
      }

      const errors = validateFilterType('TEST', filterConfig)

      expect(errors).toHaveLength(0)
    })

    it('returns empty array for valid filter type with nameKey and descriptionKeys', () => {
      const filterConfig = {
        nameKey: 'criteria.test.name',
        descriptionKeys: { all: 'criteria.test.description' },
      }

      const errors = validateFilterType('TEST', filterConfig)

      expect(errors).toHaveLength(0)
    })

    it('returns errors when missing name/nameKey', () => {
      const filterConfig = {
        descriptions: { all: 'Has description but no name' },
      }

      const errors = validateFilterType('TEST', filterConfig)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('INVALID_FILTER_TYPE')
      expect(errors[0].message).toContain('nameKey or name')
    })

    it('returns errors when missing descriptions/descriptionKeys', () => {
      const filterConfig = {
        name: 'Has name but no description',
      }

      const errors = validateFilterType('TEST', filterConfig)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('INVALID_FILTER_TYPE')
      expect(errors[0].message).toContain('descriptionKeys or descriptions')
    })

    it('returns errors for empty name', () => {
      const filterConfig = {
        name: '',
        descriptions: { all: 'A description' },
      }

      const errors = validateFilterType('TEST', filterConfig)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('INVALID_FILTER_TYPE')
    })
  })

  describe('validateAttribute', () => {
    it('returns empty array for valid attribute', () => {
      const attribute = {
        id: 'age',
        type: 'numericRange',
        name: 'Age',
      }

      const errors = validateAttribute('TEST', attribute)

      expect(errors).toHaveLength(0)
    })

    it('returns empty array for minimal valid attribute', () => {
      const attribute = {
        id: 'testAttribute',
        type: 'boolean',
      }

      const errors = validateAttribute('TEST', attribute)

      expect(errors).toHaveLength(0)
    })

    it('returns errors for invalid attribute type', () => {
      const attribute = {
        id: 'validId',
        type: 'invalidType',
      }

      const errors = validateAttribute('TEST', attribute)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('INVALID_ATTRIBUTE')
    })

    it('returns errors for invalid attribute id format', () => {
      const attribute = {
        id: 'InvalidId', // Must be camelCase (start with lowercase)
        type: 'numericRange',
      }

      const errors = validateAttribute('TEST', attribute)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('INVALID_ATTRIBUTE')
    })

    it('returns errors for empty attribute id', () => {
      const attribute = {
        id: '',
        type: 'numericRange',
      }

      const errors = validateAttribute('TEST', attribute)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].code).toBe('INVALID_ATTRIBUTE')
    })
  })

  describe('isPartiallyValid', () => {
    it('returns true when no structural errors and has valid filters', () => {
      const result = {
        valid: false,
        errors: [{ code: 'INVALID_FILTER_TYPE', message: 'Error' }],
        warnings: [],
        validFilterTypes: ['VALID_TYPE'],
        invalidFilterTypes: ['INVALID_TYPE'],
        timestamp: new Date(),
      }

      expect(isPartiallyValid(result)).toBe(true)
    })

    it('returns false when structural error exists', () => {
      const result = {
        valid: false,
        errors: [{ code: 'INVALID_SCHEMA', message: 'Error' }],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }

      expect(isPartiallyValid(result)).toBe(false)
    })

    it('returns false when no valid filters', () => {
      const result = {
        valid: false,
        errors: [{ code: 'INVALID_FILTER_TYPE', message: 'Error' }],
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: ['INVALID_TYPE'],
        timestamp: new Date(),
      }

      expect(isPartiallyValid(result)).toBe(false)
    })
  })

  describe('formatValidationSummary', () => {
    it('formats valid result', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [],
        validFilterTypes: ['TYPE_A', 'TYPE_B'],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('Configuration is valid')
      expect(summary).toContain('2 filter types validated')
    })

    it('formats result with errors', () => {
      const result = {
        valid: false,
        errors: [
          { filterType: 'TEST', message: 'Test error', code: 'ERROR' },
        ],
        warnings: [],
        validFilterTypes: ['VALID'],
        invalidFilterTypes: ['TEST'],
        timestamp: new Date(),
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('Configuration has errors')
      expect(summary).toContain('Valid filter types: 1')
      expect(summary).toContain('Invalid filter types: 1')
      expect(summary).toContain('Errors (1)')
    })

    it('formats result with warnings', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: [
          { filterType: 'TEST', message: 'Test warning', code: 'WARNING' },
        ],
        validFilterTypes: ['TEST'],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('Warnings (1)')
    })

    it('truncates long error lists', () => {
      const result = {
        valid: false,
        errors: Array(10).fill({ message: 'Error', code: 'ERR' }),
        warnings: [],
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('and 5 more errors')
    })

    it('truncates long warning lists', () => {
      const result = {
        valid: true,
        errors: [],
        warnings: Array(10).fill({ message: 'Warning', code: 'WARN' }),
        validFilterTypes: [],
        invalidFilterTypes: [],
        timestamp: new Date(),
      }

      const summary = formatValidationSummary(result)

      expect(summary).toContain('and 7 more warnings')
    })
  })
})
