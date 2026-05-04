import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasCol from '@/components/ui/AtlasCol.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasCol', () => {
  it('renders v-col', () => {
    const wrapper = mount(AtlasCol, {
      global: { plugins: [vuetify] },
      slots: { default: 'content' },
    })
    expect(wrapper.findComponent({ name: 'VCol' }).exists()).toBe(true)
  })
})
