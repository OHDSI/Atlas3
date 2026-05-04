/**
 * Type Guards Tests
 * Tests for discriminated union type guards
 */
import { describe, it, expect } from 'vitest'
import {
  isNumericRange,
  isConceptSetAttribute,
  isDateRange,
  isTextAttribute,
  isBooleanAttribute,
  isWebAPIId,
  isClientSideId,
} from '@/utils/type-guards'
import type {
  NumericRangeAttribute,
  ConceptSetAttribute,
  DateRangeAttribute,
  TextAttribute,
  BooleanAttribute,
} from '@/models/event.types'

describe('Type Guards', () => {
  describe('isNumericRange', () => {
    it('should return true for numeric range attributes', () => {
      const attr: NumericRangeAttribute = {
        type: 'numericRange',
        attributeKey: 'age',
        operator: 'GREATER_THAN',
        value: 18,
      }

      expect(isNumericRange(attr)).toBe(true)
    })

    it('should return false for non-numeric range attributes', () => {
      const attr: ConceptSetAttribute = {
        type: 'conceptSet',
        attributeKey: 'gender',
        conceptSet: { id: 1, name: 'Male' },
      }

      expect(isNumericRange(attr)).toBe(false)
    })
  })

  describe('isConceptSetAttribute', () => {
    it('should return true for concept set attributes', () => {
      const attr: ConceptSetAttribute = {
        type: 'conceptSet',
        attributeKey: 'gender',
        conceptSet: { id: 1, name: 'Male' },
      }

      expect(isConceptSetAttribute(attr)).toBe(true)
    })

    it('should return false for non-concept set attributes', () => {
      const attr: NumericRangeAttribute = {
        type: 'numericRange',
        attributeKey: 'age',
        operator: 'GREATER_THAN',
        value: 18,
      }

      expect(isConceptSetAttribute(attr)).toBe(false)
    })
  })

  describe('isDateRange', () => {
    it('should return true for date range attributes', () => {
      const attr: DateRangeAttribute = {
        type: 'dateRange',
        attributeKey: 'eventDate',
        operator: 'GREATER_THAN',
        value: '2020-01-01',
      }

      expect(isDateRange(attr)).toBe(true)
    })

    it('should return false for non-date range attributes', () => {
      const attr: TextAttribute = {
        type: 'text',
        attributeKey: 'sourceValue',
        operator: 'CONTAINS',
        value: 'test',
      }

      expect(isDateRange(attr)).toBe(false)
    })
  })

  describe('isTextAttribute', () => {
    it('should return true for text attributes', () => {
      const attr: TextAttribute = {
        type: 'text',
        attributeKey: 'sourceValue',
        operator: 'CONTAINS',
        value: 'test',
      }

      expect(isTextAttribute(attr)).toBe(true)
    })

    it('should return false for non-text attributes', () => {
      const attr: BooleanAttribute = {
        type: 'boolean',
        attributeKey: 'isPrimary',
        value: true,
      }

      expect(isTextAttribute(attr)).toBe(false)
    })
  })

  describe('isBooleanAttribute', () => {
    it('should return true for boolean attributes', () => {
      const attr: BooleanAttribute = {
        type: 'boolean',
        attributeKey: 'isPrimary',
        value: true,
      }

      expect(isBooleanAttribute(attr)).toBe(true)
    })

    it('should return false for non-boolean attributes', () => {
      const attr: NumericRangeAttribute = {
        type: 'numericRange',
        attributeKey: 'age',
        operator: 'GREATER_THAN',
        value: 18,
      }

      expect(isBooleanAttribute(attr)).toBe(false)
    })
  })

  describe('isWebAPIId', () => {
    it('should return true for numeric IDs', () => {
      expect(isWebAPIId(123)).toBe(true)
      expect(isWebAPIId(0)).toBe(true)
      expect(isWebAPIId(-1)).toBe(true)
    })

    it('should return false for string IDs', () => {
      expect(isWebAPIId('uuid-123')).toBe(false)
      expect(isWebAPIId('test')).toBe(false)
      expect(isWebAPIId('')).toBe(false)
    })
  })

  describe('isClientSideId', () => {
    it('should return true for string IDs', () => {
      expect(isClientSideId('uuid-123')).toBe(true)
      expect(isClientSideId('test')).toBe(true)
      expect(isClientSideId('')).toBe(true)
    })

    it('should return false for numeric IDs', () => {
      expect(isClientSideId(123)).toBe(false)
      expect(isClientSideId(0)).toBe(false)
    })
  })
})
