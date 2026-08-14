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
