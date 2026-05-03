import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasProgressLinear from '@/components/ui/AtlasProgressLinear.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasProgressLinear', () => {
  it('renders v-progress-linear', () => {
    const wrapper = mount(AtlasProgressLinear, {
      global: { plugins: [vuetify] },
      attrs: { modelValue: 50 },
    })
    expect(wrapper.findComponent({ name: 'VProgressLinear' }).exists()).toBe(true)
  })
})
