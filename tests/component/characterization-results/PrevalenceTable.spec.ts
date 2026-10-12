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
    expect(wrapper.findAll('col.prevalence-table__metric-col')).toHaveLength(2)
    expect(wrapper.find('table').classes()).toContain('prevalence-table__table--fixed')
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

    const sortButton = wrapper.get('[data-testid="char-results-sort-count-100-overall-1"]')
    await sortButton.trigger('click')
    const tables = wrapper.findAll('[data-testid^="char-results-prevalence-table-100-"]')
    expect(tables.map(table => table.find('tbody tr td').text())).toEqual(['Lower', 'Lower', 'Lower'])
    expect(sortButton.attributes('aria-sort')).toBeUndefined()
    expect(sortButton.element.parentElement?.getAttribute('aria-sort')).toBe('ascending')

    await sortButton.trigger('click')
    expect(tables.map(table => table.find('tbody tr td').text())).toEqual(['Higher', 'Higher', 'Higher'])
    expect(sortButton.element.parentElement?.getAttribute('aria-sort')).toBe('descending')

    const pctSortButton = wrapper.get('[data-testid="char-results-sort-pct-100-overall-1"]')
    await pctSortButton.trigger('click')
    expect(tables.map(table => table.find('tbody tr td').text())).toEqual(['Lower', 'Lower', 'Lower'])
    expect(pctSortButton.element.parentElement?.getAttribute('aria-sort')).toBe('ascending')
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
