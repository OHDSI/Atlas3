/**
 * Unit Tests: Validation Models
 * Tests for src/models/validation.ts
 */

import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import {
  LogicTypeSchema,
  NestedCriteriaSchema,
} from '@/models/validation'

describe('Validation Schemas', () => {
  describe('LogicTypeSchema', () => {
    it('accepts ALL', () => {
      expect(LogicTypeSchema.parse('ALL')).toBe('ALL')
    })

    it('accepts ANY', () => {
      expect(LogicTypeSchema.parse('ANY')).toBe('ANY')
    })

    it('accepts AT_LEAST', () => {
      expect(LogicTypeSchema.parse('AT_LEAST')).toBe('AT_LEAST')
    })

    it('accepts AT_MOST', () => {
      expect(LogicTypeSchema.parse('AT_MOST')).toBe('AT_MOST')
    })

    it('rejects invalid values', () => {
      expect(() => LogicTypeSchema.parse('INVALID')).toThrow()
      expect(() => LogicTypeSchema.parse('')).toThrow()
      expect(() => LogicTypeSchema.parse(null)).toThrow()
    })
  })

  describe('NestedCriteriaSchema', () => {
    it('validates basic ALL criteria', () => {
      const validCriteria = {
        id: uuidv4(),
        logicType: 'ALL',
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(validCriteria)
      expect(result.success).toBe(true)
    })

    it('validates basic ANY criteria', () => {
      const validCriteria = {
        id: uuidv4(),
        logicType: 'ANY',
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(validCriteria)
      expect(result.success).toBe(true)
    })

    it('validates AT_LEAST criteria with count', () => {
      const validCriteria = {
        id: uuidv4(),
        logicType: 'AT_LEAST',
        count: 1,
        events: [
          {
            id: uuidv4(),
            criteriaType: 'conditionOccurrence',
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
          },
        ],
      }

      const result = NestedCriteriaSchema.safeParse(validCriteria)
      expect(result.success).toBe(true)
    })

    it('validates AT_MOST criteria with count', () => {
      const validCriteria = {
        id: uuidv4(),
        logicType: 'AT_MOST',
        count: 2,
        events: [
          {
            id: uuidv4(),
            criteriaType: 'conditionOccurrence',
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
          },
          {
            id: uuidv4(),
            criteriaType: 'drugExposure',
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
          },
        ],
      }

      const result = NestedCriteriaSchema.safeParse(validCriteria)
      expect(result.success).toBe(true)
    })

    it('rejects AT_LEAST without count', () => {
      const invalidCriteria = {
        id: uuidv4(),
        logicType: 'AT_LEAST',
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(invalidCriteria)
      expect(result.success).toBe(false)
    })

    it('rejects AT_MOST without count', () => {
      const invalidCriteria = {
        id: uuidv4(),
        logicType: 'AT_MOST',
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(invalidCriteria)
      expect(result.success).toBe(false)
    })

    it('rejects ALL with count', () => {
      const invalidCriteria = {
        id: uuidv4(),
        logicType: 'ALL',
        count: 1,
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(invalidCriteria)
      expect(result.success).toBe(false)
    })

    it('rejects ANY with count', () => {
      const invalidCriteria = {
        id: uuidv4(),
        logicType: 'ANY',
        count: 1,
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(invalidCriteria)
      expect(result.success).toBe(false)
    })

    it('rejects count greater than events length', () => {
      const invalidCriteria = {
        id: uuidv4(),
        logicType: 'AT_LEAST',
        count: 5,
        events: [
          {
            id: uuidv4(),
            criteriaType: 'conditionOccurrence',
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
          },
        ],
      }

      const result = NestedCriteriaSchema.safeParse(invalidCriteria)
      expect(result.success).toBe(false)
    })

    it('rejects invalid UUID', () => {
      const invalidCriteria = {
        id: 'not-a-uuid',
        logicType: 'ALL',
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(invalidCriteria)
      expect(result.success).toBe(false)
    })

    it('rejects negative count', () => {
      const invalidCriteria = {
        id: uuidv4(),
        logicType: 'AT_LEAST',
        count: -1,
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(invalidCriteria)
      expect(result.success).toBe(false)
    })

    it('rejects zero count for AT_LEAST', () => {
      const invalidCriteria = {
        id: uuidv4(),
        logicType: 'AT_LEAST',
        count: 0,
        events: [],
      }

      const result = NestedCriteriaSchema.safeParse(invalidCriteria)
      expect(result.success).toBe(false)
    })

    it('validates criteria with events containing attributes', () => {
      const validCriteria = {
        id: uuidv4(),
        logicType: 'ALL',
        events: [
          {
            id: uuidv4(),
            criteriaType: 'conditionOccurrence',
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
            attributes: [
              {
                attributeKey: 'age',
                type: 'numericRange',
                operator: 'GREATER_THAN',
                value: 18,
              },
            ],
          },
        ],
      }

      const result = NestedCriteriaSchema.safeParse(validCriteria)
      expect(result.success).toBe(true)
    })

    it('validates criteria with temporal windows', () => {
      const validCriteria = {
        id: uuidv4(),
        logicType: 'ALL',
        events: [
          {
            id: uuidv4(),
            criteriaType: 'conditionOccurrence',
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
            temporalWindow: {
              startWindow: {
                days: 30,
                beforeAfter: 'BEFORE',
                useIndexEnd: false, useEventEnd: false,
              },
              endWindow: {
                days: 0,
                beforeAfter: 'AFTER',
                useIndexEnd: true, useEventEnd: false,
              },
            },
          },
        ],
      }

      const result = NestedCriteriaSchema.safeParse(validCriteria)
      expect(result.success).toBe(true)
    })

    it('validates a temporal window with both index-end and event-end flags true', () => {
      const validCriteria = {
        id: uuidv4(),
        logicType: 'ALL',
        events: [
          {
            id: uuidv4(),
            criteriaType: 'conditionOccurrence',
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
            temporalWindow: {
              startWindow: {
                days: 30,
                beforeAfter: 'BEFORE',
                useIndexEnd: true,
                useEventEnd: true,
              },
            },
          },
        ],
      }

      const result = NestedCriteriaSchema.safeParse(validCriteria)
      expect(result.success).toBe(true)
    })

    it('validates deeply nested criteria', () => {
      const validCriteria = {
        id: uuidv4(),
        logicType: 'ALL',
        events: [
          {
            id: uuidv4(),
            criteriaType: 'conditionOccurrence',
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
            nestedCriteria: {
              id: uuidv4(),
              logicType: 'ANY',
              events: [
                {
                  id: uuidv4(),
                  criteriaType: 'drugExposure',
                  cardinality: {
                    type: 'AT_LEAST',
                    count: 1,
                    countingMethod: 'ALL',
                  },
                },
              ],
            },
          },
        ],
      }

      const result = NestedCriteriaSchema.safeParse(validCriteria)
      expect(result.success).toBe(true)
    })
  })
})
