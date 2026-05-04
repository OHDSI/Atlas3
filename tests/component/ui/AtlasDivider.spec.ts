import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasDivider from '@/components/ui/AtlasDivider.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasDivider', () => {
  it('renders v-divider', () => {
    const wrapper = mount(AtlasDivider, {
      global: { plugins: [vuetify] },
    })
    expect(wrapper.findComponent({ name: 'VDivider' }).exists()).toBe(true)
  })
})
