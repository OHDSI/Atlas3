/**
 * Unit Tests: Validators
 * Tests for src/utils/validators.ts
 */

import { describe, it, expect } from 'vitest'
import {
  validateCohort,
  validateCardinality,
  validateEvent,
  validateAttribute,
  validateEventAttributes,
  hasValidationErrors,
} from '@/utils/validators'
import type { CohortDefinition, CohortEvent } from '@/models/cohort.types'
import type { EventAttribute, NumericRangeAttribute, DateRangeAttribute } from '@/models/event.types'

describe('validators', () => {
  describe('validateCohort', () => {
    it('returns no errors for valid cohort', () => {
      const cohort: CohortDefinition = {
        name: 'Test Cohort',
        entryEvents: [{ id: '1', criteriaType: 'CONDITION_OCCURRENCE' } as CohortEvent],
      } as CohortDefinition

      const errors = validateCohort(cohort)
      expect(errors).toHaveLength(0)
    })

    it('returns error for missing name', () => {
      const cohort = {
        name: '',
        entryEvents: [{ id: '1' }],
      } as CohortDefinition

      const errors = validateCohort(cohort)
      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('name')
      expect(errors[0].message).toBe('Cohort name is required')
    })

    it('returns error for whitespace-only name', () => {
      const cohort = {
        name: '   ',
        entryEvents: [{ id: '1' }],
      } as CohortDefinition

      const errors = validateCohort(cohort)
      expect(errors.some(e => e.field === 'name')).toBe(true)
    })

    it('returns error for no entry events', () => {
      const cohort = {
        name: 'Test Cohort',
        entryEvents: [],
      } as CohortDefinition

      const errors = validateCohort(cohort)
      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('entryEvents')
      expect(errors[0].message).toBe('At least one entry event is required')
    })

    it('returns multiple errors when both name and events invalid', () => {
      const cohort = {
        name: '',
        entryEvents: [],
      } as CohortDefinition

      const errors = validateCohort(cohort)
      expect(errors).toHaveLength(2)
    })
  })

  describe('validateCardinality', () => {
    it('allows AT_LEAST with count >= 1', () => {
      const errors = validateCardinality({ type: 'AT_LEAST', count: 1 })
      expect(errors).toHaveLength(0)
    })

    it('allows AT_LEAST with count > 1', () => {
      const errors = validateCardinality({ type: 'AT_LEAST', count: 5 })
      expect(errors).toHaveLength(0)
    })

    it('rejects AT_LEAST with count < 1', () => {
      const errors = validateCardinality({ type: 'AT_LEAST', count: 0 })
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('AT_LEAST')
    })

    it('allows EXACTLY with count = 0', () => {
      const errors = validateCardinality({ type: 'EXACTLY', count: 0 })
      expect(errors).toHaveLength(0)
    })

    it('allows AT_MOST with count = 0', () => {
      const errors = validateCardinality({ type: 'AT_MOST', count: 0 })
      expect(errors).toHaveLength(0)
    })

    it('rejects negative count for any type', () => {
      const errors = validateCardinality({ type: 'EXACTLY', count: -1 })
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('negative')
    })
  })

  describe('validateEvent', () => {
    it('returns no errors for valid event', () => {
      const event = {
        id: '1',
        criteriaType: 'CONDITION_OCCURRENCE',
      } as CohortEvent

      const errors = validateEvent(event)
      expect(errors).toHaveLength(0)
    })

    it('returns error for missing criteriaType', () => {
      const event = {
        id: '1',
      } as CohortEvent

      const errors = validateEvent(event)
      expect(errors).toHaveLength(1)
      expect(errors[0].field).toBe('criteriaType')
    })
  })

  describe('validateAttribute', () => {
    describe('common validation', () => {
      it('returns error for missing attributeKey', () => {
        const attribute = {
          type: 'numericRange',
          attributeKey: '',
          operator: 'EQUAL',
          value: 10,
        } as EventAttribute

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.field === 'attribute.attributeKey')).toBe(true)
      })

      it('returns error for whitespace-only attributeKey', () => {
        const attribute = {
          type: 'numericRange',
          attributeKey: '   ',
          operator: 'EQUAL',
          value: 10,
        } as EventAttribute

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.field === 'attribute.attributeKey')).toBe(true)
      })
    })

    describe('numericRange validation', () => {
      it('returns no errors for valid numeric attribute', () => {
        const attribute: NumericRangeAttribute = {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'EQUAL',
          value: 25,
          extent: null,
        }

        const errors = validateAttribute(attribute)
        expect(errors).toHaveLength(0)
      })

      it('returns error for missing operator', () => {
        const attribute = {
          type: 'numericRange',
          attributeKey: 'age',
          value: 25,
        } as NumericRangeAttribute

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.field === 'attribute.operator')).toBe(true)
      })

      it('returns error for missing value', () => {
        const attribute = {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'EQUAL',
          value: null,
        } as unknown as NumericRangeAttribute

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.field === 'attribute.value')).toBe(true)
      })

      it('returns error when extent is not greater than value', () => {
        const attribute: NumericRangeAttribute = {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'BETWEEN',
          value: 50,
          extent: 25,
        }

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.field === 'attribute.extent')).toBe(true)
      })

      it('returns no error when extent > value', () => {
        const attribute: NumericRangeAttribute = {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'BETWEEN',
          value: 25,
          extent: 50,
        }

        const errors = validateAttribute(attribute)
        expect(errors.filter(e => e.field === 'attribute.extent')).toHaveLength(0)
      })
    })

    describe('conceptSet validation', () => {
      it('returns no errors for valid concept set attribute', () => {
        const attribute = {
          type: 'conceptSet',
          attributeKey: 'drugSource',
          conceptSet: { id: 1, name: 'Test Set' },
        } as EventAttribute

        const errors = validateAttribute(attribute)
        expect(errors).toHaveLength(0)
      })

      it('returns error for missing concept set', () => {
        const attribute = {
          type: 'conceptSet',
          attributeKey: 'drugSource',
        } as EventAttribute

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.field === 'attribute.conceptSet')).toBe(true)
      })

      it('returns error for concept set without id', () => {
        const attribute = {
          type: 'conceptSet',
          attributeKey: 'drugSource',
          conceptSet: { name: 'Test' },
        } as EventAttribute

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.field === 'attribute.conceptSet')).toBe(true)
      })
    })

    describe('dateRange validation', () => {
      it('returns no errors for valid date attribute with single value', () => {
        const attribute: DateRangeAttribute = {
          type: 'dateRange',
          attributeKey: 'startDate',
          operator: 'GREATER_THAN',
          value: '2024-01-01',
          extent: null,
        }

        const errors = validateAttribute(attribute)
        expect(errors).toHaveLength(0)
      })

      it('returns error for missing operator', () => {
        const attribute = {
          type: 'dateRange',
          attributeKey: 'startDate',
          value: '2024-01-01',
        } as DateRangeAttribute

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.field === 'attribute.operator')).toBe(true)
      })

      it('returns error for comparison operators without value', () => {
        const attribute: DateRangeAttribute = {
          type: 'dateRange',
          attributeKey: 'startDate',
          operator: 'GREATER_THAN',
          value: '',
          extent: null,
        }

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.message.includes('Date value is required'))).toBe(true)
      })

      it('returns error for BETWEEN without both dates', () => {
        const attribute: DateRangeAttribute = {
          type: 'dateRange',
          attributeKey: 'dateRange',
          operator: 'BETWEEN',
          value: '2024-01-01',
          extent: null,
        }

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.message.includes('Both value and extent'))).toBe(true)
      })

      it('returns error when extent date is before value date', () => {
        const attribute: DateRangeAttribute = {
          type: 'dateRange',
          attributeKey: 'dateRange',
          operator: 'BETWEEN',
          value: '2024-06-01',
          extent: '2024-01-01',
        }

        const errors = validateAttribute(attribute)
        expect(errors.some(e => e.message.includes('Extent date must be after'))).toBe(true)
      })

      it('returns no errors for valid BETWEEN dates', () => {
        const attribute: DateRangeAttribute = {
          type: 'dateRange',
          attributeKey: 'dateRange',
          operator: 'BETWEEN',
          value: '2024-01-01',
          extent: '2024-12-31',
        }

        const errors = validateAttribute(attribute)
        expect(errors.filter(e => e.field.includes('date'))).toHaveLength(0)
      })
    })
  })

  describe('validateEventAttributes', () => {
    it('returns no errors when no attributes', () => {
      const event = {
        id: '1',
        criteriaType: 'CONDITION_OCCURRENCE',
      } as CohortEvent

      const errors = validateEventAttributes(event)
      expect(errors).toHaveLength(0)
    })

    it('validates all attributes and prefixes errors', () => {
      const event = {
        id: '1',
        criteriaType: 'CONDITION_OCCURRENCE',
        attributes: [
          { type: 'numericRange', attributeKey: '', operator: 'EQUAL', value: 10 },
          { type: 'numericRange', attributeKey: 'valid', operator: 'EQUAL', value: 5 },
        ],
      } as CohortEvent

      const errors = validateEventAttributes(event)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].field).toMatch(/^attributes\[0\]/)
    })

    it('returns empty array when attributes is undefined', () => {
      const event = {
        id: '1',
        criteriaType: 'CONDITION_OCCURRENCE',
        attributes: undefined,
      } as CohortEvent

      const errors = validateEventAttributes(event)
      expect(errors).toHaveLength(0)
    })
  })

  describe('hasValidationErrors', () => {
    it('returns false for empty errors array', () => {
      expect(hasValidationErrors([])).toBe(false)
    })

    it('returns true when errors exist', () => {
      const errors = [{ field: 'name', message: 'Required' }]
      expect(hasValidationErrors(errors)).toBe(true)
    })
  })
})
