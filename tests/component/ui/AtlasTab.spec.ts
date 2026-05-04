import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasTab from '@/components/ui/AtlasTab.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasTab', () => {
  it('renders v-tab inside v-tabs parent', () => {
    const wrapper = mount(
      {
        components: { AtlasTab, VTabs: components.VTabs },
        template: '<VTabs><AtlasTab value="a">label</AtlasTab></VTabs>',
      },
      { global: { plugins: [vuetify] } },
    )
    expect(wrapper.findComponent({ name: 'VTab' }).exists()).toBe(true)
  })
})
