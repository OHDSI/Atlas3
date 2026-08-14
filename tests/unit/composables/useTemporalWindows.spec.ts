import { describe, it, expect } from 'vitest'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import type { Window } from '@/models/cohort.types'

const { formatTemporalWindowDisplay } = useTemporalWindows()

function win(overrides: Partial<Window> = {}): Window {
  return {
    days: 0,
    beforeAfter: 'BEFORE',
    useIndexEnd: false,
    useEventEnd: false,
    ...overrides,
  } as Window
}

describe('formatTemporalWindowDisplay', () => {
  it('describes a fully bounded range in one direction', () => {
    expect(
      formatTemporalWindowDisplay({
        startWindow: win({ days: 0, beforeAfter: 'AFTER' }),
        endWindow: win({ days: 160, beforeAfter: 'AFTER' }),
      })
    ).toBe('0 to 160 days after index start')
  })

  it('describes a fully bounded range across the index', () => {
    expect(
      formatTemporalWindowDisplay({
        startWindow: win({ days: 30, beforeAfter: 'BEFORE' }),
        endWindow: win({ days: 0, beforeAfter: 'AFTER' }),
      })
    ).toBe('30 days before to 0 days after index start')
  })

  // The reported case: set the end to 160 days, then switch the start to
  // "all time". The window saves correctly but the summary used to collapse to
  // "Any time before index", dropping the 160-day bound entirely (#218).
  it('keeps the bounded end when the start is all time', () => {
    expect(
      formatTemporalWindowDisplay({
        startWindow: win({ days: null, beforeAfter: 'BEFORE' }),
        endWindow: win({ days: 160, beforeAfter: 'AFTER' }),
      })
    ).toBe('any time before to 160 days after index start')
  })

  it('keeps the bounded start when the end is all time', () => {
    expect(
      formatTemporalWindowDisplay({
        startWindow: win({ days: 30, beforeAfter: 'BEFORE' }),
        endWindow: win({ days: null, beforeAfter: 'AFTER' }),
      })
    ).toBe('30 days before to any time after index start')
  })

  it('singularises a one-day bound alongside an all-time bound', () => {
    expect(
      formatTemporalWindowDisplay({
        startWindow: win({ days: 1, beforeAfter: 'BEFORE' }),
        endWindow: win({ days: null, beforeAfter: 'AFTER' }),
      })
    ).toBe('1 day before to any time after index start')
  })

  it('carries the shared anchor through an unbounded range', () => {
    expect(
      formatTemporalWindowDisplay({
        startWindow: win({ days: null, beforeAfter: 'BEFORE', useIndexEnd: true }),
        endWindow: win({ days: 7, beforeAfter: 'AFTER', useIndexEnd: true }),
      })
    ).toBe('any time before to 7 days after index end')
  })

  it('falls back to "index" when the two ends use different anchors', () => {
    expect(
      formatTemporalWindowDisplay({
        startWindow: win({ days: null, beforeAfter: 'BEFORE', useIndexEnd: true }),
        endWindow: win({ days: 7, beforeAfter: 'AFTER', useIndexEnd: false }),
      })
    ).toBe('any time before to 7 days after index')
  })

  it('collapses to a single phrase only when neither end is bounded', () => {
    expect(
      formatTemporalWindowDisplay({
        startWindow: win({ days: null, beforeAfter: 'BEFORE' }),
        endWindow: win({ days: null, beforeAfter: 'AFTER' }),
      })
    ).toBe('Any time')
  })

  it('still describes a lone window', () => {
    expect(
      formatTemporalWindowDisplay({ startWindow: win({ days: 30, beforeAfter: 'BEFORE' }) })
    ).toBe('From 30 days before index start')
    expect(
      formatTemporalWindowDisplay({ endWindow: win({ days: null, beforeAfter: 'AFTER' }) })
    ).toBe('Any time after index')
  })

  it('reports no constraints when neither window is set', () => {
    expect(formatTemporalWindowDisplay({})).toBe('No temporal constraints')
  })
})

