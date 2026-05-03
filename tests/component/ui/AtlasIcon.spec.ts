import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasIcon from '@/components/ui/AtlasIcon.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasIcon', () => {
  it('renders v-icon', () => {
    const wrapper = mount(AtlasIcon, {
      global: { plugins: [vuetify] },
      attrs: { icon: 'mdi-home' },
    })
    expect(wrapper.findComponent({ name: 'VIcon' }).exists()).toBe(true)
  })
})
