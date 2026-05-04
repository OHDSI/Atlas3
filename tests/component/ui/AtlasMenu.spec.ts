import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasMenu from '@/components/ui/AtlasMenu.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasMenu', () => {
  it('renders v-menu', () => {
    const wrapper = mount(AtlasMenu, {
      global: { plugins: [vuetify] },
      slots: { default: '<span>item</span>' },
    })
    expect(wrapper.findComponent({ name: 'VMenu' }).exists()).toBe(true)
  })
})
