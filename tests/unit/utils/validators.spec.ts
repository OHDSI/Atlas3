/**
 * Validators Utility Tests
 * Tests for cohort validation rules
 */
import { describe, it, expect } from 'vitest'
import {
  validateCohort,
  validateCardinality,
  validateEvent,
  validateAttribute,
  validateEventAttributes,
  hasValidationErrors
} from '@/utils/validators'
import type { CohortDefinition, CohortEvent } from '@/models/cohort.types'
import type { Cardinality, EventAttribute, NumericRangeAttribute, DateRangeAttribute } from '@/models/event.types'

describe('Validators', () => {
  describe('validateCohort', () => {
    it('should return error when name is empty', () => {
      const cohort: CohortDefinition = {
        id: 1,
        name: '',
        entryEvents: [{ id: '1', criteriaType: 'ConditionOccurrence', attributes: [] }],
        inclusionRules: [],
        conceptSets: []
      }

      const errors = validateCohort(cohort)

      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('name')
      expect(errors[0].message).toContain('required')
    })

    it('should return error when name is whitespace only', () => {
      const cohort: CohortDefinition = {
        id: 1,
        name: '   ',
        entryEvents: [{ id: '1', criteriaType: 'ConditionOccurrence', attributes: [] }],
        inclusionRules: [],
        conceptSets: []
      }

      const errors = validateCohort(cohort)

      expect(errors.some(e => e.field === 'name')).toBe(true)
    })

    it('should return error when no entry events', () => {
      const cohort: CohortDefinition = {
        id: 1,
        name: 'Test Cohort',
        entryEvents: [],
        inclusionRules: [],
        conceptSets: []
      }

      const errors = validateCohort(cohort)

      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('entryEvents')
    })

    it('should return no errors for valid cohort', () => {
      const cohort: CohortDefinition = {
        id: 1,
        name: 'Test Cohort',
        entryEvents: [{ id: '1', criteriaType: 'ConditionOccurrence', attributes: [] }],
        inclusionRules: [],
        conceptSets: []
      }

      const errors = validateCohort(cohort)

      expect(errors).toHaveLength(0)
    })
  })

  describe('validateCardinality', () => {
    it('should return error when AT_LEAST has count < 1', () => {
      const cardinality: Cardinality = {
        type: 'AT_LEAST',
        count: 0
      }

      const errors = validateCardinality(cardinality)

      expect(errors.some(e => e.message.includes('AT_LEAST'))).toBe(true)
    })

    it('should return error for negative count', () => {
      const cardinality: Cardinality = {
        type: 'EXACTLY',
        count: -1
      }

      const errors = validateCardinality(cardinality)

      expect(errors.some(e => e.message.includes('negative'))).toBe(true)
    })

    it('should pass when AT_LEAST has count >= 1', () => {
      const cardinality: Cardinality = {
        type: 'AT_LEAST',
        count: 1
      }

      const errors = validateCardinality(cardinality)

      expect(errors).toHaveLength(0)
    })

    it('should allow EXACTLY with count 0', () => {
      const cardinality: Cardinality = {
        type: 'EXACTLY',
        count: 0
      }

      const errors = validateCardinality(cardinality)

      expect(errors).toHaveLength(0)
    })

    it('should allow AT_MOST with count 0', () => {
      const cardinality: Cardinality = {
        type: 'AT_MOST',
        count: 0
      }

      const errors = validateCardinality(cardinality)

      expect(errors).toHaveLength(0)
    })
  })

  describe('validateEvent', () => {
    it('should return error when criteriaType is missing', () => {
      const event = { id: '1', attributes: [] } as CohortEvent

      const errors = validateEvent(event)

      expect(errors.some(e => e.field === 'criteriaType')).toBe(true)
    })

    it('should pass for valid event', () => {
      const event: CohortEvent = {
        id: '1',
        criteriaType: 'ConditionOccurrence',
        attributes: []
      }

      const errors = validateEvent(event)

      expect(errors).toHaveLength(0)
    })
  })

  describe('validateAttribute', () => {
    it('should return error when attributeKey is empty', () => {
      const attribute = {
        attributeKey: '',
        type: 'numericRange'
      } as EventAttribute

      const errors = validateAttribute(attribute)

      expect(errors.some(e => e.message.includes('key is required'))).toBe(true)
    })

    it('should validate numericRange requires operator', () => {
      const attribute = {
        attributeKey: 'age',
        type: 'numericRange',
        value: 50
      } as NumericRangeAttribute

      const errors = validateAttribute(attribute)

      expect(errors.some(e => e.message.includes('operator'))).toBe(true)
    })

    it('should validate numericRange requires value', () => {
      const attribute = {
        attributeKey: 'age',
        type: 'numericRange',
        operator: 'GREATER_THAN'
      } as NumericRangeAttribute

      const errors = validateAttribute(attribute)

      expect(errors.some(e => e.message.includes('value'))).toBe(true)
    })

    it('should validate extent > value for numericRange', () => {
      const attribute: NumericRangeAttribute = {
        attributeKey: 'age',
        type: 'numericRange',
        operator: 'GREATER_THAN',
        value: 50,
        extent: 40 // Invalid: extent < value
      }

      const errors = validateAttribute(attribute)

      expect(errors.some(e => e.message.includes('Extent'))).toBe(true)
    })

    it('should validate conceptSet requires concept set', () => {
      const attribute = {
        attributeKey: 'conditionType',
        type: 'conceptSet'
      } as EventAttribute

      const errors = validateAttribute(attribute)

      expect(errors.some(e => e.message.includes('Concept set'))).toBe(true)
    })

    it('should validate dateRange requires operator', () => {
      const attribute = {
        attributeKey: 'startDate',
        type: 'dateRange',
        value: '2024-01-01'
      } as DateRangeAttribute

      const errors = validateAttribute(attribute)

      expect(errors.some(e => e.message.includes('operator'))).toBe(true)
    })

    it('should validate BETWEEN requires both value and extent', () => {
      const attribute: DateRangeAttribute = {
        attributeKey: 'startDate',
        type: 'dateRange',
        operator: 'BETWEEN',
        value: '2024-01-01'
        // Missing extent
      }

      const errors = validateAttribute(attribute)

      expect(errors.some(e => e.message.includes('BETWEEN'))).toBe(true)
    })

    it('should validate date extent > value', () => {
      const attribute: DateRangeAttribute = {
        attributeKey: 'startDate',
        type: 'dateRange',
        operator: 'BETWEEN',
        value: '2024-06-01',
        extent: '2024-01-01' // Invalid: extent before value
      }

      const errors = validateAttribute(attribute)

      expect(errors.some(e => e.message.includes('after'))).toBe(true)
    })
  })

  describe('validateEventAttributes', () => {
    it('should validate all attributes in event', () => {
      const event: CohortEvent = {
        id: '1',
        criteriaType: 'ConditionOccurrence',
        attributes: [
          { attributeKey: '', type: 'numericRange' } as EventAttribute,
          { attributeKey: 'test', type: 'numericRange', operator: 'GREATER_THAN' } as NumericRangeAttribute
        ]
      }

      const errors = validateEventAttributes(event)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.field.includes('attributes[0]'))).toBe(true)
    })

    it('should return empty for event with no attributes', () => {
      const event: CohortEvent = {
        id: '1',
        criteriaType: 'ConditionOccurrence',
        attributes: []
      }

      const errors = validateEventAttributes(event)

      expect(errors).toHaveLength(0)
    })
  })

  describe('hasValidationErrors', () => {
    it('should return true when errors exist', () => {
      const errors = [{ field: 'name', message: 'Required' }]

      expect(hasValidationErrors(errors)).toBe(true)
    })

    it('should return false when no errors', () => {
      expect(hasValidationErrors([])).toBe(false)
    })
  })
})
