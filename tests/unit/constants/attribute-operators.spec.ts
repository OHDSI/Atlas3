/**
 * Attribute Operators Tests
 * Tests for attribute operator definitions and helper functions
 */
import { describe, it, expect } from 'vitest'
import {
  TEXT_OPERATORS,
  NUMERIC_OPERATORS,
  DATE_OPERATORS,
  getDefaultOperator
} from '@/constants/attribute-operators'

describe('Attribute Operators', () => {
  describe('TEXT_OPERATORS', () => {
    it('should have EQUALS operator', () => {
      const equals = TEXT_OPERATORS.find(op => op.value === 'EQUALS')
      expect(equals).toBeDefined()
      expect(equals?.label).toBe('Equals')
    })

    it('should have CONTAINS operator', () => {
      const contains = TEXT_OPERATORS.find(op => op.value === 'CONTAINS')
      expect(contains).toBeDefined()
      expect(contains?.label).toBe('Contains')
    })

    it('should have STARTS_WITH operator', () => {
      const startsWith = TEXT_OPERATORS.find(op => op.value === 'STARTS_WITH')
      expect(startsWith).toBeDefined()
      expect(startsWith?.label).toBe('Starts with')
    })

    it('should have ENDS_WITH operator', () => {
      const endsWith = TEXT_OPERATORS.find(op => op.value === 'ENDS_WITH')
      expect(endsWith).toBeDefined()
      expect(endsWith?.label).toBe('Ends with')
    })

    it('should have exactly 4 operators', () => {
      expect(TEXT_OPERATORS).toHaveLength(4)
    })
  })

  describe('NUMERIC_OPERATORS', () => {
    it('should have GREATER_THAN operator', () => {
      const op = NUMERIC_OPERATORS.find(op => op.value === 'GREATER_THAN')
      expect(op).toBeDefined()
      expect(op?.label).toContain('>')
    })

    it('should have GREATER_THAN_OR_EQUAL operator', () => {
      const op = NUMERIC_OPERATORS.find(op => op.value === 'GREATER_THAN_OR_EQUAL')
      expect(op).toBeDefined()
      expect(op?.label).toContain('>=')
    })

    it('should have LESS_THAN operator', () => {
      const op = NUMERIC_OPERATORS.find(op => op.value === 'LESS_THAN')
      expect(op).toBeDefined()
      expect(op?.label).toContain('<')
    })

    it('should have LESS_THAN_OR_EQUAL operator', () => {
      const op = NUMERIC_OPERATORS.find(op => op.value === 'LESS_THAN_OR_EQUAL')
      expect(op).toBeDefined()
      expect(op?.label).toContain('<=')
    })

    it('should have EQUAL operator', () => {
      const op = NUMERIC_OPERATORS.find(op => op.value === 'EQUAL')
      expect(op).toBeDefined()
      expect(op?.label).toContain('=')
    })

    it('should have NOT_EQUAL operator', () => {
      const op = NUMERIC_OPERATORS.find(op => op.value === 'NOT_EQUAL')
      expect(op).toBeDefined()
      expect(op?.label).toContain('!=')
    })

    it('should have BETWEEN operator', () => {
      const op = NUMERIC_OPERATORS.find(op => op.value === 'BETWEEN')
      expect(op).toBeDefined()
      expect(op?.label).toBe('Between')
    })

    it('should have NOT_BETWEEN operator', () => {
      const op = NUMERIC_OPERATORS.find(op => op.value === 'NOT_BETWEEN')
      expect(op).toBeDefined()
      expect(op?.label).toBe('Not Between')
    })

    it('should have exactly 8 operators', () => {
      expect(NUMERIC_OPERATORS).toHaveLength(8)
    })
  })

  describe('DATE_OPERATORS', () => {
    it('should have BETWEEN operator', () => {
      const op = DATE_OPERATORS.find(op => op.value === 'BETWEEN')
      expect(op).toBeDefined()
      expect(op?.label).toBe('Between')
    })

    it('should have BEFORE operator', () => {
      const op = DATE_OPERATORS.find(op => op.value === 'BEFORE')
      expect(op).toBeDefined()
      expect(op?.label).toBe('Before')
    })

    it('should have AFTER operator', () => {
      const op = DATE_OPERATORS.find(op => op.value === 'AFTER')
      expect(op).toBeDefined()
      expect(op?.label).toBe('After')
    })

    it('should have exactly 3 operators', () => {
      expect(DATE_OPERATORS).toHaveLength(3)
    })
  })

  describe('getDefaultOperator', () => {
    it('should return CONTAINS for text type', () => {
      expect(getDefaultOperator('text')).toBe('CONTAINS')
    })

    it('should return GREATER_THAN_OR_EQUAL for numericRange type', () => {
      expect(getDefaultOperator('numericRange')).toBe('GREATER_THAN_OR_EQUAL')
    })

    it('should return BETWEEN for dateRange type', () => {
      expect(getDefaultOperator('dateRange')).toBe('BETWEEN')
    })

    it('should return null for boolean type', () => {
      expect(getDefaultOperator('boolean')).toBeNull()
    })

    it('should return null for concept type', () => {
      expect(getDefaultOperator('concept')).toBeNull()
    })

    it('should return null for conceptSet type', () => {
      expect(getDefaultOperator('conceptSet')).toBeNull()
    })

    it('should return null for temporalRelationship type', () => {
      expect(getDefaultOperator('temporalRelationship')).toBeNull()
    })

    it('should return null for dateAdjustment type', () => {
      expect(getDefaultOperator('dateAdjustment')).toBeNull()
    })

    it('should return null for userDefinedPeriod type', () => {
      expect(getDefaultOperator('userDefinedPeriod')).toBeNull()
    })

    it('should return null for nested type', () => {
      expect(getDefaultOperator('nested')).toBeNull()
    })

    it('should return null for unknown types', () => {
      expect(getDefaultOperator('unknown')).toBeNull()
      expect(getDefaultOperator('random')).toBeNull()
      expect(getDefaultOperator('')).toBeNull()
    })
  })
})
