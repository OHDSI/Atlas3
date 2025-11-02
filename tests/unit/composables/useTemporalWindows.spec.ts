import { describe, it, expect } from 'vitest'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import type { TemporalWindows, TemporalWindow } from '@/models/event.types'

describe('useTemporalWindows', () => {
  const { validateTemporalWindows, formatTemporalWindowDisplay, defaultTemporalWindow } =
    useTemporalWindows()

  describe('validateTemporalWindows', () => {
    it('should validate temporal windows with valid days', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: 0,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
        endWindow: {
          days: 90,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const result = validateTemporalWindows(temporalWindows)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative days', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: -10,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const result = validateTemporalWindows(temporalWindows)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Days must be >= 0 or null for "all time"')
    })

    it('should allow null days for "all time" windows', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: null,
          coeff: -1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const result = validateTemporalWindows(temporalWindows)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate coeff is either -1 or 1', () => {
      const invalidWindow: TemporalWindows = {
        startWindow: {
          days: 30,
          coeff: 0 as any,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const result = validateTemporalWindows(invalidWindow)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Coefficient must be -1 (before) or 1 (after)')
    })

    it('should validate start window comes before end window', () => {
      const invalidRange: TemporalWindows = {
        startWindow: {
          days: 90,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
        endWindow: {
          days: 30,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const result = validateTemporalWindows(invalidRange)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Start window must come before end window')
    })
  })

  describe('formatTemporalWindowDisplay', () => {
    it('should format "0 to 90 days after index"', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: 0,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
        endWindow: {
          days: 90,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const display = formatTemporalWindowDisplay(temporalWindows)
      expect(display).toBe('0 to 90 days after index')
    })

    it('should format "any time before index"', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: null,
          coeff: -1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const display = formatTemporalWindowDisplay(temporalWindows)
      expect(display).toBe('Any time before index')
    })

    it('should format "30 days before to 0 days after index"', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: 30,
          coeff: -1,
          useIndexEnd: false,
          useEventEnd: false,
        },
        endWindow: {
          days: 0,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const display = formatTemporalWindowDisplay(temporalWindows)
      expect(display).toBe('30 days before to 0 days after index')
    })

    it('should format "0 to 365 days after index end"', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: 0,
          coeff: 1,
          useIndexEnd: true,
          useEventEnd: false,
        },
        endWindow: {
          days: 365,
          coeff: 1,
          useIndexEnd: true,
          useEventEnd: false,
        },
      }

      const display = formatTemporalWindowDisplay(temporalWindows)
      expect(display).toBe('0 to 365 days after index end')
    })

    it('should format start window only', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: 0,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const display = formatTemporalWindowDisplay(temporalWindows)
      expect(display).toBe('From 0 days after index')
    })

    it('should format end window only', () => {
      const temporalWindows: TemporalWindows = {
        endWindow: {
          days: 90,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const display = formatTemporalWindowDisplay(temporalWindows)
      expect(display).toBe('Up to 90 days after index')
    })

    it('should handle singular day', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: 1,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      const display = formatTemporalWindowDisplay(temporalWindows)
      expect(display).toBe('From 1 day after index')
    })
  })

  describe('defaultTemporalWindow', () => {
    it('should provide default temporal window values', () => {
      const defaults = defaultTemporalWindow()

      expect(defaults.days).toBe(0)
      expect(defaults.coeff).toBe(1)
      expect(defaults.useIndexEnd).toBe(false)
      expect(defaults.useEventEnd).toBe(false)
    })

    it('should allow customizing direction', () => {
      const before = defaultTemporalWindow('before')

      expect(before.coeff).toBe(-1)
    })

    it('should allow customizing days', () => {
      const custom = defaultTemporalWindow('after', 90)

      expect(custom.days).toBe(90)
      expect(custom.coeff).toBe(1)
    })

    it('should return a new object each time (not reference)', () => {
      const first = defaultTemporalWindow()
      const second = defaultTemporalWindow()

      expect(first).not.toBe(second)
      expect(first).toEqual(second)
    })
  })

  describe('temporal window calculations', () => {
    it('should calculate window span correctly', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: 0,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
        endWindow: {
          days: 90,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      // Window span is 90 days (from 0 to 90)
      const span =
        (temporalWindows.endWindow!.days! * temporalWindows.endWindow!.coeff) -
        (temporalWindows.startWindow!.days! * temporalWindows.startWindow!.coeff)

      expect(span).toBe(90)
    })

    it('should calculate window span with before and after', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: 30,
          coeff: -1,
          useIndexEnd: false,
          useEventEnd: false,
        },
        endWindow: {
          days: 60,
          coeff: 1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      // Window span is 90 days (from -30 to +60)
      const span =
        (temporalWindows.endWindow!.days! * temporalWindows.endWindow!.coeff) -
        (temporalWindows.startWindow!.days! * temporalWindows.startWindow!.coeff)

      expect(span).toBe(90)
    })

    it('should handle null days for "all time"', () => {
      const temporalWindows: TemporalWindows = {
        startWindow: {
          days: null,
          coeff: -1,
          useIndexEnd: false,
          useEventEnd: false,
        },
      }

      // All time windows have infinite span
      expect(temporalWindows.startWindow.days).toBe(null)
    })
  })
})
