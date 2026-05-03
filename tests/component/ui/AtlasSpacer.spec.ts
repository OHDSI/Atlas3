import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasSpacer from '@/components/ui/AtlasSpacer.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasSpacer', () => {
  it('renders v-spacer', () => {
    const wrapper = mount(AtlasSpacer, {
      global: { plugins: [vuetify] },
    })
    expect(wrapper.findComponent({ name: 'VSpacer' }).exists()).toBe(true)
  })
})
