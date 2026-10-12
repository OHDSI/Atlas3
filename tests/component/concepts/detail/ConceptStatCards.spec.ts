import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const dataSourcesStore = {
  sources: [
    { sourceId: 1, sourceKey: 'SYNPUF1K', sourceName: 'Synpuf 1k', daimons: [{ daimonType: 'Results' }] },
    { sourceId: 2, sourceKey: 'CCAE', sourceName: 'Truven CCAE', daimons: [{ daimonType: 'Results' }] },
    { sourceId: 3, sourceKey: 'OPTUM', sourceName: 'Optum EHR', daimons: [{ daimonType: 'CDM' }] },
  ],
  sourcesLoaded: true,
  loading: { sources: false },
  error: { sources: null },
  ensureDataSources: vi.fn().mockResolvedValue(undefined),
}

const conceptDetailStore = {
  loadRecordCountsForSources: vi.fn().mockResolvedValue(undefined),
}

function makeResultsSource(index: number) {
  return {
    sourceId: index,
    sourceKey: `SOURCE_${index}`,
    sourceName: `Source ${index}`,
    daimons: [{ daimonType: 'Results' }],
  }
}

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: vi.fn(() => dataSourcesStore),
}))

vi.mock('@/stores/concept-detail', () => ({
  useConceptDetailStore: vi.fn(() => conceptDetailStore),
}))

import ConceptStatCards from '@/components/concepts/detail/ConceptStatCards.vue'

