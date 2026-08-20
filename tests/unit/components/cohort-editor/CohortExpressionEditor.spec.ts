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
import { AtlasTextField } from '@/components/ui'
import { InlineAtlasMenuStub } from '../../../helpers/component-wrapper'
import type { CohortExpression } from '@/models/circe-types'
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
describe('observation window day inputs', () => {
  function mountWithObservationWindow(priorDays: number, postDays: number) {
    const expression: CohortExpression = {
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: {} }],
        ObservationWindow: { PriorDays: priorDays, PostDays: postDays },
      },
    }

    const wrapper = mount(CohortExpressionEditor, {
      props: { expression, conceptSets: [] },
      global: {
        plugins: [vuetify],
        stubs: { AtlasMenu: InlineAtlasMenuStub, teleport: true },
      },
    })

    const popover = wrapper.find('.obs-period-popover__fields')
    const fields = wrapper
      .findAllComponents(AtlasTextField)
      .filter(field => popover.element.contains(field.element))

    return { expression, prior: fields[0]!, post: fields[1]! }
  }

  it('writes a finite day count the user types', async () => {
    const { expression, prior, post } = mountWithObservationWindow(365, 0)

    await prior.vm.$emit('update:modelValue', '30')
    await post.vm.$emit('update:modelValue', 45)

    expect(expression.PrimaryCriteria!.ObservationWindow!.PriorDays).toBe(30)
    expect(expression.PrimaryCriteria!.ObservationWindow!.PostDays).toBe(45)
  })

  it('leaves the previous day count alone when the input is not a number', async () => {
    const { expression, prior, post } = mountWithObservationWindow(365, 180)

    await prior.vm.$emit('update:modelValue', 'not a number')
    await post.vm.$emit('update:modelValue', Number.NaN)

    expect(expression.PrimaryCriteria!.ObservationWindow!.PriorDays).toBe(365)
    expect(expression.PrimaryCriteria!.ObservationWindow!.PostDays).toBe(180)
  })

  it('treats a cleared field as the documented default of zero days', async () => {
    const { expression, prior, post } = mountWithObservationWindow(365, 180)

    await prior.vm.$emit('update:modelValue', '')
    await post.vm.$emit('update:modelValue', null)

    expect(expression.PrimaryCriteria!.ObservationWindow!.PriorDays).toBe(0)
    expect(expression.PrimaryCriteria!.ObservationWindow!.PostDays).toBe(0)
  })
})
