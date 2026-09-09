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
        selectedCohortId: null,
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
        selectedCohortId: null,
        search: 'depression',
      },
    })

    expect(w.findAllComponents({ name: 'PrevalenceTable' })).toHaveLength(0)
    expect(w.text()).toContain('No rows match the current filter.')
  })
})
