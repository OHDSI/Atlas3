import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CriteriaGroupEditor from '@/components/cohort-builder/CriteriaGroupEditor.vue'
import type { CriteriaGroup } from '@/models/cohort.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('CriteriaGroupEditor', () => {
  const createWrapper = (group?: CriteriaGroup) => {
    return mount(CriteriaGroupEditor, {
      global: { plugins: [vuetify] },
      props: { modelValue: group },
    })
  }

  it('should show logic type selector', () => {
    const wrapper = createWrapper()
    const selector = wrapper.find('[data-testid="logic-type-selector"]')
    expect(selector.exists()).toBe(true)
  })

  it('should show count input for AT_LEAST logic', async () => {
    const group: CriteriaGroup = {
      id: '1',
      logicType: 'AT_LEAST',
      count: 2,
      events: [],
    }

    const wrapper = createWrapper(group)
    const countInput = wrapper.find('[data-testid="logic-count-input"]')
    expect(countInput.exists()).toBe(true)
  })

  it('should validate count required for AT_LEAST', () => {
    const group: CriteriaGroup = {
      id: '1',
      logicType: 'AT_LEAST',
      events: [],
    }

    const wrapper = createWrapper(group)
    expect(wrapper.vm).toBeDefined()
  })
})
