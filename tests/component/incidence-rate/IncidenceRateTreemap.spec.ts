import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IncidenceRateTreemap from '@/components/incidence-rate/IncidenceRateTreemap.vue'

const json = JSON.stringify({
  name: 'root',
  children: [
    { name: 'a', size: 10, rate: 1, cases: 1, tar: 100, persons: 100 },
    { name: 'b', size: 20, rate: 2, cases: 2, tar: 100, persons: 100 },
  ],
})

describe('IncidenceRateTreemap', () => {
  it('renders one rect per leaf', async () => {
    const w = mount(IncidenceRateTreemap, { props: { treemapJson: json, width: 200, height: 200 } })
    await new Promise(r => setTimeout(r, 0))
    expect(w.findAll('rect').length).toBe(2)
  })

  it('handles empty input gracefully', () => {
    const w = mount(IncidenceRateTreemap, { props: { treemapJson: '', width: 200, height: 200 } })
    expect(w.findAll('rect').length).toBe(0)
  })
})
