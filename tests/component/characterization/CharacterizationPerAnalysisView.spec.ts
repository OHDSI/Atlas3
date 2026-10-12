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
        selectedCohortIds: [],
      },
    })
    const tables = w.findAllComponents({ name: 'PrevalenceTable' })
    expect(tables).toHaveLength(2)
  })

  it('passes collapsed analysis state to its result table', async () => {
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
        distribution: [], cohorts: COHORTS, threshold: 0,
        selectedAnalysisIds: [], selectedDomains: [], selectedCohortIds: [],
      },
    })

    const firstTable = w.findAllComponents({ name: 'PrevalenceTable' })[0]!
    expect(firstTable.props('expanded')).toBe(true)
    await firstTable.vm.$emit('update:expanded', false)
    expect(firstTable.props('expanded')).toBe(false)
  })

  it('places an analysis distribution table after its prevalence table', () => {
    const prevalence = {
      analysisId: 1, analysisName: 'Measures', covariateId: 11, covariateName: 'Weight', conceptId: 0,
      cohorts: COHORTS, count: { overall: { '1': 1, '2': 1 } }, pct: { overall: { '1': 50, '2': 50 } },
    }
    const distribution = {
      analysisId: 1, analysisName: 'Measures', covariateId: 12, covariateName: 'Height', conceptId: 0,
      cohorts: COHORTS, strataNames: {}, avg: { overall: { '1': 170, '2': 175 } }, stdDev: {}, min: {},
      p10: {}, p25: {}, median: {}, p75: {}, p90: {}, max: {},
    }
    const w = mount(CharacterizationPerAnalysisView, {
      global: { plugins: [vuetify], stubs: ['PrevalenceTable', 'DistributionTable'] },
      props: {
        prevalence: [prevalence], distribution: [distribution], cohorts: COHORTS, threshold: 0,
        selectedAnalysisIds: [], selectedDomains: [], selectedCohortIds: [],
      },
    })

    const prevalenceTable = w.findComponent({ name: 'PrevalenceTable' })
    const distributionTable = w.findComponent({ name: 'DistributionTable' })
    expect(prevalenceTable.exists()).toBe(true)
    expect(distributionTable.exists()).toBe(true)
    expect(prevalenceTable.element.compareDocumentPosition(distributionTable.element)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('filters groups by analysis, domain, cohort, and threshold', () => {
    const rows = [
      { analysisId: 1, analysisName: 'A', covariateId: 1, covariateName: 'Pass', conceptId: 0,
        domainId: 'CONDITION', cohorts: COHORTS, count: { overall: { '1': 1, '2': 1 } }, pct: { overall: { '1': 75, '2': 5 } } },
      { analysisId: 2, analysisName: 'B', covariateId: 2, covariateName: 'Drop', conceptId: 0,
        domainId: 'DRUG', cohorts: COHORTS, count: { overall: { '1': 1, '2': 1 } }, pct: { overall: { '1': 10, '2': 5 } } },
    ]
    const w = mount(CharacterizationPerAnalysisView, {
      global: { plugins: [vuetify], stubs: ['PrevalenceTable', 'DistributionTable'] },
      props: {
        prevalence: rows, distribution: [], cohorts: COHORTS, threshold: 50,
        selectedAnalysisIds: [1], selectedDomains: ['CONDITION'], selectedCohortIds: [2],
      },
    })

    const table = w.findComponent({ name: 'PrevalenceTable' })
    expect(table.props('rows')).toHaveLength(1)
    expect(table.props('cohorts')).toEqual([{ id: 2, name: 'B' }])
  })

  // #327: one analysis can emit a row per concept, so the rows need narrowing
  // by text, not just by analysis, domain and threshold.
  it('drops covariate rows that do not match the search', () => {
    const w = mount(CharacterizationPerAnalysisView, {
      global: { plugins: [vuetify], stubs: ['PrevalenceTable', 'DistributionTable'] },
      props: {
        prevalence: [
          { analysisId: 1, analysisName: 'Conditions', covariateId: 11,
            covariateName: 'Major depression', conceptId: 0, cohorts: COHORTS,
            count: { overall: { '1': 1, '2': 1 } },
            pct: { overall: { '1': 50, '2': 50 } } },
          { analysisId: 1, analysisName: 'Conditions', covariateId: 12,
            covariateName: 'Essential hypertension', conceptId: 0, cohorts: COHORTS,
            count: { overall: { '1': 1, '2': 1 } },
            pct: { overall: { '1': 30, '2': 30 } } },
        ],
        distribution: [],
        cohorts: COHORTS,
        threshold: 0,
        selectedAnalysisIds: [],
        selectedDomains: [],
        selectedCohortIds: [],
        search: 'depression',
      },
    })

    const rows = w.findComponent({ name: 'PrevalenceTable' }).props('rows') as { covariateName: string }[]
    expect(rows.map(r => r.covariateName)).toEqual(['Major depression'])
  })

  it('drops an analysis group entirely when nothing in it matches', () => {
    const w = mount(CharacterizationPerAnalysisView, {
      global: { plugins: [vuetify], stubs: ['PrevalenceTable', 'DistributionTable'] },
      props: {
        prevalence: [
          { analysisId: 1, analysisName: 'Conditions', covariateId: 11,
            covariateName: 'Essential hypertension', conceptId: 0, cohorts: COHORTS,
            count: { overall: { '1': 1, '2': 1 } },
            pct: { overall: { '1': 50, '2': 50 } } },
        ],
        distribution: [],
        cohorts: COHORTS,
        threshold: 0,
        selectedAnalysisIds: [],
        selectedDomains: [],
        selectedCohortIds: [],
        search: 'depression',
      },
    })

    expect(w.findAllComponents({ name: 'PrevalenceTable' })).toHaveLength(0)
    expect(w.text()).toContain('No rows match the current filter.')
  })
})
