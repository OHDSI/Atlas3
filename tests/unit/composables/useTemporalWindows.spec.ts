import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import type { TemporalWindow } from '@/models/event.types'

describe('useTemporalWindows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const {
    validateTemporalWindows,
    formatTemporalWindowDisplay,
    defaultWindow,
    getTemporalWindowPresets
  } = useTemporalWindows()

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

    it('should reject negative days in end window', () => {
      const temporalWindow: TemporalWindow = {
        endWindow: { days: -5, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const result = validateTemporalWindows(temporalWindow)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('End window: Days must be >= 0 or null for "all time"')
    })

    it('should validate when one window has null days for comparison', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: null, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' },
        endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const result = validateTemporalWindows(temporalWindow)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate when both windows have null days', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: null, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' },
        endWindow: { days: null, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const result = validateTemporalWindows(temporalWindow)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
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

    it('should format no temporal constraints when no windows', () => {
      const temporalWindow: TemporalWindow = {}
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toBe('No temporal constraints')
    })

    it('should format "any time after index" for start window with null days and AFTER', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: null, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toBe('Any time after index')
    })

    it('should format "any time before index" for start window with null days and BEFORE', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: null, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toBe('Any time before index')
    })

    it('should format "any time after index" for end window with null days and AFTER', () => {
      const temporalWindow: TemporalWindow = {
        endWindow: { days: null, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toBe('Any time after index')
    })

    it('should format "any time before index" for end window with null days and BEFORE', () => {
      const temporalWindow: TemporalWindow = {
        endWindow: { days: null, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toBe('Any time before index')
    })

    it('should format "any time before index" for both windows with start null BEFORE', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: null, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' },
        endWindow: { days: 30, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toBe('Any time before index')
    })

    it('should format "any time after index" for both windows with end null AFTER', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        endWindow: { days: null, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toBe('Any time after index')
    })

    it('should format range with EVENT_START reference point', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'EVENT_START' },
        endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'EVENT_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('event start')
    })

    it('should format range with EVENT_END reference point', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'EVENT_END' },
        endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'EVENT_END' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('event end')
    })

    it('should format range with different reference points', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'INDEX_END' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('days after')
      expect(display).toContain('index')
    })

    it('should format range with BEFORE direction for both windows', () => {
      const temporalWindow: TemporalWindow = {
        startWindow: { days: 90, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' },
        endWindow: { days: 30, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' }
      }
      const display = formatTemporalWindowDisplay(temporalWindow)
      expect(display).toContain('90 to 30 days before')
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

    it('should allow customizing reference point', () => {
      const eventStart = defaultWindow('after', 0, 'EVENT_START')
      expect(eventStart.referencePoint).toBe('EVENT_START')

      const indexEnd = defaultWindow('before', 30, 'INDEX_END')
      expect(indexEnd.referencePoint).toBe('INDEX_END')
    })

    it('should support null days for all time windows', () => {
      const allTime = defaultWindow('before', null)
      expect(allTime.days).toBeNull()
      expect(allTime.beforeAfter).toBe('BEFORE')
    })
  })

  describe('getTemporalWindowPresets', () => {
    it('should return array of preset configurations', () => {
      const presets = getTemporalWindowPresets()
      expect(Array.isArray(presets)).toBe(true)
      expect(presets.length).toBeGreaterThan(0)
    })

    it('exposes the OHDSI short-term baseline preset (-30 to 0)', () => {
      const preset = getTemporalWindowPresets().find(p => p.label.startsWith('Short-term baseline'))
      expect(preset).toBeDefined()
      expect(preset?.value.startWindow?.days).toBe(30)
      expect(preset?.value.startWindow?.beforeAfter).toBe('BEFORE')
      expect(preset?.value.endWindow?.days).toBe(0)
      expect(preset?.value.endWindow?.beforeAfter).toBe('AFTER')
    })

    it('exposes the OHDSI medium-term baseline preset (-180 to 0)', () => {
      const preset = getTemporalWindowPresets().find(p => p.label.startsWith('Medium-term baseline'))
      expect(preset).toBeDefined()
      expect(preset?.value.startWindow?.days).toBe(180)
      expect(preset?.value.startWindow?.beforeAfter).toBe('BEFORE')
      expect(preset?.value.endWindow?.days).toBe(0)
    })

    it('exposes the OHDSI long-term baseline preset (-365 to 0)', () => {
      const preset = getTemporalWindowPresets().find(p => p.label.startsWith('Long-term baseline'))
      expect(preset).toBeDefined()
      expect(preset?.value.startWindow?.days).toBe(365)
      expect(preset?.value.startWindow?.beforeAfter).toBe('BEFORE')
      expect(preset?.value.endWindow?.days).toBe(0)
    })

    it('exposes "All time prior to index" with null start days', () => {
      const preset = getTemporalWindowPresets().find(p => p.label === 'All time prior to index')
      expect(preset).toBeDefined()
      expect(preset?.value.startWindow?.days).toBeNull()
      expect(preset?.value.startWindow?.beforeAfter).toBe('BEFORE')
    })

    it('exposes "On index date" preset (0 to 0)', () => {
      const preset = getTemporalWindowPresets().find(p => p.label === 'On index date')
      expect(preset).toBeDefined()
      expect(preset?.value.startWindow?.days).toBe(0)
      expect(preset?.value.endWindow?.days).toBe(0)
    })

    it('exposes acute / 90-day / 1-year follow-up presets', () => {
      const presets = getTemporalWindowPresets()
      const acute = presets.find(p => p.label.startsWith('Acute follow-up'))
      const ninety = presets.find(p => p.label.startsWith('90-day follow-up'))
      const oneYear = presets.find(p => p.label.startsWith('1-year follow-up'))
      expect(acute?.value.endWindow?.days).toBe(30)
      expect(ninety?.value.endWindow?.days).toBe(90)
      expect(oneYear?.value.endWindow?.days).toBe(365)
      for (const p of [acute, ninety, oneYear]) {
        expect(p?.value.startWindow?.days).toBe(0)
        expect(p?.value.startWindow?.beforeAfter).toBe('AFTER')
        expect(p?.value.endWindow?.beforeAfter).toBe('AFTER')
      }
    })

    it('exposes "All time after index" with null end days', () => {
      const preset = getTemporalWindowPresets().find(p => p.label === 'All time after index')
      expect(preset).toBeDefined()
      expect(preset?.value.startWindow?.days).toBe(0)
      expect(preset?.value.endWindow?.days).toBeNull()
    })

    it('should return valid temporal window structures', () => {
      const presets = getTemporalWindowPresets()
      presets.forEach(preset => {
        expect(preset).toHaveProperty('label')
        expect(preset).toHaveProperty('value')
        expect(typeof preset.label).toBe('string')

        if (preset.value.startWindow) {
          expect(preset.value.startWindow).toHaveProperty('days')
          expect(preset.value.startWindow).toHaveProperty('beforeAfter')
          expect(preset.value.startWindow).toHaveProperty('referencePoint')
        }

        if (preset.value.endWindow) {
          expect(preset.value.endWindow).toHaveProperty('days')
          expect(preset.value.endWindow).toHaveProperty('beforeAfter')
          expect(preset.value.endWindow).toHaveProperty('referencePoint')
        }
      })
    })
  })
})
