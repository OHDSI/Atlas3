/**
 * Unit Tests: useExitCriteriaValidation Composable
 * Tests for src/composables/useExitCriteriaValidation.ts
 */

import { describe, it, expect } from 'vitest'
import { useExitCriteriaValidation } from '@/composables/useExitCriteriaValidation'
import type { ExitCriteria, Period } from '@/models/cohort.types'

describe('useExitCriteriaValidation', () => {
  const { validate, validateField, validateCensorWindow, validateCensorWindowField } =
    useExitCriteriaValidation()

  describe('validate', () => {
    describe('CONTINUOUS_OBSERVATION strategy', () => {
      it('validates valid CONTINUOUS_OBSERVATION criteria', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'CONTINUOUS_OBSERVATION',
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('FIXED_DURATION strategy', () => {
      it('validates valid FIXED_DURATION criteria with offset', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'FIXED_DURATION',
          offset: 30,
          dateField: 'START_DATE',
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('fails when FIXED_DURATION is missing offset', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'FIXED_DURATION',
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors[0].message).toContain('offset')
      })

      it('accepts zero offset for FIXED_DURATION', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'FIXED_DURATION',
          offset: 0,
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(true)
      })
    })

    describe('CONTINUOUS_DRUG strategy', () => {
      it('validates valid CONTINUOUS_DRUG criteria with conceptSet', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'CONTINUOUS_DRUG',
          conceptSet: {
            id: 123,
            name: 'Test Drug Set',
          },
          persistenceWindow: 30,
          surveillanceWindow: 0,
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('fails when CONTINUOUS_DRUG is missing conceptSet', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'CONTINUOUS_DRUG',
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors[0].message).toContain('concept set')
      })

      it('accepts string concept set id', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'CONTINUOUS_DRUG',
          conceptSet: {
            id: 'local-123',
            name: 'Local Drug Set',
          },
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(true)
      })
    })

    describe('CUSTOM_EVENT strategy', () => {
      it('validates valid CUSTOM_EVENT criteria', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'CUSTOM_EVENT',
          censoringEvents: [],
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(true)
      })
    })

    describe('undefined input', () => {
      it('returns valid for undefined exitCriteria', () => {
        const result = validate(undefined)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })

    describe('invalid strategy', () => {
      it('fails for unknown strategy', () => {
        const exitCriteria = {
          strategy: 'UNKNOWN_STRATEGY',
        } as ExitCriteria

        const result = validate(exitCriteria)

        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    describe('field validation', () => {
      it('rejects negative offset', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'FIXED_DURATION',
          offset: -1,
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(false)
      })

      it('rejects non-integer offset', () => {
        const exitCriteria: ExitCriteria = {
          strategy: 'FIXED_DURATION',
          offset: 30.5,
        }

        const result = validate(exitCriteria)

        expect(result.valid).toBe(false)
      })
    })
  })

  describe('validateField', () => {
    it('returns true for valid field', () => {
      const exitCriteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        offset: 30,
      }

      const result = validateField(exitCriteria, 'offset')

      expect(result).toBe(true)
    })

    it('returns error message for invalid field', () => {
      const exitCriteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        // Missing required offset
      }

      const result = validateField(exitCriteria, 'offset')

      expect(typeof result).toBe('string')
      expect(result).toContain('offset')
    })

    it('returns true if field is valid but other fields are invalid', () => {
      const exitCriteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        offset: 30,
      }

      // Strategy field is valid
      const result = validateField(exitCriteria, 'strategy')

      expect(result).toBe(true)
    })
  })

  describe('validateCensorWindow', () => {
    it('returns valid for undefined censorWindow', () => {
      const result = validateCensorWindow(undefined)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns valid for null censorWindow', () => {
      const result = validateCensorWindow(null)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validates valid censor window with start only', () => {
      const censorWindow: Period = {
        startDate: {
          dateField: 'START_DATE',
          offset: 0,
        },
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(true)
    })

    it('validates valid censor window with end only', () => {
      const censorWindow: Period = {
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(true)
    })

    it('validates valid censor window with both dates', () => {
      const censorWindow: Period = {
        startDate: {
          dateField: 'START_DATE',
          offset: 0,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(true)
    })

    it('fails when start offset is greater than end offset', () => {
      const censorWindow: Period = {
        startDate: {
          dateField: 'START_DATE',
          offset: 100,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].severity).toBe('warning')
    })

    it('accepts equal start and end offsets', () => {
      const censorWindow: Period = {
        startDate: {
          dateField: 'START_DATE',
          offset: 30,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(true)
    })

    it('validates dateField enum values', () => {
      const censorWindow: Period = {
        startDate: {
          dateField: 'INVALID' as 'START_DATE',
          offset: 0,
        },
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.valid).toBe(false)
    })
  })

  describe('validateCensorWindowField', () => {
    it('returns true for valid field', () => {
      const censorWindow: Period = {
        startDate: {
          dateField: 'START_DATE',
          offset: 0,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      }

      const result = validateCensorWindowField(censorWindow, 'startDate.offset')

      expect(result).toBe(true)
    })

    it('returns error message for invalid field', () => {
      const censorWindow: Period = {
        startDate: {
          dateField: 'START_DATE',
          offset: 100,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      }

      const result = validateCensorWindowField(censorWindow, 'endDate.offset')

      expect(typeof result).toBe('string')
    })
  })

  describe('error field paths', () => {
    it('includes exitCriteria prefix in error fields', () => {
      const exitCriteria: ExitCriteria = {
        strategy: 'FIXED_DURATION',
      }

      const result = validate(exitCriteria)

      expect(result.errors[0].field).toContain('exitCriteria')
    })

    it('includes censorWindow prefix in error fields', () => {
      const censorWindow: Period = {
        startDate: {
          dateField: 'START_DATE',
          offset: 100,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      }

      const result = validateCensorWindow(censorWindow)

      expect(result.errors[0].field).toContain('censorWindow')
    })
  })
})
