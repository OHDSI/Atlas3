import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: vi.fn(() => ({
    sources: [
      { sourceId: 1, sourceKey: 'SYNPUF1K', sourceName: 'Synpuf 1k' },
      { sourceId: 2, sourceKey: 'CCAE', sourceName: 'Truven CCAE' },
      { sourceId: 3, sourceKey: 'OPTUM', sourceName: 'Optum EHR' },
    ],
  })),
}))

vi.mock('@/stores/concept-detail', () => ({
  useConceptDetailStore: vi.fn(() => ({
    loadRecordCountsForSources: vi.fn().mockResolvedValue(undefined),
  })),
}))

import ConceptStatCards from '@/components/concepts/detail/ConceptStatCards.vue'

describe('ConceptStatCards', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders one card per data source with formatted record counts', () => {
    const vuetify = createVuetify({ components, directives })
    const counts = new Map([
      [
        'SYNPUF1K',
        { recordCount: 12345, descendantRecordCount: 45678, personCount: 8200, descendantPersonCount: 28300 },
      ],
      [
        'CCAE',
        { recordCount: 1234567, descendantRecordCount: 5432109, personCount: 850123, descendantPersonCount: 2140500 },
      ],
    ])

    const wrapper = mount(ConceptStatCards, {
      props: { conceptId: 201826, primarySourceKey: 'SYNPUF1K', countsBySource: counts },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.findAll('[data-testid^="stat-card-"]').length).toBe(3)
    expect(wrapper.text()).toContain('Synpuf 1k')
    expect(wrapper.text()).toContain('12,345')
    expect(wrapper.text()).toContain('1.23M')
    expect(wrapper.text()).toContain('Truven CCAE')
  })

  it('shows "—" placeholders for sources with no counts loaded yet', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptStatCards, {
      props: {
        conceptId: 1,
        primarySourceKey: 'SYNPUF1K',
        countsBySource: new Map(),
      },
      global: { plugins: [vuetify] },
    })
    expect(wrapper.findAll('[data-testid^="stat-card-"]').length).toBe(3)
    expect(wrapper.text()).toContain('—')
  })
})
