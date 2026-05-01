/**
 * useExitCriteriaValidation Composable Tests
 * Tests for Zod-based validation of exit criteria and censor windows
 */
import { describe, it, expect } from 'vitest'
import { useExitCriteriaValidation } from '@/composables/useExitCriteriaValidation'
import type { ExitCriteria, CensorWindow } from '@/models/cohort.types'

describe('useExitCriteriaValidation', () => {
  describe('validate', () => {
    it('should return valid for undefined criteria', () => {
      const { validate } = useExitCriteriaValidation()

      const result = validate(undefined)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate CONTINUOUS_OBSERVATION strategy', () => {
      const { validate } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_OBSERVATION'
      }

      const result = validate(criteria)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate FIXED_DURATION strategy with offset', () => {
      const { validate } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        offset: 30,
        dateField: 'START_DATE'
      }

      const result = validate(criteria)

      expect(result.valid).toBe(true)
    })

    it('should fail FIXED_DURATION without offset', () => {
      const { validate } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        dateField: 'START_DATE'
      }

      const result = validate(criteria)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('offset'))).toBe(true)
    })

    it('should validate CONTINUOUS_DRUG strategy with concept set', () => {
      const { validate } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Drug Set' },
        persistenceWindow: 30,
        surveillanceWindow: 7
      }

      const result = validate(criteria)

      expect(result.valid).toBe(true)
    })

    it('should fail CONTINUOUS_DRUG without concept set', () => {
      const { validate } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        persistenceWindow: 30
      }

      const result = validate(criteria)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('concept set'))).toBe(true)
    })

    it('should fail with invalid strategy', () => {
      const { validate } = useExitCriteriaValidation()

      const criteria = {
        strategy: 'INVALID_STRATEGY'
      } as unknown as ExitCriteria

      const result = validate(criteria)

      expect(result.valid).toBe(false)
    })

    it('should fail with negative offset', () => {
      const { validate } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        offset: -10,
        dateField: 'START_DATE'
      }

      const result = validate(criteria)

      expect(result.valid).toBe(false)
    })

    it('should fail with invalid dateField', () => {
      const { validate } = useExitCriteriaValidation()

      const criteria = {
        strategy: 'FIXED_DURATION',
        offset: 30,
        dateField: 'INVALID_DATE'
      } as unknown as ExitCriteria

      const result = validate(criteria)

      expect(result.valid).toBe(false)
    })
  })

  describe('validateField', () => {
    it('should return true for valid field', () => {
      const { validateField } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        offset: 30,
        dateField: 'START_DATE'
      }

      const result = validateField(criteria, 'offset')

      expect(result).toBe(true)
    })

    it('should return error message for invalid field', () => {
      const { validateField } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        dateField: 'START_DATE'
        // Missing required offset
      }

      const result = validateField(criteria, 'offset')

      expect(typeof result).toBe('string')
      expect(result).toContain('offset')
    })

    it('should return true when field error not found', () => {
      const { validateField } = useExitCriteriaValidation()

      const criteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG'
        // Missing conceptSet but checking different field
      }

      const result = validateField(criteria, 'offset')

      // The error is on conceptSet, not offset
      expect(result).toBe(true)
    })
  })

  describe('validateCensorWindow', () => {
    it('should return valid for undefined censor window', () => {
      const { validateCensorWindow } = useExitCriteriaValidation()

      const result = validateCensorWindow(undefined)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return valid for null censor window', () => {
      const { validateCensorWindow } = useExitCriteriaValidation()

      const result = validateCensorWindow(null)

      expect(result.valid).toBe(true)
    })

    it('should validate valid censor window', () => {
      const { validateCensorWindow } = useExitCriteriaValidation()

      const censorWindow: CensorWindow = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(true)
    })

    it('should fail when startDate > endDate', () => {
      const { validateCensorWindow } = useExitCriteriaValidation()

      const censorWindow: CensorWindow = {
        startDate: '2024-12-31',
        endDate: '2024-01-01'
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.message.includes('Start date must be on or before end date'))).toBe(true)
    })

    it('should validate window with only startDate', () => {
      const { validateCensorWindow } = useExitCriteriaValidation()

      const censorWindow: CensorWindow = {
        startDate: '2024-01-01'
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(true)
    })

    it('should validate window with only endDate', () => {
      const { validateCensorWindow } = useExitCriteriaValidation()

      const censorWindow: CensorWindow = {
        endDate: '2024-12-31'
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(true)
    })

    it('should fail with invalid date format in censor window', () => {
      const { validateCensorWindow } = useExitCriteriaValidation()

      const censorWindow = {
        startDate: 'not-a-date'
      } as unknown as CensorWindow

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(false)
    })

    it('should include severity in validation errors', () => {
      const { validateCensorWindow } = useExitCriteriaValidation()

      const censorWindow: CensorWindow = {
        startDate: '2024-12-31',
        endDate: '2024-01-01'
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.errors[0].severity).toBe('warning')
    })
  })

  describe('validateCensorWindowField', () => {
    it('should return true for valid field', () => {
      const { validateCensorWindowField } = useExitCriteriaValidation()

      const censorWindow: CensorWindow = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }

      const result = validateCensorWindowField(censorWindow, 'startDate')

      expect(result).toBe(true)
    })

    it('should return error message for invalid field path', () => {
      const { validateCensorWindowField } = useExitCriteriaValidation()

      const censorWindow: CensorWindow = {
        startDate: '2024-12-31',
        endDate: '2024-01-01'
      }

      // The cross-field error is reported on path 'endDate'
      const result = validateCensorWindowField(censorWindow, 'endDate')

      expect(typeof result).toBe('string')
      expect(result).toContain('Start date must be on or before end date')
    })

    it('should return true when specific field has no error', () => {
      const { validateCensorWindowField } = useExitCriteriaValidation()

      const censorWindow: CensorWindow = {
        startDate: '2024-12-31',
        endDate: '2024-01-01'
      }

      // Error is on endDate, not startDate
      const result = validateCensorWindowField(censorWindow, 'startDate')

      expect(result).toBe(true)
    })
  })
})
