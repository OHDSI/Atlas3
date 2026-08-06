/**
 * ConceptSearchInline Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import ConceptSearchInline from '@/components/concepts/ConceptSearchInline.vue'
import ConceptFacetFilters from '@/components/concepts/ConceptFacetFilters.vue'
import { useConceptSearchStore } from '@/stores/concept-search'
import { createMockConcept } from '@/../tests/helpers/mock-factories'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const mockSearchConcepts = vi.fn()
const mockGetConceptRecordCounts = vi.fn()

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: (sourceKey: string, term: string) => mockSearchConcepts(sourceKey, term),
  getConceptRecordCounts: (sourceKey: string, conceptIds: number[]) =>
    mockGetConceptRecordCounts(sourceKey, conceptIds),
}))

vi.mock('@/config/webapi', () => ({
  getSourceKey: () => 'SYNPUF1K',
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({
    getValidVocabularySource: () => 'SYNPUF1K',
    sources: [],
    selectedSource: null,
    vocabularySources: [],
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/concepts/ConceptTable.vue', () => ({
  default: {
    name: 'ConceptTable',
    template: '<div class="concept-table-mock"></div>',
    props: ['concepts', 'loading', 'totalItems', 'page', 'itemsPerPage', 'showAddButton', 'conceptsInSet'],
    emits: ['update:page', 'update:itemsPerPage', 'add-concept', 'remove-concept', 'view-concept'],
  },
}))

const vuetify = createVuetify({ components, directives })

const RESULTS = [
  createMockConcept({ conceptId: 1, conceptName: 'Diabetes', vocabularyId: 'SNOMED', domainId: 'Condition' }),
  createMockConcept({ conceptId: 2, conceptName: 'Metformin', vocabularyId: 'RxNorm', domainId: 'Drug' }),
]

describe('ConceptSearchInline facet filters', () => {
  let wrapper: VueWrapper
  let store: ReturnType<typeof useConceptSearchStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useConceptSearchStore()
    mockSearchConcepts.mockResolvedValue({ concepts: RESULTS, totalCount: RESULTS.length })
    mockGetConceptRecordCounts.mockResolvedValue(new Map())
    wrapper = mount(ConceptSearchInline, { global: { plugins: [vuetify] } })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.clearAllMocks()
  })

  it('hides the facet filter bar before any results exist', () => {
    expect(store.isEmpty).toBe(true)
    expect(wrapper.findComponent(ConceptFacetFilters).exists()).toBe(false)
  })

  it('shows the facet filter bar once the search returns results', async () => {
    await store.search('diabetes')
    await flushPromises()

    expect(wrapper.findComponent(ConceptFacetFilters).exists()).toBe(true)
  })

  it('passes the store facet state through to the filter bar', async () => {
    await store.search('diabetes')
    await flushPromises()

    const filters = wrapper.findComponent(ConceptFacetFilters)
    expect(filters.props('facetOptions').vocabularyId.map((o: { value: string }) => o.value).sort())
      .toEqual(['RxNorm', 'SNOMED'])
    expect(filters.props('activeFilterCount')).toBe(0)
  })

  it('applies a facet selection to the results shown in the table', async () => {
    await store.search('diabetes')
    await flushPromises()

    wrapper.findComponent(ConceptFacetFilters).vm.$emit('update:facet', {
      key: 'vocabularyId',
      values: ['RxNorm'],
    })
    await flushPromises()

    expect(store.activeFacetCount).toBe(1)
    expect(store.concepts.map(c => c.conceptId)).toEqual([2])
    expect(wrapper.findComponent({ name: 'ConceptTable' }).props('concepts')).toHaveLength(1)
  })

  it('clears all facets when the filter bar emits clear', async () => {
    await store.search('diabetes')
    await flushPromises()

    const filters = wrapper.findComponent(ConceptFacetFilters)
    filters.vm.$emit('update:facet', { key: 'vocabularyId', values: ['RxNorm'] })
    await flushPromises()
    expect(store.activeFacetCount).toBe(1)

    filters.vm.$emit('clear')
    await flushPromises()

    expect(store.activeFacetCount).toBe(0)
    expect(store.concepts).toHaveLength(2)
  })

  it('keeps the filter bar visible when facets filter every row out', async () => {
    await store.search('diabetes')
    await flushPromises()

    wrapper.findComponent(ConceptFacetFilters).vm.$emit('update:facet', {
      key: 'vocabularyId',
      values: ['LOINC'],
    })
    await flushPromises()

    expect(store.concepts).toHaveLength(0)
    expect(wrapper.findComponent(ConceptFacetFilters).exists()).toBe(true)
  })
})
