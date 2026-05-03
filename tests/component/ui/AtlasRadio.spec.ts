// tests/component/ui/AtlasRadio.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VRadioGroup } from 'vuetify/components'
import AtlasRadio from '@/components/ui/AtlasRadio.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountInGroup(props: Record<string, unknown> = {}) {
  return mount(VRadioGroup, {
    global: { plugins: [vuetify] },
    slots: {
      default: {
        components: { AtlasRadio },
        template: `<AtlasRadio v-bind="radioProps" />`,
        data() { return { radioProps: props } },
      },
    },
  })
}

describe('AtlasRadio', () => {
  it('renders a v-radio inside a v-radio-group', () => {
    const wrapper = mountInGroup({ value: 'a', label: 'Option A' })
    expect(wrapper.findComponent({ name: 'VRadio' }).exists()).toBe(true)
  })

  it('forwards value prop', () => {
    const wrapper = mountInGroup({ value: 'b' })
    expect(wrapper.findComponent({ name: 'VRadio' }).props('value')).toBe('b')
  })

  it('renders label', () => {
    const wrapper = mountInGroup({ value: 'c', label: 'Choice C' })
    expect(wrapper.findComponent({ name: 'VRadio' }).props('label')).toBe('Choice C')
  })

  it('forwards disabled prop', () => {
    const wrapper = mountInGroup({ value: 'd', disabled: true })
    expect(wrapper.findComponent({ name: 'VRadio' }).props('disabled')).toBe(true)
  })
})
