import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import InclusionCriteriaPanel from '@/components/cohort-builder/InclusionCriteriaPanel.vue'
import type { InclusionRule } from '@/models/cohort.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('InclusionCriteriaPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (inclusionRules: InclusionRule[] = []) => {
    return mount(InclusionCriteriaPanel, {
      global: { plugins: [vuetify] },
      props: { modelValue: inclusionRules },
    })
  }

  it('should display empty state when no rules', () => {
    const wrapper = createWrapper([])
    expect(wrapper.text()).toContain('No inclusion rules')
  })

  it('should display add rule button', () => {
    const wrapper = createWrapper()
    const addButton = wrapper.find('[data-testid="add-inclusion-rule"]')
    expect(addButton.exists()).toBe(true)
  })

  it('should emit update when adding rule', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="add-inclusion-rule"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should display existing rules', () => {
    const rules: InclusionRule[] = [{
      id: '1',
      name: 'Test Rule',
      description: 'Test Description',
      criteriaGroups: [],
    }]

    const wrapper = createWrapper(rules)
    expect(wrapper.text()).toContain('Test Rule')
  })
})
