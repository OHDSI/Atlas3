/**
 * FeatureAnalysisPrevalenceEditor component tests
 *
 * Prevalence rows are always CriteriaGroup-shaped: confirm add/remove of
 * rows works and that a freshly-added row gets an empty CriteriaGroup
 * expression ready for CriteriaGroup.vue to edit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import FeatureAnalysisPrevalenceEditor from '@/components/feature-analyses/FeatureAnalysisPrevalenceEditor.vue'
import type { FeatureAnalysisAggregate, FeatureAnalysisCriteriaGroupItem } from '@/models/feature-analysis.types'
import type { ConceptSet } from '@/models/circe-types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const defaultAggregate: FeatureAnalysisAggregate = {
  id: 99,
  name: 'Default aggregate',
  isDefault: true,
}

function mountEditor(
  design: FeatureAnalysisCriteriaGroupItem[] = [],
  conceptSets: ConceptSet[] = [],
  aggregates: FeatureAnalysisAggregate[] = [defaultAggregate]
) {
  return mount(FeatureAnalysisPrevalenceEditor, {
    props: { design, conceptSets, aggregates },
    global: {
      plugins: [vuetify],
      stubs: {
        // Real CriteriaGroup pulls in the whole circe editor tree; a thin
        // stub that can mutate its `group` prop is enough to prove wiring.
        CriteriaGroup: {
          name: 'CriteriaGroup',
          props: ['group', 'conceptSets'],
          template:
            '<button data-testid="criteria-group-mutate" @click="group.Type = \'ANY\'">mutate</button>',
        },
        ConceptSetSelectionDialog: true,
      },
    },
  })
}

describe('FeatureAnalysisPrevalenceEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows an empty placeholder when there are no rows', () => {
    const wrapper = mountEditor([])
    expect(wrapper.text()).toContain('No criteria features yet.')
  })

  it('Add Criteria feature appends a CriteriaGroup row', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = []
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="fa-prevalence-add-criteria"]').trigger('click')

    expect(design).toHaveLength(1)
    expect(design[0].criteriaType).toBe('CriteriaGroup')
    expect(design[0].aggregate).toEqual(defaultAggregate)
    expect(design[0].expression).toEqual({
      Type: 'ALL',
      CriteriaList: [],
      DemographicCriteriaList: [],
      Groups: [],
    })
    expect(wrapper.find('[data-testid="fa-prevalence-row-0"]').exists()).toBe(true)
  })

  it('editing the row name mutates the underlying design array in place', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = [
      { name: '', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
    ]
    const wrapper = mountEditor(design)

    const nameInput = wrapper.find('[data-testid="fa-prevalence-row-0-name"] input')
    await nameInput.setValue('Diabetes present')

    expect(design[0].name).toBe('Diabetes present')
  })

  it('delete removes the row from the design array', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = [
      { name: 'A', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
      { name: 'B', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
    ]
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="fa-prevalence-row-0-delete"]').trigger('click')

    expect(design).toHaveLength(1)
    expect(design[0].name).toBe('B')
  })

  it('a CriteriaGroup edit mutates the row expression object directly', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = [
      { name: 'A', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
    ]
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="criteria-group-mutate"]').trigger('click')

    expect(design[0].expression.Type).toBe('ANY')
  })
})
