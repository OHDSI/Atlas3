import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasList from '@/components/ui/AtlasList.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasList', () => {
  it('renders v-list', () => {
    const wrapper = mount(AtlasList, {
      global: { plugins: [vuetify] },
      slots: { default: '<v-list-item>x</v-list-item>' },
    })
    expect(wrapper.findComponent({ name: 'VList' }).exists()).toBe(true)
  })

  it('locks density to compact', () => {
    const wrapper = mount(AtlasList, {
      global: { plugins: [vuetify] },
      attrs: { density: 'comfortable' },
      slots: { default: '<v-list-item>x</v-list-item>' },
    })
    expect(wrapper.findComponent({ name: 'VList' }).props('density')).toBe('compact')
  })
})
