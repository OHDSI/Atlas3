import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PathwayTableView from '@/components/pathway/results/PathwayTableView.vue'

const vuetify = createVuetify({ components, directives })

const design = {
  name: 'X', tags: [],
  design: {
    targetCohorts: [{ id: 1, name: 'T' }],
    eventCohorts: [{ id: 10, name: 'A' }, { id: 20, name: 'B' }],
    combinationWindow: 30, minCellCount: 5, maxDepth: 3, allowRepeats: false,
  },
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

describe('PathwayTableView', () => {
  it('renders four tables with section headings', () => {
    const w = mount(PathwayTableView, {
      props: { design, results, targetCohortId: 1 },
      global: { plugins: [vuetify] },
    })
    expect(w.findAll('table').length).toBe(4)
    expect(w.text()).toContain('All Pathways')
    expect(w.text()).toContain('Counts by Rank')
    expect(w.text()).toContain('Event Cohort Counts')
    expect(w.text()).toContain('Distinct Event Cohort Counts')
  })
})
