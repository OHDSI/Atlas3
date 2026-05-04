import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasTabs from '@/components/ui/AtlasTabs.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasTabs', () => {
  it('renders v-tabs', () => {
    const wrapper = mount(AtlasTabs, {
      global: { plugins: [vuetify] },
      slots: { default: '<AtlasTab value="a">A</AtlasTab>' },
    })
    expect(wrapper.findComponent({ name: 'VTabs' }).exists()).toBe(true)
  })

  it('locks density to compact', () => {
    const wrapper = mount(AtlasTabs, {
      global: { plugins: [vuetify] },
      attrs: { density: 'comfortable' },
      slots: { default: '<AtlasTab value="a">A</AtlasTab>' },
    })
    expect(wrapper.findComponent({ name: 'VTabs' }).props('density')).toBe('compact')
  })
})
