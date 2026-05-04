import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasBadge from '@/components/ui/AtlasBadge.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasBadge', () => {
  it('renders v-badge', () => {
    const wrapper = mount(AtlasBadge, {
      global: { plugins: [vuetify] },
      attrs: { content: '3' },
      slots: { default: '<span>icon</span>' },
    })
    expect(wrapper.findComponent({ name: 'VBadge' }).exists()).toBe(true)
  })
})
