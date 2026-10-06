import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
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
      global: { plugins: [vuetify, createPinia()], stubs: { 'v-chart': true } },
    })
    expect(w.findComponent({ name: 'AtlasTreemapChart' }).exists()).toBe(true)
  })

  it('handles empty input gracefully', () => {
    const w = mount(IncidenceRateTreemap, {
      props: { treemapJson: '' },
      global: { plugins: [vuetify, createPinia()], stubs: { 'v-chart': true } },
    })
    expect(w.html()).toBeDefined()
  })

  it('maps nested bitmask leaves and handles missing time at risk', () => {
    const w = mount(IncidenceRateTreemap, {
      props: {
        treemapJson: JSON.stringify({
          name: 'root',
          children: [
            {
              name: 'group',
              children: [
                { name: '10', size: 0, cases: 2, timeAtRisk: 20 },
                { name: '01', size: 4, cases: 1 },
              ],
            },
          ],
        }),
        strataNames: ['Female', 'Age 65+'],
      },
      global: { plugins: [vuetify, createPinia()], stubs: { 'v-chart': true } },
    })

    const data = w.findComponent({ name: 'AtlasTreemapChart' }).props('data') as Array<{
      name: string
      value: number
      colorValue: number
      conceptPath: string
    }>
    expect(data).toEqual([
      expect.objectContaining({
        name: 'Female',
        value: 1,
        colorValue: 0.1,
        conceptPath: expect.stringContaining('Rate: 100.0 per 1,000 PY'),
      }),
      expect.objectContaining({ name: 'Age 65+', value: 4, colorValue: 0 }),
    ])
  })

  it('returns no nodes for malformed JSON', () => {
    const w = mount(IncidenceRateTreemap, {
      props: { treemapJson: '{not json' },
      global: { plugins: [vuetify, createPinia()], stubs: { 'v-chart': true } },
    })
    expect(w.findComponent({ name: 'AtlasTreemapChart' }).props('data')).toEqual([])
  })

  it('returns no nodes for a root without children', () => {
    const w = mount(IncidenceRateTreemap, {
      props: { treemapJson: JSON.stringify({ name: 'root' }) },
      global: { plugins: [vuetify, createPinia()], stubs: { 'v-chart': true } },
    })
    expect(w.findComponent({ name: 'AtlasTreemapChart' }).props('data')).toEqual([])
  })
})
