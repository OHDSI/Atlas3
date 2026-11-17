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

  describe('sorting and filtering', () => {
    const richResults = {
      pathwayGroups: [{
        targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 80,
        pathways: [
          { path: '2-1', personCount: 7 },
          { path: '1', personCount: 12 },
          { path: '1-2', personCount: 30 },
          { path: '2', personCount: 25 },
        ],
      }],
      eventCodes: [
        { code: 1, name: 'Metformin', isCombo: false },
        { code: 2, name: 'Insulin', isCombo: false },
      ],
    }

    function mountRich() {
      return mount(PathwayTableView, {
        props: { design, results: richResults },
        global: { plugins: [vuetify] },
      })
    }

    function bodyRows(w: ReturnType<typeof mountRich>, key: string): string[][] {
      return w
        .find(`[data-test="pathway-table-${key}"]`)
        .findAll('tbody tr')
        .map(tr => tr.findAll('td').map(td => td.text()))
    }

    function counts(w: ReturnType<typeof mountRich>): string[] {
      return bodyRows(w, 'all').map(cells => cells[3]!)
    }

    it('orders all pathways by count, highest first, by default', () => {
      const w = mountRich()
      expect(counts(w)).toEqual(['30', '25', '12', '7'])
    })

    it('sorts counts numerically when the Count header is clicked', async () => {
      const w = mountRich()
      const countHeader = w
        .find('[data-test="pathway-table-all"]')
        .findAll('th')
        .find(th => th.text().includes('Count'))!
      await countHeader.trigger('click')
      expect(counts(w)).toEqual(['7', '12', '30', '25'])
      await countHeader.trigger('click')
      expect(counts(w)).toEqual(['7', '12', '25', '30'])
      await countHeader.trigger('click')
      expect(counts(w)).toEqual(['30', '25', '12', '7'])
    })

    it('offers a filter per event column and none for purely numeric tables', () => {
      const w = mountRich()
      expect(w.find('[data-test="pathway-table-filter-all-Step 1"]').exists()).toBe(true)
      expect(w.find('[data-test="pathway-table-filter-all-Step 3"]').exists()).toBe(true)
      expect(w.find('[data-test="pathway-table-filter-cohort-counts-Event Cohort"]').exists()).toBe(true)
      expect(w.find('[data-test^="pathway-table-filter-all-Count"]').exists()).toBe(false)
      expect(w.find('[data-test^="pathway-table-filter-distinct-"]').exists()).toBe(false)
    })

    it('shows only pathways starting with the filtered drug, still ordered by count', async () => {
      const w = mountRich()
      await w.find('[data-test="pathway-table-filter-all-Step 1"] input').setValue('metf')
      const rows = bodyRows(w, 'all')
      expect(rows.map(cells => cells[0])).toEqual(['Metformin', 'Metformin'])
      expect(counts(w)).toEqual(['30', '12'])
      expect(bodyRows(w, 'rank').length).toBe(4)
    })

    it('shows an empty-state message when nothing matches', async () => {
      const w = mountRich()
      await w.find('[data-test="pathway-table-filter-all-Step 1"] input').setValue('aspirin')
      expect(w.find('[data-test="pathway-table-all"]').text()).toContain(
        tr('pathway.results.noMatchingRows')
      )
    })
  })
})
