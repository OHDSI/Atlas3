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
})
