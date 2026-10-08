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

  it('labels the default strata column Overall when WebAPI supplies All strata', () => {
    const row = makeRow({ strataNames: { [DEFAULT_STRATA_KEY]: 'All strata' } })
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

    expect(wrapper.text()).toContain('Overall')
    expect(wrapper.text()).not.toContain('All strata')
    wrapper.unmount()
  })

  it('truncates covariate labels with the full name available as a tooltip', () => {
    const row = makeRow({ covariateName: 'A covariate label that is intentionally long' })
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows: [row], cohorts: row.cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    const covariate = wrapper.find('.prevalence-table__covariate')
    expect(covariate.text()).toBe(row.covariateName)
    expect(covariate.attributes('title')).toBe(row.covariateName)
    wrapper.unmount()
  })

  it('marks Count and Pct headers as right-aligned numeric columns', () => {
    const row = makeRow()
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows: [row], cohorts: row.cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    expect(wrapper.findAll('th.prevalence-table__numeric')).toHaveLength(2)
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
    expect(wrapper.find('table').classes()).toContain('prevalence-table__table--comparison')
    expect(wrapper.findAll('col.prevalence-table__metric-col')).toHaveLength(4)
    expect(wrapper.findAll('th.prevalence-table__cohort-header')).toHaveLength(2)
    expect(wrapper.find('col.prevalence-table__concept-col').exists()).toBe(true)
    expect(wrapper.find('col.prevalence-table__std-diff-col').exists()).toBe(true)
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

describe('PrevalenceTable sorting and paging', () => {
  function manyRows(n: number): PrevalenceStat[] {
    return Array.from({ length: n }, (_, i) => makeRow({
      covariateId: i + 1,
      covariateName: `covariate ${i + 1}`,
      count: { [DEFAULT_STRATA_KEY]: { '1': i + 1 } },
      // Spread the percentages so the most prevalent row is in the middle.
      pct: { [DEFAULT_STRATA_KEY]: { '1': (i * 7) % n } },
    }))
  }

  function mountMany(n: number) {
    const rows = manyRows(n)
    return mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Drug exposure', rows, cohorts: rows[0]!.cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    setActivePinia(createPinia())
  })

  it('shows 25 rows per page with a pager while the title keeps the full count', () => {
    const wrapper = mountMany(60)
    expect(wrapper.findAll('tbody tr')).toHaveLength(25)
    expect(wrapper.find('.prevalence-table__count').text()).toBe('(60)')
    expect(wrapper.find('[data-testid="char-results-prevalence-pager-100"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('hides the pager for short tables', () => {
    const wrapper = mountMany(5)
    expect(wrapper.findAll('tbody tr')).toHaveLength(5)
    expect(wrapper.find('[data-testid="char-results-prevalence-pager-100"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('sorts by Pct, most prevalent first, then flips on a second click', async () => {
    const wrapper = mountMany(30)
    const pctHeader = wrapper.findAll('th.prevalence-table__numeric')[1]!
    const pcts = () => wrapper.findAll('tbody tr').map(tr => parseFloat(tr.findAll('td')[3]!.text()))

    await pctHeader.find('button').trigger('click')
    expect(pctHeader.attributes('aria-sort')).toBe('descending')
    expect(pcts()[0]).toBe(29)
    expect(pcts()).toEqual([...pcts()].sort((a, b) => b - a))

    await pctHeader.find('button').trigger('click')
    expect(pctHeader.attributes('aria-sort')).toBe('ascending')
    expect(pcts()[0]).toBe(0)
    wrapper.unmount()
  })

  it('sorts by Count across all pages, not just the visible one', async () => {
    const wrapper = mountMany(60)
    const countHeader = wrapper.findAll('th.prevalence-table__numeric')[0]!
    await countHeader.find('button').trigger('click')
    expect(wrapper.find('tbody .prevalence-table__covariate').text()).toBe('covariate 60')
    wrapper.unmount()
  })
})
