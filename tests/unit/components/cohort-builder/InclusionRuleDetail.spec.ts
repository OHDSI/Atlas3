import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { setActivePinia, createPinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import InclusionRuleDetail from '@/components/cohort-builder/InclusionRuleDetail.vue'
import type { InclusionRule } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function makeRule(): InclusionRule {
  return {
    id: 'r1',
    name: 'Adult',
    description: 'Existing description',
    criteriaGroups: [
      { id: 'g1', logicType: 'ALL', events: [] },
      { id: 'g2', logicType: 'ANY', events: [] },
    ],
  }
}

function mountDetail(props: Record<string, unknown> = {}) {
  return mount(InclusionRuleDetail, {
    props: { rule: makeRule(), ...props },
    global: {
      plugins: [vuetify],
      stubs: {
        CriteriaGroupEditor: {
          template: '<div class="criteria-group-editor-stub"/>',
          props: ['modelValue'],
          emits: ['update:modelValue', 'remove', 'select-concept-set', 'select-concept', 'edit-concept-set'],
        },
      },
    },
  })
}

describe('InclusionRuleDetail', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders an editor for every criteria group', () => {
    const wrapper = mountDetail()
    expect(wrapper.findAll('.criteria-group-editor-stub')).toHaveLength(2)
  })

  it('shows description placeholder when description is undefined', () => {
    const wrapper = mountDetail({ rule: { ...makeRule(), description: undefined } })
    const input = wrapper.find('input.rule-description-input').element as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('emits update:rule on description blur', async () => {
    const wrapper = mountDetail()
    const input = wrapper.find('input.rule-description-input')
    await input.setValue('New description')
    await input.trigger('blur')
    const events = wrapper.emitted('update:rule') as Array<[InclusionRule]> | undefined
    expect(events).toBeTruthy()
    expect(events![events!.length - 1]![0].description).toBe('New description')
  })

  it('emits update:rule when add-group is clicked', async () => {
    const wrapper = mountDetail()
    await wrapper.find('[data-testid="add-criteria-group"]').trigger('click')
    const events = wrapper.emitted('update:rule') as Array<[InclusionRule]> | undefined
    expect(events).toBeTruthy()
    expect(events![0]![0].criteriaGroups).toHaveLength(3)
  })

  it('renders empty state when rule is null', () => {
    const wrapper = mountDetail({ rule: null })
    expect(wrapper.find('[data-testid="inclusion-detail-empty"]').exists()).toBe(true)
    expect(wrapper.findAll('.criteria-group-editor-stub')).toHaveLength(0)
  })
})
