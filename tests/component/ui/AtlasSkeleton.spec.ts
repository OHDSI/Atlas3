import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasSkeleton from '@/components/ui/AtlasSkeleton.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

describe('AtlasSkeleton', () => {
  it('renders v-skeleton-loader', () => {
    const wrapper = mount(AtlasSkeleton, {
      global: { plugins: [vuetify] },
      attrs: { type: 'text' },
    })
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
  })
})
