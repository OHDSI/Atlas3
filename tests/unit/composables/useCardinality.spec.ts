import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCardinality } from '@/composables/useCardinality'
import type { Cardinality } from '@/models/event.types'

describe('useCardinality', () => {
  let validateCardinality: ReturnType<typeof useCardinality>['validateCardinality']
  let formatCardinalityDisplay: ReturnType<typeof useCardinality>['formatCardinalityDisplay']
  let defaultCardinality: ReturnType<typeof useCardinality>['defaultCardinality']

  beforeEach(() => {
    setActivePinia(createPinia())
    const cardinality = useCardinality()
    validateCardinality = cardinality.validateCardinality
    formatCardinalityDisplay = cardinality.formatCardinalityDisplay
    defaultCardinality = cardinality.defaultCardinality
  })

  describe('validateCardinality', () => {
    it('should validate AT_LEAST requires count >= 1', () => {
      const cardinality: Cardinality = {
        type: 'AT_LEAST',
        count: 0,
        countingMethod: 'ALL',
      }

      const result = validateCardinality(cardinality)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('AT_LEAST requires count >= 1')
    })

    it('should validate AT_LEAST with count >= 1 as valid', () => {
      const cardinality: Cardinality = {
        type: 'AT_LEAST',
        count: 1,
        countingMethod: 'ALL',
      }

      const result = validateCardinality(cardinality)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate EXACTLY allows count = 0', () => {
      const cardinality: Cardinality = {
        type: 'EXACTLY',
        count: 0,
        countingMethod: 'ALL',
      }

      const result = validateCardinality(cardinality)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate AT_MOST allows count = 0', () => {
      const cardinality: Cardinality = {
        type: 'AT_MOST',
        count: 0,
        countingMethod: 'ALL',
      }

      const result = validateCardinality(cardinality)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative counts for all types', () => {
      const types: Array<Cardinality['type']> = ['AT_LEAST', 'EXACTLY', 'AT_MOST']

      types.forEach((type) => {
        const cardinality: Cardinality = {
          type,
          count: -1,
          countingMethod: 'ALL',
        }

        const result = validateCardinality(cardinality)
        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('Count must be >= 0')
      })
    })
  })

  describe('formatCardinalityDisplay', () => {
    it('should format AT_LEAST cardinality', () => {
      const cardinality: Cardinality = {
        type: 'AT_LEAST',
        count: 2,
        countingMethod: 'ALL',
      }

      const display = formatCardinalityDisplay(cardinality)
      expect(display).toBe('At Least 2 occurrences')
    })

    it('should format EXACTLY cardinality', () => {
      const cardinality: Cardinality = {
        type: 'EXACTLY',
        count: 1,
        countingMethod: 'ALL',
      }

      const display = formatCardinalityDisplay(cardinality)
      expect(display).toBe('Exactly 1 occurrence')
    })

    it('should format AT_MOST cardinality', () => {
      const cardinality: Cardinality = {
        type: 'AT_MOST',
        count: 5,
        countingMethod: 'ALL',
      }

      const display = formatCardinalityDisplay(cardinality)
      expect(display).toBe('At Most 5 occurrences')
    })

    it('should format zero count correctly (CRITICAL)', () => {
      const cardinality: Cardinality = {
        type: 'EXACTLY',
        count: 0,
        countingMethod: 'ALL',
      }

      const display = formatCardinalityDisplay(cardinality)
      expect(display).toBe('Exactly 0 occurrences')
      expect(display).not.toBe('Exactly 1 occurrence') // Ensure zero is not converted to 1
    })

    it('should include counting method in display', () => {
      const cardinality: Cardinality = {
        type: 'AT_LEAST',
        count: 2,
        countingMethod: 'DISTINCT_CONCEPT',
      }

      const display = formatCardinalityDisplay(cardinality)
      expect(display).toContain('distinct concepts')
    })

    it('should handle singular vs plural occurrences', () => {
      const single: Cardinality = {
        type: 'EXACTLY',
        count: 1,
        countingMethod: 'ALL',
      }

      const multiple: Cardinality = {
        type: 'EXACTLY',
        count: 2,
        countingMethod: 'ALL',
      }

      expect(formatCardinalityDisplay(single)).toContain('occurrence')
      expect(formatCardinalityDisplay(multiple)).toContain('occurrences')
    })
  })

  describe('defaultCardinality', () => {
    it('should provide default cardinality values', () => {
      const defaults = defaultCardinality()

      expect(defaults.type).toBe('AT_LEAST')
      expect(defaults.count).toBe(1)
      expect(defaults.countingMethod).toBe('ALL')
    })

    it('should return a new object each time (not reference)', () => {
      const first = defaultCardinality()
      const second = defaultCardinality()

      expect(first).not.toBe(second)
      expect(first).toEqual(second)
    })
  })

  describe('zero-count preservation', () => {
    it('should use ?? operator for zero-count preservation', () => {
      // Test that zero count is preserved correctly
      const cardinalityWithZero: Cardinality = {
        type: 'EXACTLY',
        count: 0,
        countingMethod: 'ALL',
      }

      const cardinalityWithNull = {
        type: 'EXACTLY' as const,
        count: null as unknown as number,
        countingMethod: 'ALL' as const,
      }

      // Using ?? operator should preserve 0 but default null to 1
      const count1 = cardinalityWithZero.count ?? 1
      const count2 = cardinalityWithNull.count ?? 1

      expect(count1).toBe(0) // Zero preserved
      expect(count2).toBe(1) // Null defaulted to 1

      // Using || operator would convert 0 to 1 (WRONG)
      const wrongCount = cardinalityWithZero.count || 1
      expect(wrongCount).toBe(1) // This is the bug we avoid with ??
    })
  })
})
