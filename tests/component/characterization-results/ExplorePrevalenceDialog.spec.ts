/**
 * ExplorePrevalenceDialog component tests
 *
 * Covers the covariate detail panel that only renders when the dialog is open
 * and a covariate (`stat`) is selected, plus the empty state when it is not.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'

import ExplorePrevalenceDialog from '@/components/characterization-results/ExplorePrevalenceDialog.vue'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { PrevalenceStat } from '@/models/characterization.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function makeStat(overrides: Partial<PrevalenceStat> = {}): PrevalenceStat {
  return {
    analysisId: 100,
    analysisName: 'Demographics Race',
    covariateId: 8527,
    covariateName: 'race = White',
    conceptId: 8527,
    conceptName: 'White',
    domainId: 'Race',
    cohorts: [
      { id: 1, name: 'Target Cohort' },
      { id: 2, name: 'Comparator Cohort' },
    ],
    count: { [DEFAULT_STRATA_KEY]: { '1': 4200, '2': 1500 } },
    pct: { [DEFAULT_STRATA_KEY]: { '1': 42.5, '2': 30.25 } },
    stdDiff: 0.4187,
    ...overrides,
  }
}

function mountDialog(props: Partial<{ modelValue: boolean; stat: PrevalenceStat | null }> = {}) {
  setActivePinia(createPinia())
  return mount(ExplorePrevalenceDialog, {
    attachTo: document.body,
    global: { plugins: [vuetify, createPinia()] },
    props: {
      modelValue: true,
      stat: null,
      ...props,
    },
  })
}

describe('ExplorePrevalenceDialog', () => {
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the covariate detail panel when open with a selected stat', () => {
    const stat = makeStat()
    mountDialog({ modelValue: true, stat })

    const text = document.body.textContent ?? ''

    // dt labels (lines 21, 25, 29, 41) — resolved via the i18n mock / en.json
    expect(text).toContain('Analysis')
    expect(text).toContain('Domain')
    expect(text).toContain('Concept Id')
    expect(text).toContain('Concept')

    // dd values driven by the stat
    expect(text).toContain('Demographics Race')
    expect(text).toContain('Race')
    expect(text).toContain('8527')
    expect(text).toContain('White')

    // per-cohort comparison table headers (lines 51, 54, 57)
    expect(text).toContain('Cohort')
    expect(text).toContain('Count')
    expect(text).toContain('Pct')

    // per-cohort rows render with formatted count/pct
    expect(text).toContain('Target Cohort')
    expect(text).toContain('Comparator Cohort')
    expect(text).toContain('4,200')
    expect(text).toContain('42.50%')

    // standardised mean difference label + value (line 90)
    expect(text).toContain('0.4187')
  })

  it('renders the empty state when open with no selected stat', () => {
    mountDialog({ modelValue: true, stat: null })

    const empty = document.body.querySelector('.explore__empty')
    expect(empty).toBeTruthy()
    expect((empty?.textContent ?? '').trim().length).toBeGreaterThan(0)

    // detail table absent when nothing is selected
    expect(document.body.querySelector('.explore__table')).toBeFalsy()
  })

  describe('temporal distribution', () => {
    const q = (id: string) => document.body.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
    const temporalByCohort = {
      '1': {
        temporal: [{ startDay: -30, endDay: -1, count: 12, avg: 0.125 }],
        temporalAnnual: [
          { year: 2019, count: 40, avg: 0.4 },
          { year: 2020, count: 20, avg: 0.2 },
        ],
      },
      '2': {
        temporal: [{ startDay: 0, endDay: 0, count: 3, avg: 0.03 }],
        temporalAnnual: [],
      },
    }

    it('is hidden when the covariate has no temporal data', () => {
      mountDialog({ stat: makeStat() })
      expect(q('char-results-explore-temporal')).toBeNull()
    })

    it('shows the annual series for the first cohort with avg as a percentage', () => {
      mountDialog({ stat: makeStat({ temporalByCohort }) })

      expect(q('char-results-explore-temporal')).not.toBeNull()
      expect(q('char-results-explore-temporal-cohort-1')).not.toBeNull()
      expect(q('char-results-explore-temporal-cohort-2')).not.toBeNull()
      const table = q('char-results-explore-temporal-annual-table')
      const text = table?.textContent ?? ''
      expect(text).toContain('2019')
      expect(text).toContain('40.00%')
      expect(text).toContain('2020')
      expect(text).toContain('20.00%')
    })

    it('switches to the daily series', async () => {
      mountDialog({ stat: makeStat({ temporalByCohort }) })

      q('char-results-explore-temporal-view-daily')?.click()
      await new Promise(resolve => setTimeout(resolve, 0))

      const text = q('char-results-explore-temporal-daily-table')?.textContent ?? ''
      expect(text).toContain('-30')
      expect(text).toContain('-1')
      expect(text).toContain('12')
      expect(text).toContain('12.50%')
    })

    it('offers only the views a cohort has and hides the cohort tabs for a single cohort', () => {
      mountDialog({
        stat: makeStat({ temporalByCohort: { '2': temporalByCohort['2'] } }),
      })

      expect(q('char-results-explore-temporal-cohorts')).toBeNull()
      expect(q('char-results-explore-temporal-view-annual')).toBeNull()
      const text = q('char-results-explore-temporal-daily-table')?.textContent ?? ''
      expect(text).toContain('3.00%')
    })
  })
})