// The composable had no tests before this branch, so its other exports went
// unexercised alongside the summary text.
describe('validateTemporalWindows', () => {
  const { validateTemporalWindows } = useTemporalWindows()

  it('accepts an empty window', () => {
    expect(validateTemporalWindows({})).toEqual({ isValid: true, errors: [] })
  })

  it('accepts non-negative day counts and "all time" on either end', () => {
    expect(
      validateTemporalWindows({
        startWindow: win({ days: null, beforeAfter: 'BEFORE' }),
        endWindow: win({ days: 30, beforeAfter: 'AFTER' }),
      }).isValid
    ).toBe(true)
  })

  it('rejects a negative start and names the offending end', () => {
    const result = validateTemporalWindows({ startWindow: win({ days: -1, beforeAfter: 'BEFORE' }) })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual(['Start window: Days must be >= 0 or null for "all time"'])
  })

  it('rejects a negative end and names the offending end', () => {
    const result = validateTemporalWindows({ endWindow: win({ days: -5, beforeAfter: 'AFTER' }) })

    expect(result.errors).toEqual(['End window: Days must be >= 0 or null for "all time"'])
  })

  it('rejects a range whose start falls after its end', () => {
    // 10 days after index to 5 days after index.
    const result = validateTemporalWindows({
      startWindow: win({ days: 10, beforeAfter: 'AFTER' }),
      endWindow: win({ days: 5, beforeAfter: 'AFTER' }),
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Start window must come before end window')
  })

  it('allows a range that crosses the index', () => {
    expect(
      validateTemporalWindows({
        startWindow: win({ days: 30, beforeAfter: 'BEFORE' }),
        endWindow: win({ days: 30, beforeAfter: 'AFTER' }),
      }).isValid
    ).toBe(true)
  })

  it('does not compare order when either end is unbounded', () => {
    expect(
      validateTemporalWindows({
        startWindow: win({ days: 10, beforeAfter: 'AFTER' }),
        endWindow: win({ days: null, beforeAfter: 'AFTER' }),
      }).isValid
    ).toBe(true)
  })

  it('collects errors from both ends at once', () => {
    const result = validateTemporalWindows({
      startWindow: win({ days: -1, beforeAfter: 'BEFORE' }),
      endWindow: win({ days: -2, beforeAfter: 'AFTER' }),
    })

    expect(result.errors).toContain('Start window: Days must be >= 0 or null for "all time"')
    expect(result.errors).toContain('End window: Days must be >= 0 or null for "all time"')
    // These offsets also put the start after the end, which is reported too.
    expect(result.errors).toContain('Start window must come before end window')
  })
})

describe('defaultWindow', () => {
  const { defaultWindow } = useTemporalWindows()

  it('defaults to zero days after the index start', () => {
    expect(defaultWindow()).toEqual({
      days: 0,
      beforeAfter: 'AFTER',
      useIndexEnd: false,
      useEventEnd: false,
    })
  })

  it('maps the direction onto the stored enum', () => {
    expect(defaultWindow('before').beforeAfter).toBe('BEFORE')
    expect(defaultWindow('after').beforeAfter).toBe('AFTER')
  })

  it('carries the day count and anchor flags through', () => {
    expect(defaultWindow('before', null, true, true)).toEqual({
      days: null,
      beforeAfter: 'BEFORE',
      useIndexEnd: true,
      useEventEnd: true,
    })
  })
})

describe('getTemporalWindowPresets', () => {
  const { getTemporalWindowPresets, validateTemporalWindows } = useTemporalWindows()

  it('offers presets that all pass validation', () => {
    const presets = getTemporalWindowPresets()

    expect(presets.length).toBeGreaterThan(0)
    for (const preset of presets) {
      expect(preset.label).toBeTruthy()
      expect(validateTemporalWindows(preset.value).isValid).toBe(true)
    }
  })

  it('includes the FeatureExtraction baseline lookbacks', () => {
    const labels = getTemporalWindowPresets().map(p => p.label)

    expect(labels.some(l => l.includes('30'))).toBe(true)
    expect(labels.some(l => l.includes('180'))).toBe(true)
    expect(labels.some(l => l.includes('365'))).toBe(true)
  })
})
