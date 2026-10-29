import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import PathwayTableView from '@/components/pathway/results/PathwayTableView.vue'
import { tr } from '../../../helpers/i18n-mock'

const vuetify = createVuetify({ components, directives })

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

describe('PathwayTableView', () => {
  beforeEach(() => {
    // Pinia is required by useI18n() inside the component tree.
    setActivePinia(createPinia())
  })

  it('renders four tables with section headings', () => {
    const w = mount(PathwayTableView, {
      props: { design, results },
      global: { plugins: [vuetify] },
    })
    expect(w.findAll('table').length).toBe(4)
    expect(w.text()).toContain(tr('pathway.results.allPathways'))
    expect(w.text()).toContain(tr('pathway.results.countsByRank'))
    expect(w.text()).toContain(tr('pathway.results.eventCohortCounts'))
    expect(w.text()).toContain(tr('pathway.results.distinctEventCohortCounts'))
  })

  it('groups the four tables under a collapsible header per cohort', async () => {
    const twoCohorts = {
      ...results,
      pathwayGroups: [
        results.pathwayGroups[0]!,
        { ...results.pathwayGroups[0]!, targetCohortId: 2 },
      ],
    }
    const w = mount(PathwayTableView, {
      props: {
        design: { ...design, targetCohorts: [{ id: 1, name: 'T' }, { id: 2, name: 'U' }] },
        results: twoCohorts,
      },
      global: { plugins: [vuetify] },
    })
    expect(w.findAll('table').length).toBe(8)
    const toggles = w.findAll('.pathway-cohort-section__toggle')
    expect(toggles.map(t => t.text())).toEqual(['T', 'U'])
    await toggles[0]!.trigger('click')
    expect(w.findAll('table').length).toBe(4)
  })
})
