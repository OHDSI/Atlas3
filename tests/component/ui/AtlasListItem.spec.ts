import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasListItem from '@/components/ui/AtlasListItem.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasListItem', () => {
  it('renders v-list-item', () => {
    const wrapper = mount(AtlasListItem, {
      global: { plugins: [vuetify] },
      slots: { default: 'item text' },
    })
    expect(wrapper.findComponent({ name: 'VListItem' }).exists()).toBe(true)
  })

  it('locks density to compact', () => {
    const wrapper = mount(AtlasListItem, {
      global: { plugins: [vuetify] },
      attrs: { density: 'comfortable' },
      slots: { default: 'item text' },
    })
    expect(wrapper.findComponent({ name: 'VListItem' }).props('density')).toBe('compact')
  })
})
