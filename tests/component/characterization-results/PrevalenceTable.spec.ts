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

  it('flags annual data on the analysis heading, not on covariate rows', () => {
    const annual = makeRow({
      temporalByCohort: { '1': { temporal: [], temporalAnnual: [{ year: 2020, count: 1, avg: 0.1 }] } },
    })
    const otherCohortOnly = makeRow({
      covariateId: 9000,
      covariateName: 'other',
      temporalByCohort: { '99': { temporal: [{ startDay: 0, endDay: 0, count: 1, avg: 0.1 }], temporalAnnual: [] } },
    })
    const plain = makeRow({ covariateId: 9001, covariateName: 'plain' })
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows: [annual, otherCohortOnly, plain], cohorts: annual.cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    const toggle = wrapper.find('[data-testid="char-results-prevalence-toggle-100"]')
    const annualIcon = toggle.find('[data-testid="char-results-annual-available-100"]')
    expect(annualIcon.exists()).toBe(true)
    expect(annualIcon.attributes('aria-label')).toBe('Annual distribution available in Explore')
    // Temporal data exists only for a cohort that is not displayed.
    expect(wrapper.find('[data-testid="char-results-temporal-available-100"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid^="char-results-temporal-8527"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('flags temporal data on the analysis heading', () => {
    const row = makeRow({
      temporalByCohort: { '1': { temporal: [{ startDay: 0, endDay: 0, count: 1, avg: 0.1 }], temporalAnnual: [] } },
    })
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows: [row], cohorts: row.cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    expect(wrapper.find('[data-testid="char-results-temporal-available-100"]').attributes('aria-label'))
      .toBe('Temporal distribution available in Explore')
    expect(wrapper.find('[data-testid="char-results-annual-available-100"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows no time-series indicator without annual or temporal data', () => {
    const row = makeRow()
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows: [row], cohorts: row.cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    expect(wrapper.find('.prevalence-table__time-series').exists()).toBe(false)
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
    expect(wrapper.findAll('.prevalence-table__concept')).toHaveLength(2)
    expect(wrapper.findAll('.prevalence-table__metric')).toHaveLength(4)
    expect(wrapper.findAll('.prevalence-table__action')).toHaveLength(2)
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
    expect(wrapper.findAll('th.prevalence-table__metric')).toHaveLength(4)
    expect(headers).toEqual(expect.arrayContaining(['Target', 'Comparator']))
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
    expect(btn.classes()).toContain('prevalence-table__explore-button')
    await btn.trigger('click')
    expect(wrapper.emitted('explore')).toBeTruthy()
    expect(wrapper.emitted('explore')?.[0]).toEqual([row])
    wrapper.unmount()
  })

  it('renders 15 rows by default and updates the visible slice when the page size changes', async () => {
    const rows = Array.from({ length: 16 }, (_, index) => makeRow({
      covariateId: index + 1,
      covariateName: `Covariate ${index + 1}`,
    }))
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows, cohorts: rows[0]!.cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    expect(wrapper.findAll('tbody tr')).toHaveLength(15)
    expect(wrapper.findAll('[data-testid="char-results-pagination"]')).toHaveLength(1)
    const pager = wrapper.findComponent({ name: 'ResultsTablePagination' })
    await pager.vm.$emit('update:page-size', 50)
    expect(wrapper.findAll('tbody tr')).toHaveLength(16)
    wrapper.unmount()
  })

  it('synchronizes the pagers beneath each cohort table', async () => {
    const cohorts = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' },
    ]
    const rows = Array.from({ length: 26 }, (_, index) => makeRow({
      covariateId: index + 1,
      cohorts,
      count: { [DEFAULT_STRATA_KEY]: { '1': 1, '2': 1, '3': 1 } },
      pct: { [DEFAULT_STRATA_KEY]: { '1': 1, '2': 1, '3': 1 } },
    }))
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows, cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    const pagers = wrapper.findAllComponents({ name: 'ResultsTablePagination' })
    expect(pagers).toHaveLength(3)
    await pagers[0]!.vm.$emit('update:page', 2)
    expect(pagers.map(pager => pager.props('page'))).toEqual([2, 2, 2])
    wrapper.unmount()
  })

  it('sorts every cohort table together and toggles only ascending and descending', async () => {
    const cohorts = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' },
    ]
    const rows = [
      makeRow({
        covariateId: 1, covariateName: 'Higher', cohorts,
        count: { [DEFAULT_STRATA_KEY]: { '1': 20, '2': 3, '3': 8 } },
        pct: { [DEFAULT_STRATA_KEY]: { '1': 20, '2': 3, '3': 8 } },
      }),
      makeRow({
        covariateId: 2, covariateName: 'Lower', cohorts,
        count: { [DEFAULT_STRATA_KEY]: { '1': 10, '2': 30, '3': 18 } },
        pct: { [DEFAULT_STRATA_KEY]: { '1': 10, '2': 30, '3': 18 } },
      }),
    ]
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows, cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    const countHeader = () => wrapper.get('[data-testid="char-results-sort-count-100-overall-1"]')
    await countHeader().trigger('click')
    const tables = wrapper.findAll('[data-testid^="char-results-prevalence-table-100-"]')
    expect(tables.map(table => table.find('tbody tr td').text())).toEqual(['Higher', 'Higher', 'Higher'])
    expect(countHeader().attributes('aria-sort')).toBe('descending')

    await countHeader().trigger('click')
    expect(tables.map(table => table.find('tbody tr td').text())).toEqual(['Lower', 'Lower', 'Lower'])
    expect(countHeader().attributes('aria-sort')).toBe('ascending')

    const pctHeader = () => wrapper.get('[data-testid="char-results-sort-pct-100-overall-1"]')
    await pctHeader().trigger('click')
    expect(tables.map(table => table.find('tbody tr td').text())).toEqual(['Higher', 'Higher', 'Higher'])
    expect(pctHeader().attributes('aria-sort')).toBe('descending')
    expect(countHeader().attributes('aria-sort')).toBeUndefined()
    wrapper.unmount()
  })

  it('hides the prevalence content while retaining its analysis header when collapsed', () => {
    const row = makeRow()
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows: [row], cohorts: row.cohorts, expanded: false },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })

    const toggle = wrapper.get('[data-testid="char-results-prevalence-toggle-100"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).toContain('Race')
    expect(wrapper.text()).not.toContain('Prevalence')
    expect(wrapper.find('table').exists()).toBe(false)
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

  it('shows 15 rows per page with a pager while the title keeps the full count', () => {
    const wrapper = mountMany(60)
    expect(wrapper.findAll('tbody tr')).toHaveLength(15)
    expect(wrapper.find('.prevalence-table__count').text()).toBe('(60)')
    expect(wrapper.find('[data-testid="char-results-pagination"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('hides the pager for short tables', () => {
    const wrapper = mountMany(5)
    expect(wrapper.findAll('tbody tr')).toHaveLength(5)
    expect(wrapper.find('[data-testid="char-results-pagination"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('sorts by Pct, most prevalent first, then flips on a second click', async () => {
    const wrapper = mountMany(30)
    const pctHeader = () => wrapper.findAll('th.prevalence-table__numeric')[1]!
    const pcts = () => wrapper.findAll('tbody tr').map(tr => parseFloat(tr.findAll('td')[3]!.text()))

    await pctHeader().trigger('click')
    expect(pctHeader().attributes('aria-sort')).toBe('descending')
    expect(pcts()[0]).toBe(29)
    expect(pcts()).toEqual([...pcts()].sort((a, b) => b - a))

    await pctHeader().trigger('click')
    expect(pctHeader().attributes('aria-sort')).toBe('ascending')
    expect(pcts()[0]).toBe(0)
    wrapper.unmount()
  })

  it('sorts by Count across all pages, not just the visible one', async () => {
    const wrapper = mountMany(60)
    const countHeader = wrapper.findAll('th.prevalence-table__numeric')[0]!
    await countHeader.trigger('click')
    expect(wrapper.find('tbody .prevalence-table__covariate').text()).toBe('covariate 60')
    wrapper.unmount()
  })

  it('sorts Std Diff by magnitude, ignoring sign, in cohort compare mode', async () => {
    const cohorts = [{ id: 1, name: 'Target' }, { id: 2, name: 'Comparator' }]
    const rows = [0.05, -0.9, 0.3, -0.2, 0.6].map((stdDiff, i) => makeRow({
      covariateId: i + 1,
      covariateName: `covariate ${i + 1}`,
      cohorts,
      count: { [DEFAULT_STRATA_KEY]: { '1': 10, '2': 10 } },
      pct: { [DEFAULT_STRATA_KEY]: { '1': 10, '2': 10 } },
      stdDiff,
    }))
    const wrapper = mount(PrevalenceTable, {
      props: { analysisId: 100, analysisName: 'Race', rows, cohorts },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    const header = () => wrapper.get(`[data-testid="char-results-sort-stddiff-100-${DEFAULT_STRATA_KEY}"]`)
    const diffs = () => wrapper
      .findAll(`[data-testid^="char-results-stddiff-"]`)
      .map(cell => Number(cell.text()))

    await header().trigger('click')
    expect(header().attributes('aria-sort')).toBe('descending')
    expect(diffs()).toEqual([-0.9, 0.6, 0.3, -0.2, 0.05])

    await header().trigger('click')
    expect(header().attributes('aria-sort')).toBe('ascending')
    expect(diffs()).toEqual([0.05, -0.2, 0.3, 0.6, -0.9])

    await wrapper.get('[data-testid="char-results-explore-2"]').trigger('click')
    expect(wrapper.emitted('explore')?.[0]).toEqual([rows[1]])
    wrapper.unmount()
  })
})
