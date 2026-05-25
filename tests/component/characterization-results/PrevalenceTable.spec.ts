/**
 * PrevalenceTable component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'

import PrevalenceTable from '@/components/characterization-results/PrevalenceTable.vue'
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

function makeRow(overrides: Partial<PrevalenceStat> = {}): PrevalenceStat {
  return {
    analysisId: 100,
    analysisName: 'Race',
    covariateId: 8527,
    covariateName: 'race = White',
    conceptId: 8527,
    cohorts: [{ id: 1, name: 'Cohort A' }],
    count: { [DEFAULT_STRATA_KEY]: { '1': 42 } },
    pct: { [DEFAULT_STRATA_KEY]: { '1': 7.5 } },
    ...overrides,
  }
}

describe('PrevalenceTable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setActivePinia(createPinia())
  })

  it('renders without a Std Diff column for a single cohort', () => {
    const row = makeRow()
    const wrapper = mount(PrevalenceTable, {
      props: {
        analysisId: 100,
        analysisName: 'Race',
        rows: [row],
        cohorts: row.cohorts,
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    const headers = wrapper.findAll('th').map((h) => h.text())
    expect(headers.some((h) => /Std Diff/i.test(h))).toBe(false)
    wrapper.unmount()
  })

  it('renders a Std Diff column when there are exactly two cohorts', () => {
    const row = makeRow({
      cohorts: [
        { id: 1, name: 'Target' },
        { id: 2, name: 'Comparator' },
      ],
      count: { [DEFAULT_STRATA_KEY]: { '1': 100, '2': 50 } },
      pct: { [DEFAULT_STRATA_KEY]: { '1': 50, '2': 30 } },
      stdDiff: 0.418,
    })
    const wrapper = mount(PrevalenceTable, {
      props: {
        analysisId: 100,
        analysisName: 'Race',
        rows: [row],
        cohorts: row.cohorts,
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    const headers = wrapper.findAll('th').map((h) => h.text())
    expect(headers.some((h) => /Std Diff/i.test(h))).toBe(true)
    wrapper.unmount()
  })

  it('emits explore on the explore button click', async () => {
    const row = makeRow()
    const wrapper = mount(PrevalenceTable, {
      props: {
        analysisId: 100,
        analysisName: 'Race',
        rows: [row],
        cohorts: row.cohorts,
      },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    const btn = wrapper.find(`[data-testid="char-results-explore-${row.covariateId}"]`)
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(wrapper.emitted('explore')).toBeTruthy()
    expect(wrapper.emitted('explore')?.[0]).toEqual([row])
    wrapper.unmount()
  })
})
