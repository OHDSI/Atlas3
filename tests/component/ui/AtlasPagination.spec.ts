import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasPagination from '@/components/ui/AtlasPagination.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasPagination', () => {
  it('renders v-pagination', () => {
    const wrapper = mount(AtlasPagination, {
      global: { plugins: [vuetify] },
      attrs: { length: 5 },
    })
    expect(wrapper.findComponent({ name: 'VPagination' }).exists()).toBe(true)
  })

  it('locks density to compact', () => {
    const wrapper = mount(AtlasPagination, {
      global: { plugins: [vuetify] },
      attrs: { density: 'comfortable', length: 5 },
    })
    expect(wrapper.findComponent({ name: 'VPagination' }).props('density')).toBe('compact')
  })
})
