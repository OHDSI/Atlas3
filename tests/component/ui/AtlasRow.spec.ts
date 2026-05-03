import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasRow from '@/components/ui/AtlasRow.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasRow', () => {
  it('renders v-row', () => {
    const wrapper = mount(AtlasRow, {
      global: { plugins: [vuetify] },
      slots: { default: '<AtlasCol>content</AtlasCol>' },
    })
    expect(wrapper.findComponent({ name: 'VRow' }).exists()).toBe(true)
  })
})
