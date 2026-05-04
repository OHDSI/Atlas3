import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasAvatar from '@/components/ui/AtlasAvatar.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasAvatar', () => {
  it('renders v-avatar', () => {
    const wrapper = mount(AtlasAvatar, {
      global: { plugins: [vuetify] },
      slots: { default: 'AB' },
    })
    expect(wrapper.findComponent({ name: 'VAvatar' }).exists()).toBe(true)
  })
})
