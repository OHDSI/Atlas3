import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasBanner from '@/components/ui/AtlasBanner.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasBanner', () => {
  it('renders v-banner', () => {
    const wrapper = mount(AtlasBanner, {
      global: { plugins: [vuetify] },
      attrs: { text: 'A banner message' },
    })
    expect(wrapper.findComponent({ name: 'VBanner' }).exists()).toBe(true)
  })
})
