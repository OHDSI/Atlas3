import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PathwaySunburst from '@/components/pathway/results/PathwaySunburst.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const design = {
  name: 'X', tags: [],
  targetCohorts: [{ id: 1, name: 'T' }],
  eventCohorts: [{ id: 10, name: 'A' }, { id: 20, name: 'B' }],
  combinationWindow: 30, minCellCount: 5, maxDepth: 3, allowRepeats: false,
}

const results = {
  pathwayGroups: [{
    targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 80,
    pathways: [{ path: '1-2', personCount: 20 }],
  }],
  eventCodes: [
    { code: 1, name: 'A', isCombo: false },
    { code: 2, name: 'B', isCombo: false },
  ],
}

describe('PathwaySunburst', () => {
  it('renders a SunburstChart for the given target group', () => {
    const w = mount(PathwaySunburst, {
      props: { design, results, targetCohortId: 1 },
      global: {
        plugins: [vuetify],
        stubs: { SunburstChart: true, 'v-chart': true },
      },
    })
    expect(w.findComponent({ name: 'SunburstChart' }).exists()).toBe(true)
  })

  it('emits pathway:select with decoded path on arc click', () => {
    const w = mount(PathwaySunburst, {
      props: { design, results, targetCohortId: 1 },
      global: {
        plugins: [vuetify],
        stubs: { SunburstChart: true, 'v-chart': true },
      },
    })
    const exposed = w.vm as unknown as {
      handleArcClick: (n: { name: string; value: number }) => void
    }
    exposed.handleArcClick({ name: '1', value: 20 })
    expect(w.emitted('pathway:select')).toBeTruthy()
  })
})
