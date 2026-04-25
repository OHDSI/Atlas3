import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import SunburstChart from '@/components/reports/charts/SunburstChart.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('SunburstChart', () => {
  it('renders with hierarchical data', () => {
    const w = mount(SunburstChart, {
      props: {
        data: { name: 'root', value: 0, children: [
          { name: '1', value: 10 }, { name: '2', value: 5 },
        ]},
        colors: () => '#999',
      },
      global: {
        plugins: [vuetify],
        stubs: { 'v-chart': true },
      },
    })
    expect(w.find('.sunburst-chart-container').exists()).toBe(true)
  })

  it('emits arc-click on chart click', () => {
    const w = mount(SunburstChart, {
      props: {
        data: { name: 'root', value: 0, children: [{ name: '1', value: 10 }] },
        colors: () => '#999',
      },
      global: {
        plugins: [vuetify],
        stubs: { 'v-chart': true },
      },
    })
    const exposed = w.vm as unknown as {
      handleChartClick: (e: { data?: { name: string; value: number } }) => void
    }
    exposed.handleChartClick({ data: { name: '1', value: 10 } })
    expect(w.emitted('arc-click')).toBeTruthy()
  })
})
