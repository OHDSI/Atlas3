import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import NestedCriteriaRenderer from '@/components/cohort-builder/NestedCriteriaRenderer.vue'
import type { NestedCriteria } from '@/models/cohort.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('NestedCriteriaRenderer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (nested: NestedCriteria, depth: number = 0) => {
    return mount(NestedCriteriaRenderer, {
      global: { plugins: [vuetify] },
      props: { nested, depth },
    })
  }

  it('should render nested criteria', () => {
    const nested: NestedCriteria = {
      id: '1',
      logicType: 'ALL',
      events: [],
    }

    const wrapper = createWrapper(nested)
    expect(wrapper.exists()).toBe(true)
  })

  it('should track nesting depth', () => {
    const nested: NestedCriteria = {
      id: '1',
      logicType: 'ALL',
      events: [],
    }

    const wrapper = createWrapper(nested, 3)
    expect(wrapper.props('depth')).toBe(3)
  })

  it('should warn if depth exceeds 10 levels', () => {
    const nested: NestedCriteria = {
      id: '1',
      logicType: 'ALL',
      events: [],
    }

    const wrapper = createWrapper(nested, 11)
    expect(wrapper.html()).toContain('warning')
  })
})
