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
})
