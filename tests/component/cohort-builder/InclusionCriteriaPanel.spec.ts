import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

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

  it('should display the empty-state container when no rules', () => {
    // Refresh: header strip with the add-rule button was retired —
    // the parent (CohortBuilder) section header now hosts that
    // action. The panel's empty-state CTA still exists and emits.
    const wrapper = createWrapper([])
    expect(wrapper.find('.inclusion-criteria-panel__empty').exists()).toBe(true)
  })

  it('should expose addNewRule for the parent section header to call', () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { addNewRule?: () => void }
    expect(typeof vm.addNewRule).toBe('function')
  })

  it('should emit update when addNewRule is invoked', async () => {
    const wrapper = createWrapper()
    const vm = wrapper.vm as unknown as { addNewRule: () => void }
    vm.addNewRule()
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
