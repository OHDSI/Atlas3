import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationPerAnalysisView from '@/components/characterization/CharacterizationPerAnalysisView.vue'
import type { LinkedCohort } from '@/models/characterization.types'

const vuetify = createVuetify({ components, directives })
const COHORTS: LinkedCohort[] = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]

describe('CharacterizationPerAnalysisView', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders a PrevalenceTable per analysis group', () => {
    const w = mount(CharacterizationPerAnalysisView, {
      global: { plugins: [vuetify], stubs: ['PrevalenceTable', 'DistributionTable'] },
      props: {
        prevalence: [
          { analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X',
            conceptId: 0, cohorts: COHORTS,
            count: { overall: { '1': 1, '2': 1 } },
            pct: { overall: { '1': 50, '2': 50 } } },
          { analysisId: 2, analysisName: 'B', covariateId: 21, covariateName: 'Y',
            conceptId: 0, cohorts: COHORTS,
            count: { overall: { '1': 1, '2': 1 } },
            pct: { overall: { '1': 30, '2': 30 } } },
        ],
        distribution: [],
        cohorts: COHORTS,
        threshold: 0,
        selectedAnalysisIds: [],
        selectedDomains: [],
        selectedCohortId: null,
      },
    })
    const tables = w.findAllComponents({ name: 'PrevalenceTable' })
    expect(tables).toHaveLength(2)
  })

  function mountWithUnmapped(
    unmapped: Record<string, unknown>[],
    overrides: Record<string, unknown> = {}
  ) {
    return mount(CharacterizationPerAnalysisView, {
      global: {
        plugins: [vuetify],
        stubs: ['PrevalenceTable', 'DistributionTable', 'RawResultTable'],
      },
      props: {
        prevalence: [],
        distribution: [],
        unmapped,
        cohorts: COHORTS,
        threshold: 0,
        selectedAnalysisIds: [],
        selectedDomains: [],
        selectedCohortId: null,
        ...overrides,
      },
    })
  }

  it('renders a RawResultTable per unmapped analysis group', () => {
    const w = mountWithUnmapped([
      { analysisId: 10, analysisName: 'Death place', covariateId: 1, deaths: 5 },
      { analysisId: 10, analysisName: 'Death place', covariateId: 2, deaths: 7 },
      { analysisId: 20, analysisName: 'Weekday', covariateId: 3, admits: 9 },
    ])
    const tables = w.findAllComponents({ name: 'RawResultTable' })
    expect(tables).toHaveLength(2)
    // Rows collapse into their analysisId group.
    const first = tables.find((t) => t.props('analysisId') === 10)
    expect(first?.props('rows')).toHaveLength(2)
  })

  it('falls back to a synthetic analysis name/id for rows without analysisId', () => {
    const w = mountWithUnmapped([{ covariateId: 1, value: 3 }])
    const table = w.findComponent({ name: 'RawResultTable' })
    expect(table.props('analysisId')).toBe(-1)
    expect(table.props('analysisName')).toBe('Analysis -1')
  })

  it('applies the analysis and domain filters to unmapped rows', () => {
    const rows = [
      { analysisId: 10, covariateId: 1, domainId: 'DEATH', v: 1 },
      { analysisId: 20, covariateId: 2, domainId: 'VISIT', v: 2 },
    ]
    // Analysis filter keeps only analysis 10.
    const byAnalysis = mountWithUnmapped(rows, { selectedAnalysisIds: [10] })
    let tables = byAnalysis.findAllComponents({ name: 'RawResultTable' })
    expect(tables).toHaveLength(1)
    expect(tables[0].props('analysisId')).toBe(10)

    // Domain filter keeps only the VISIT row.
    const byDomain = mountWithUnmapped(rows, { selectedDomains: ['VISIT'] })
    tables = byDomain.findAllComponents({ name: 'RawResultTable' })
    expect(tables).toHaveLength(1)
    expect(tables[0].props('analysisId')).toBe(20)
  })

  it('shows the empty state when nothing (including unmapped) matches', () => {
    const w = mountWithUnmapped([])
    expect(w.findComponent({ name: 'RawResultTable' }).exists()).toBe(false)
    expect(w.find('.char-per-analysis__empty').exists()).toBe(true)
  })
})
