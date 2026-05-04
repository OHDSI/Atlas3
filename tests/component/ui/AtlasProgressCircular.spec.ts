import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasProgressCircular from '@/components/ui/AtlasProgressCircular.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasProgressCircular', () => {
  it('renders v-progress-circular', () => {
    const wrapper = mount(AtlasProgressCircular, {
      global: { plugins: [vuetify] },
      attrs: { modelValue: 60 },
    })
    expect(wrapper.findComponent({ name: 'VProgressCircular' }).exists()).toBe(true)
  })
})
