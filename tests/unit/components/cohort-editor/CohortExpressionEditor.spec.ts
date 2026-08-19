import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CohortExpressionEditor from '@/components/cohort-editor/CohortExpressionEditor.vue'
import CriteriaRenderer from '@/components/circe/criteria/CriteriaRenderer.vue'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import ConditionOccurrence from '@/components/circe/criteria/ConditionOccurrence.vue'
import ProcedureOccurrence from '@/components/circe/criteria/ProcedureOccurrence.vue'
import DeviceExposure from '@/components/circe/criteria/DeviceExposure.vue'
import DrugExposure from '@/components/circe/criteria/DrugExposure.vue'
import InclusionRulesPanel from '@/components/cohort-editor/inclusion-rules/InclusionRulesPanel.vue'
import EndStrategyPanel from '@/components/cohort-editor/end-strategy/EndStrategyPanel.vue'
import CensorWindowEditor from '@/components/cohort-editor/CensorWindowEditor.vue'
import fixture from './fixtures/cohort-expression-large.json'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function cloneFixture() {
  return JSON.parse(JSON.stringify(fixture)) as typeof fixture
}

describe('CohortExpressionEditor', () => {
  it('materializes the editor tree from a full cohort expression fixture', () => {
    const expression = cloneFixture()

    const wrapper = mount(CohortExpressionEditor, {
      props: {
        expression,
        conceptSets: expression.ConceptSets ?? [],
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.find('[data-step="1"]').exists()).toBe(true)
    expect(wrapper.find('[data-step="2"]').exists()).toBe(true)
    expect(wrapper.find('[data-step="3"]').exists()).toBe(true)

    expect(wrapper.findComponent(CriteriaRenderer).exists()).toBe(true)
    expect(wrapper.findComponent(ProcedureOccurrence).exists()).toBe(true)
    expect(wrapper.findComponent(DeviceExposure).exists()).toBe(true)
    expect(wrapper.findComponent(DrugExposure).exists()).toBe(true)
    expect(wrapper.findComponent(ConditionOccurrence).exists()).toBe(true)

    expect(wrapper.findAll('.criteria-group-editor').length).toBeGreaterThanOrEqual(2)
    expect(wrapper.findComponent(CriteriaGroup).exists()).toBe(true)
    expect(wrapper.findComponent(InclusionRulesPanel).exists()).toBe(true)
    expect(wrapper.findComponent(EndStrategyPanel).exists()).toBe(true)
    expect(wrapper.findComponent(CensorWindowEditor).exists()).toBe(true)

    expect(wrapper.text()).toContain('Cohort Entry Events')
    expect(wrapper.text()).toContain('Inclusion Criteria')
    expect(wrapper.text()).toContain('Exit & Eras')
    expect(wrapper.text()).toContain('Cohort Eras')
  })
})