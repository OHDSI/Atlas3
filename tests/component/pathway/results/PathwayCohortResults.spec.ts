import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import PathwayCohortResults from '@/components/pathway/results/PathwayCohortResults.vue'

const vuetify = createVuetify({ components, directives })

const design = {
  name: 'X', tags: [],
  targetCohorts: [{ id: 1, name: 'Target A' }],
  eventCohorts: [{ id: 10, name: 'A' }, { id: 20, name: 'B' }],
  combinationWindow: 30, minCellCount: 5, maxDepth: 3, allowRepeats: false,
}
const group = {
  targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 80,
  pathways: [{ path: '1-2', personCount: 20 }],
}
const results = {
  pathwayGroups: [group],
  eventCodes: [
    { code: 1, name: 'A', isCombo: false },
    { code: 2, name: 'B', isCombo: false },
  ],
}

function mountRow() {
  return mount(PathwayCohortResults, {
    props: {
      design,
      results,
      group,
      targetCohortId: 1,
      cohortName: 'Target A',
      colors: () => '#123456',
    },
    global: {
      plugins: [vuetify],
      stubs: {
        PathwaySunburst: {
          emits: ['pathway:select'],
          template: '<button data-testid="sunburst" @click="$emit(\'pathway:select\', { code: 2, nodeName: \'1-2\', value: 20 })" />',
        },
      },
    },
  })
}

describe('PathwayCohortResults', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the cohort name header and the three result columns', () => {
    const w = mountRow()
    expect(w.text()).toContain('Target A')
    expect(w.find('.cohort-results__chart').exists()).toBe(true)
    expect(w.find('.cohort-results__legend').exists()).toBe(true)
    expect(w.find('.cohort-results__insights').exists()).toBe(true)
    expect(w.find('[data-testid="insights-empty-hint"]').exists()).toBe(true)
  })

  it('shows selected path details after a slice is clicked', async () => {
    const w = mountRow()
    await w.get('[data-testid="sunburst"]').trigger('click')
    expect(w.find('[data-testid="insights-empty-hint"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="path-step-row"]').length).toBe(2)
  })

  it('collapses and expands from the cohort header', async () => {
    const w = mountRow()
    await w.get('.pathway-cohort-section__toggle').trigger('click')
    expect(w.find('.cohort-results').exists()).toBe(false)
    await w.get('.pathway-cohort-section__toggle').trigger('click')
    expect(w.find('.cohort-results').exists()).toBe(true)
  })

  it('shows no data instead of a sunburst when the cohort has no result group', () => {
    const w = mount(PathwayCohortResults, {
      props: {
        design,
        results,
        targetCohortId: 2,
        cohortName: 'Target B',
        colors: () => '#123456',
      },
      global: { plugins: [vuetify] },
    })

    expect(w.text()).toContain('Target B')
    expect(w.find('[data-testid="pathway-cohort-no-data"]').text()).toBe('No data')
    expect(w.findComponent({ name: 'PathwaySunburst' }).exists()).toBe(false)
  })
})
