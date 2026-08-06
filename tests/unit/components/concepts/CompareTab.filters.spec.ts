import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CompareTab from '@/components/concepts/CompareTab.vue'
import ConceptFacetFilters from '@/components/concepts/ConceptFacetFilters.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ComparisonResultItem } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const arrayToCsvMock = vi.fn(() => 'csv')
const downloadCsvMock = vi.fn()
vi.mock('@/utils/csv', () => ({
  arrayToCsv: (rows: unknown[], cols: unknown[]) => arrayToCsvMock(rows, cols),
  downloadCsv: (name: string, csv: string) => downloadCsvMock(name, csv),
}))

vi.mock('@/services/concept-set.service', () => ({
  getConceptSetById: vi.fn(),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({
    getValidVocabularySource: () => 'SRC',
    sources: [] as unknown[],
    isLoadingSources: false,
    fetchSources: vi.fn(),
  })),
}))

const vuetify = createVuetify({ components, directives })

function row(p: Partial<ComparisonResultItem>): ComparisonResultItem {
  return {
    conceptId: 1,
    conceptIn1Only: 0,
    conceptIn2Only: 0,
    conceptIn1And2: 1,
    conceptName: 'Concept',
    conceptCode: 'code',
    conceptClassId: 'Clinical Finding',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    standardConcept: 'S',
    invalidReason: null,
    validStartDate: null,
    validEndDate: null,
    nameMismatch: false,
    ...p,
  }
}

const RESULTS: ComparisonResultItem[] = [
  row({ conceptId: 1, conceptName: 'Diabetes mellitus', vocabularyId: 'SNOMED', domainId: 'Condition', conceptIn1And2: 1 }),
  row({ conceptId: 2, conceptName: 'Metformin', vocabularyId: 'RxNorm', domainId: 'Drug', conceptIn1And2: 0, conceptIn1Only: 1 }),
  row({ conceptId: 3, conceptName: 'Insulin glargine', vocabularyId: 'RxNorm', domainId: 'Drug', conceptIn1And2: 0, conceptIn2Only: 1 }),
]

function mountComponent() {
  return mount(CompareTab, {
    props: { active: false },
    global: {
      plugins: [vuetify],
      provide: { sourceKey: { value: 'SRC' } },
      stubs: { ComparisonVennDiagram: true, ConceptSetChooserDialog: true },
    },
  })
}

function prime() {
  const store = useConceptSetsStore()
  store.currentSet = { id: 1, name: 'CS1', items: [] }
  store.comparisonOtherSet = { id: 2, name: 'CS2', items: [] }
  store.comparison = RESULTS
  return store
}

function tableRows(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'AtlasDataTable' }).props('items') as { conceptId: number }[]
}

describe('CompareTab — result filtering (#157)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    arrayToCsvMock.mockClear()
    downloadCsvMock.mockClear()
  })

  it('hides the filter controls until a comparison has results', async () => {
    const wrapper = mountComponent()
    expect(wrapper.findComponent(ConceptFacetFilters).exists()).toBe(false)
    expect(wrapper.find('[data-testid="compare-search"]').exists()).toBe(false)
  })

  it('shows the facet bar and the within-table search once results exist', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(ConceptFacetFilters).exists()).toBe(true)
    expect(wrapper.find('[data-testid="compare-search"]').exists()).toBe(true)
    expect(tableRows(wrapper)).toHaveLength(3)
  })

  it('offers a Match facet built from the two concept set names', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    const options = wrapper.findComponent(ConceptFacetFilters).props('facetOptions') as
      Record<string, { value: string }[]>
    expect(options.match?.map(o => o.value).sort()).toEqual(['Both', 'CS1', 'CS2'])
  })

  it('filters rows by the Match facet', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptFacetFilters).vm.$emit('update:facet', { key: 'match', values: ['CS1'] })
    await wrapper.vm.$nextTick()

    expect(tableRows(wrapper).map(r => r.conceptId)).toEqual([2])
  })

  it('filters rows by a concept facet such as vocabulary', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptFacetFilters).vm.$emit('update:facet', {
      key: 'vocabularyId',
      values: ['RxNorm'],
    })
    await wrapper.vm.$nextTick()

    expect(tableRows(wrapper).map(r => r.conceptId)).toEqual([2, 3])
  })

  it('narrows rows with the within-table search, case-insensitively', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="compare-search"] input').setValue('metformin')
    await wrapper.vm.$nextTick()

    expect(tableRows(wrapper).map(r => r.conceptId)).toEqual([2])
  })

  it('searches across code, domain and vocabulary as well as name', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="compare-search"] input').setValue('rxnorm')
    await wrapper.vm.$nextTick()

    expect(tableRows(wrapper).map(r => r.conceptId)).toEqual([2, 3])
  })

  it('combines the search with facet selections', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="compare-search"] input').setValue('in')
    wrapper.findComponent(ConceptFacetFilters).vm.$emit('update:facet', { key: 'match', values: ['CS2'] })
    await wrapper.vm.$nextTick()

    expect(tableRows(wrapper).map(r => r.conceptId)).toEqual([3])
  })

  it('scopes facet counts to the current search text', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="compare-search"] input').setValue('metformin')
    await wrapper.vm.$nextTick()

    const options = wrapper.findComponent(ConceptFacetFilters).props('facetOptions') as
      Record<string, { value: string }[]>
    expect(options.vocabularyId?.map(o => o.value)).toEqual(['RxNorm'])
  })

  it('clears every facet when the filter bar emits clear', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    const filters = wrapper.findComponent(ConceptFacetFilters)
    filters.vm.$emit('update:facet', { key: 'match', values: ['CS1'] })
    await wrapper.vm.$nextTick()
    expect(tableRows(wrapper)).toHaveLength(1)

    filters.vm.$emit('clear')
    await wrapper.vm.$nextTick()
    expect(tableRows(wrapper)).toHaveLength(3)
  })

  it('exports only the rows left after filtering', async () => {
    const wrapper = mountComponent()
    prime()
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptFacetFilters).vm.$emit('update:facet', { key: 'match', values: ['CS1'] })
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="compare-export"]').trigger('click')

    const exported = arrayToCsvMock.mock.calls[0]?.[0] as { conceptId: number }[]
    expect(exported.map(r => r.conceptId)).toEqual([2])
  })

  it('resets the search box when a fresh comparison is run', async () => {
    const wrapper = mountComponent()
    const store = prime()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="compare-search"] input').setValue('metformin')
    await wrapper.vm.$nextTick()
    expect(tableRows(wrapper)).toHaveLength(1)

    store.comparison = [...RESULTS]
    await wrapper.vm.$nextTick()

    expect(tableRows(wrapper)).toHaveLength(3)
  })
})
