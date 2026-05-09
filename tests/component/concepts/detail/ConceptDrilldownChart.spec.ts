import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const loadDrilldown = vi.fn().mockResolvedValue(undefined)

vi.mock('@/stores/concept-detail', () => ({
  useConceptDetailStore: vi.fn(() => ({
    loadDrilldown,
    drilldownBySource: new Map([
      [
        'SYNPUF1K',
        {
          ageAtFirstOccurrence: [
            {
              category: 'MALE',
              minValue: 0,
              p10Value: 35,
              p25Value: 45,
              medianValue: 58,
              p75Value: 70,
              p90Value: 78,
              maxValue: 99,
            },
          ],
          prevalenceByGenderAgeYear: [],
          prevalenceByMonth: [{ calendarMonth: 201001, prevalence1000pp: 12.4 }],
        },
      ],
    ]),
    isDrilldownLoading: false,
  })),
}))

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: vi.fn(() => ({
    sources: [{ sourceId: 1, sourceKey: 'SYNPUF1K', sourceName: 'Synpuf 1k' }],
  })),
}))

vi.mock('vue-echarts', () => ({
  default: {
    name: 'VChart',
    props: ['option'],
    template: '<div data-testid="v-chart" />',
  },
}))

import ConceptDrilldownChart from '@/components/concepts/detail/ConceptDrilldownChart.vue'
import type { Concept } from '@/models/concept-set.types'

const concept: Concept = {
  conceptId: 201826,
  conceptName: 'Type 2 diabetes mellitus',
  conceptCode: '44054006',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

describe('ConceptDrilldownChart', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    loadDrilldown.mockClear()
  })

  it('triggers loadDrilldown on mount with the primary source key', () => {
    const vuetify = createVuetify({ components, directives })
    mount(ConceptDrilldownChart, {
      props: { concept, primarySourceKey: 'SYNPUF1K' },
      global: { plugins: [vuetify] },
    })
    expect(loadDrilldown).toHaveBeenCalledWith('SYNPUF1K')
  })

  it('renders the echarts component once data is in the store', async () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDrilldownChart, {
      props: { concept, primarySourceKey: 'SYNPUF1K' },
      global: { plugins: [vuetify] },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="v-chart"]').exists()).toBe(true)
  })

  it('shows tabs for Age, Gender/Age/Year, Calendar Month', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDrilldownChart, {
      props: { concept, primarySourceKey: 'SYNPUF1K' },
      global: { plugins: [vuetify] },
    })
    const text = wrapper.text()
    expect(text).toContain('Age at first occurrence')
    expect(text).toContain('Calendar month')
  })
})