describe('ConceptStatCards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    dataSourcesStore.sources = [
      { sourceId: 1, sourceKey: 'SYNPUF1K', sourceName: 'Synpuf 1k', daimons: [{ daimonType: 'Results' }] },
      { sourceId: 2, sourceKey: 'CCAE', sourceName: 'Truven CCAE', daimons: [{ daimonType: 'Results' }] },
      { sourceId: 3, sourceKey: 'OPTUM', sourceName: 'Optum EHR', daimons: [{ daimonType: 'CDM' }] },
    ]
    dataSourcesStore.sourcesLoaded = true
    dataSourcesStore.loading.sources = false
    dataSourcesStore.error.sources = null
    dataSourcesStore.ensureDataSources.mockClear()
    conceptDetailStore.loadRecordCountsForSources.mockClear()
  })

  it('renders one card per data source with formatted record counts', async () => {
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

    await flushPromises()

    expect(wrapper.findAll('[data-testid^="stat-card-"]').length).toBe(2)
    expect(wrapper.text()).toContain('Synpuf 1k')
    expect(wrapper.text()).toContain('12,345')
    expect(wrapper.text()).toContain('1.23M')
    expect(wrapper.text()).toContain('Truven CCAE')
    expect(wrapper.text()).not.toContain('Optum EHR')
    expect(conceptDetailStore.loadRecordCountsForSources).toHaveBeenCalledWith(['CCAE'], 201826)
  })

  it('shows "—" placeholders for sources with no counts loaded yet', async () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptStatCards, {
      props: {
        conceptId: 1,
        primarySourceKey: 'SYNPUF1K',
        countsBySource: new Map(),
      },
      global: { plugins: [vuetify] },
    })
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="stat-card-"]').length).toBe(2)
    expect(wrapper.text()).toContain('—')
  })

  it('uses stable tie-breakers and sorts sources without counts last', async () => {
    dataSourcesStore.sources = [
      { sourceId: 1, sourceKey: 'HIGH', sourceName: 'High count', daimons: [{ daimonType: 'Results' }] },
      { sourceId: 2, sourceKey: 'TIE_B', sourceName: 'Same name', daimons: [{ daimonType: 'Results' }] },
      { sourceId: 3, sourceKey: 'TIE_A', sourceName: 'Same name', daimons: [{ daimonType: 'Results' }] },
      { sourceId: 4, sourceKey: 'MISSING', sourceName: 'No count', daimons: [{ daimonType: 'Results' }] },
    ]
    const counts = new Map([
      ['HIGH', { recordCount: 10, descendantRecordCount: 0, personCount: 0, descendantPersonCount: 0 }],
      ['TIE_A', { recordCount: 5, descendantRecordCount: 0, personCount: 0, descendantPersonCount: 0 }],
      ['TIE_B', { recordCount: 5, descendantRecordCount: 0, personCount: 0, descendantPersonCount: 0 }],
    ])
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptStatCards, {
      props: { conceptId: 1, primarySourceKey: 'HIGH', countsBySource: counts },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    expect(wrapper.findAll('[data-testid^="stat-card-"]').map(card => card.attributes('data-testid')))
      .toEqual(['stat-card-HIGH', 'stat-card-TIE_A', 'stat-card-TIE_B', 'stat-card-MISSING'])
  })

  it('sorts eligible sources by record count and expands beyond six cards', async () => {
    dataSourcesStore.sources = Array.from({ length: 7 }, (_, index) => makeResultsSource(index + 1))
    const counts = new Map(
      dataSourcesStore.sources.map((source, index) => [
        source.sourceKey,
        { recordCount: index * 10, descendantRecordCount: 0, personCount: 0, descendantPersonCount: 0 },
      ])
    )
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptStatCards, {
      props: { conceptId: 1, primarySourceKey: 'SOURCE_1', countsBySource: counts },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    expect(wrapper.findAll('[data-testid^="stat-card-"]').map(card => card.attributes('data-testid')))
      .toEqual(['stat-card-SOURCE_7', 'stat-card-SOURCE_6', 'stat-card-SOURCE_5', 'stat-card-SOURCE_4', 'stat-card-SOURCE_3', 'stat-card-SOURCE_2'])
    await wrapper.get('[data-testid="concept-stat-cards-toggle"]').trigger('click')
    expect(wrapper.findAll('[data-testid^="stat-card-"]').length).toBe(7)
    expect(wrapper.get('[data-testid="concept-stat-cards-toggle"]').attributes('aria-expanded')).toBe('true')
    expect(conceptDetailStore.loadRecordCountsForSources).toHaveBeenCalledWith(
      ['SOURCE_2', 'SOURCE_3', 'SOURCE_4', 'SOURCE_5', 'SOURCE_6', 'SOURCE_7'],
      1
    )

    await wrapper.setProps({ conceptId: 2 })
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="stat-card-"]').length).toBe(6)
    expect(conceptDetailStore.loadRecordCountsForSources).toHaveBeenLastCalledWith(
      ['SOURCE_2', 'SOURCE_3', 'SOURCE_4', 'SOURCE_5', 'SOURCE_6', 'SOURCE_7'],
      2
    )
  })

  it('shows an empty state when no source has a Results daimon', async () => {
    dataSourcesStore.sources = [
      { sourceId: 1, sourceKey: 'CDM_ONLY', sourceName: 'CDM only', daimons: [{ daimonType: 'CDM' }] },
    ]
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptStatCards, {
      props: { conceptId: 1, primarySourceKey: 'CDM_ONLY', countsBySource: new Map() },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="concept-stat-cards-empty"]').text()).toContain('No data sources')
    expect(conceptDetailStore.loadRecordCountsForSources).not.toHaveBeenCalled()
  })

  it('shows a retryable error when the source catalogue fails to load', async () => {
    dataSourcesStore.sourcesLoaded = false
    dataSourcesStore.error.sources = 'Network error'
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptStatCards, {
      props: { conceptId: 1, primarySourceKey: 'SYNPUF1K', countsBySource: new Map() },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="concept-stat-cards-source-error"]').text()).toContain('Unable to load data sources')
    await wrapper.get('[data-testid="concept-stat-cards-source-error"] button').trigger('click')
    expect(dataSourcesStore.ensureDataSources).toHaveBeenCalledTimes(2)
  })
})
