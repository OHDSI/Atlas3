import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasTooltip from '@/components/ui/AtlasTooltip.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasTooltip', () => {
  it('renders v-tooltip', () => {
    const wrapper = mount(AtlasTooltip, {
      global: { plugins: [vuetify] },
      slots: { default: '<span>tip</span>' },
    })
    expect(wrapper.findComponent({ name: 'VTooltip' }).exists()).toBe(true)
  })
})
