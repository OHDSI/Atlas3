import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationTable1View from '@/components/characterization/CharacterizationTable1View.vue'
import {
  DEFAULT_TABLE1_CONFIG,
  DEFAULT_TABLE1_FILTERS,
  type LinkedCohort,
  type PrevalenceStat,
} from '@/models/characterization.types'

const vuetify = createVuetify({ components, directives })

const COHORTS: LinkedCohort[] = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
]

const minimalRow: PrevalenceStat = {
  analysisId: 1,
  analysisName: 'A',
  covariateId: 11,
  covariateName: 'X',
  conceptId: 0,
  cohorts: COHORTS,
  count: { overall: { '1': 50, '2': 80 } },
  pct: { overall: { '1': 25, '2': 40 } },
}

const minimalRowSingle: PrevalenceStat = {
  analysisId: 1,
  analysisName: 'A',
  covariateId: 11,
  covariateName: 'X',
  conceptId: 0,
  cohorts: [COHORTS[0]!],
  count: { overall: { '1': 50 } },
  pct: { overall: { '1': 25 } },
}

const baseProps = (over: Record<string, unknown> = {}) => ({
  prevalence: [],
  distribution: [],
  cohorts: COHORTS,
  config: { ...DEFAULT_TABLE1_CONFIG },
  filters: { ...DEFAULT_TABLE1_FILTERS },
  ...over,
})

describe('CharacterizationTable1View', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders one cohort group header per cohort', () => {
    const w = mount(CharacterizationTable1View, {
      global: { plugins: [vuetify] },
      props: baseProps({ prevalence: [minimalRow] }),
    })
    const cohortHeaders = w.findAll('[data-testid="char-t1-cohort-header"]')
    expect(cohortHeaders).toHaveLength(2)
  })

  it('renders std diff column for 2 cohorts', () => {
    const w = mount(CharacterizationTable1View, {
      global: { plugins: [vuetify] },
      props: baseProps({ prevalence: [minimalRow] }),
    })
    expect(w.find('[data-testid="char-t1-stddiff-header"]').exists()).toBe(true)
  })

  it('hides std diff column for non-2 cohorts', () => {
    const w = mount(CharacterizationTable1View, {
      global: { plugins: [vuetify] },
      props: baseProps({ cohorts: [COHORTS[0]], prevalence: [minimalRowSingle] }),
    })
    expect(w.find('[data-testid="char-t1-stddiff-header"]').exists()).toBe(false)
  })

  it('emits explore with the source row', async () => {
    const w = mount(CharacterizationTable1View, {
      global: { plugins: [vuetify] },
      props: baseProps({ prevalence: [minimalRow] }),
    })
    await w.find('[data-testid="char-t1-explore"]').trigger('click')
    expect(w.emitted('explore')).toHaveLength(1)
    expect((w.emitted('explore')![0]![0] as { covariateId: number }).covariateId).toBe(11)
  })

  it('shows empty state element when no rows', () => {
    const w = mount(CharacterizationTable1View, {
      global: { plugins: [vuetify] },
      props: baseProps(),
    })
    expect(w.find('[data-testid="char-t1-empty"]').exists()).toBe(true)
  })
})
