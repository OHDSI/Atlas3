/**
 * PrevalenceTable value formatting and stratum selection tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'

import PrevalenceTable from '@/components/characterization-results/PrevalenceTable.vue'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { LinkedCohort, PrevalenceStat } from '@/models/characterization.types'

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

function mountTable(
  rows: PrevalenceStat[],
  cohorts: LinkedCohort[] = rows[0].cohorts
): VueWrapper {
  return mount(PrevalenceTable, {
    props: {
      analysisId: 100,
      analysisName: 'Race',
      rows,
      cohorts,
    },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('PrevalenceTable value formatting', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setActivePinia(createPinia())
  })

  it('renders a percentage with two decimal places and a percent sign', () => {
    const row = makeRow({ pct: { [DEFAULT_STRATA_KEY]: { '1': 7.5 } } })
    const wrapper = mountTable([row])
    expect(wrapper.text()).toContain('7.50%')
  })

  it('renders a thousands-separated count', () => {
    const row = makeRow({ count: { [DEFAULT_STRATA_KEY]: { '1': 1234567 } } })
    const wrapper = mountTable([row])
    expect(wrapper.text()).toContain((1234567).toLocaleString())
  })

  it('renders an em-rule placeholder for a missing percentage', () => {
    const row = makeRow({ pct: { [DEFAULT_STRATA_KEY]: {} } })
    const wrapper = mountTable([row])
    const cells = wrapper.findAll('td').map((c) => c.text())
    expect(cells).toContain('—')
  })

  it('renders an em-rule placeholder for NaN rather than "NaN%"', () => {
    const row = makeRow({ pct: { [DEFAULT_STRATA_KEY]: { '1': Number.NaN } } })
    const wrapper = mountTable([row])
    expect(wrapper.text()).not.toContain('NaN')
    expect(wrapper.findAll('td').map((c) => c.text())).toContain('—')
  })

  it('renders an em-rule placeholder for a non-numeric value', () => {
    const row = makeRow({ pct: { [DEFAULT_STRATA_KEY]: { '1': 'oops' as unknown as number } } })
    const wrapper = mountTable([row])
    expect(wrapper.text()).not.toContain('oops')
    expect(wrapper.findAll('td').map((c) => c.text())).toContain('—')
  })

  it('renders std diff with four decimal places for two cohorts', () => {
    const row = makeRow({
      cohorts: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
      pct: { [DEFAULT_STRATA_KEY]: { '1': 10, '2': 20 } },
      stdDiff: 0.12345,
    })
    const wrapper = mountTable([row], row.cohorts)
    expect(wrapper.text()).toContain('0.1235')
  })

  it('renders an em-rule placeholder for a non-numeric count', () => {
    const row = makeRow({ count: { [DEFAULT_STRATA_KEY]: { '1': 'oops' as unknown as number } } })
    const wrapper = mountTable([row])
    expect(wrapper.findAll('td').map((c) => c.text())).toContain('—')
  })

  it('renders an em-rule placeholder for a NaN count', () => {
    const row = makeRow({ count: { [DEFAULT_STRATA_KEY]: { '1': Number.NaN } } })
    const wrapper = mountTable([row])
    expect(wrapper.text()).not.toContain('NaN')
    expect(wrapper.findAll('td').map((c) => c.text())).toContain('—')
  })

  it('renders an em-rule placeholder for a missing std diff', () => {
    const row = makeRow({
      cohorts: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
      pct: { [DEFAULT_STRATA_KEY]: { '1': 10, '2': 20 } },
      stdDiff: undefined,
    })
    const wrapper = mountTable([row], row.cohorts)
    expect(wrapper.findAll('td').map((c) => c.text())).toContain('—')
  })

  it('renders an em-rule placeholder for a NaN std diff', () => {
    const row = makeRow({
      cohorts: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
      pct: { [DEFAULT_STRATA_KEY]: { '1': 10, '2': 20 } },
      stdDiff: Number.NaN,
    })
    const wrapper = mountTable([row], row.cohorts)
    expect(wrapper.text()).not.toContain('NaN')
    expect(wrapper.findAll('td').map((c) => c.text())).toContain('—')
  })
})

describe('PrevalenceTable stratum selection', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setActivePinia(createPinia())
  })

  it('prefers the default stratum key when present', () => {
    const row = makeRow({
      pct: { zzz: { '1': 99 }, [DEFAULT_STRATA_KEY]: { '1': 7.5 } },
    })
    const wrapper = mountTable([row])
    expect(wrapper.text()).toContain('7.50%')
    expect(wrapper.text()).not.toContain('99.00%')
  })

  it('falls back to the first stratum key when the default is absent', () => {
    const row = makeRow({ pct: { onlyKey: { '1': 33.25 } } })
    const wrapper = mountTable([row])
    expect(wrapper.text()).toContain('33.25%')
  })

  it('renders a placeholder when there are no strata at all', () => {
    const row = makeRow({ pct: {} })
    const wrapper = mountTable([row])
    expect(wrapper.findAll('td').map((c) => c.text())).toContain('—')
  })
})
