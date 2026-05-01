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
      handleChartClick: (e: { dataIndex?: number }) => void
    }
    exposed.handleChartClick({ dataIndex: 0 })
    const events = w.emitted('arc-click') as Array<[unknown]> | undefined
    expect(events).toBeTruthy()
    const payload = events?.[0]?.[0] as { name: string } | undefined
    expect(payload?.name).toBe('1')
  })
})
