import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import type { TemporalWindow } from '@/models/event.types'

describe('useTemporalWindows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const { validateTemporalWindows, formatTemporalWindowDisplay, defaultWindow } = useTemporalWindows()

  describe('validateTemporalWindows', () => {
    it('should validate temporal windows with valid days', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        endWindow: { days: 90, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const result = validateTemporalWindows(temporalWindow)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative days', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: -10, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const result = validateTemporalWindows(temporalWindow)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Start window: Days must be >= 0 or null for "all time"')
    })

    it('should allow null days for all time windows', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: null, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' }
      }
      const result = validateTemporalWindows(temporalWindow)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate start window comes before end window', () => {
      const invalidRange: TemporalWindow = {
        startWindow: { days: 90, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const result = validateTemporalWindows(invalidRange)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Start window must come before end window')
    })
  })

  describe('formatTemporalWindowDisplay', () => {
    it('should format 0 to 90 days after index', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        endWindow: { days: 90, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toBe('0 to 90 days after index start')
    })

    it('should format 30 days before to 0 days after index', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 30, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' },
        endWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('30 days before')
      expect(display).toContain('0 days after')
    })

    it('should format 0 to 365 days after index end', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_END' },
        endWindow: { days: 365, beforeAfter: 'AFTER', referencePoint: 'INDEX_END' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('days after')
      expect(display).toContain('index end')
    })

    it('should format start window only', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('From')
      expect(display).toContain('after')
    })

    it('should format end window only', () => {
      const temporalWindow: TemporalWindow = {
        endWindow: { days: 90, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('Up to')
    })

    it('should handle singular day', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 1, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('1 day')
    })
  })

  describe('defaultWindow', () => {
    it('should provide default window values', () => {
      const defaults = defaultWindow()
      expect(defaults.days).toBe(0)
      expect(defaults.beforeAfter).toBe('AFTER')
      expect(defaults.referencePoint).toBe('INDEX_START')
    })

    it('should allow customizing direction', () => {
      const before = defaultWindow('before')
      expect(before.beforeAfter).toBe('BEFORE')
    })

    it('should allow customizing days', () => {
      const custom = defaultWindow('after', 90)
      expect(custom.days).toBe(90)
    })

    it('should return a new object each time', () => {
      const first = defaultWindow()
      const second = defaultWindow()
      expect(first).not.toBe(second)
      expect(first).toEqual(second)
    })
  })
})
