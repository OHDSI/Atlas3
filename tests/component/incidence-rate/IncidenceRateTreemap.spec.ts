import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import IncidenceRateTreemap from '@/components/incidence-rate/IncidenceRateTreemap.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const json = JSON.stringify({
  name: 'root',
  children: [
    { name: 'a', size: 10, cases: 1, timeAtRisk: 100 },
    { name: 'b', size: 20, cases: 2, timeAtRisk: 100 },
  ],
})

describe('IncidenceRateTreemap', () => {
  it('renders TreemapChart with leaf data', () => {
    const w = mount(IncidenceRateTreemap, {
      props: { treemapJson: json },
      global: { plugins: [vuetify], stubs: { 'v-chart': true } },
    })
    expect(w.findComponent({ name: 'TreemapChart' }).exists()).toBe(true)
  })

  it('handles empty input gracefully', () => {
    const w = mount(IncidenceRateTreemap, {
      props: { treemapJson: '' },
      global: { plugins: [vuetify], stubs: { 'v-chart': true } },
    })
    expect(w.html()).toBeDefined()
  })
})
