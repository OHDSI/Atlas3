import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ConceptRelatedTable from '@/components/concepts/detail/ConceptRelatedTable.vue'
import ConceptFacetFilters from '@/components/concepts/ConceptFacetFilters.vue'
import { useWebAPIStore } from '@/stores/webapi'
import { useConceptTablePreferencesStore } from '@/stores/concept-table-preferences'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import type { RelatedConcept } from '@/models/concept-detail.types'

vi.mock('@/services/concept-search.service', () => ({
  getConceptRecordCounts: vi.fn(),
}))

const related: RelatedConcept[] = [
  {
    conceptId: 73211009,
    conceptName: 'Diabetes mellitus',
    conceptCode: '73211009',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    relationships: [{ relationshipName: 'Is a', relationshipDistance: 1 }],
  },
  {
    conceptId: 1234,
    conceptName: 'Diabetes type II',
    conceptCode: 'E11.9',
    domainId: 'Condition',
    vocabularyId: 'ICD10CM',
    conceptClassId: '3-char billing code',
    standardConcept: null,
    invalidReason: null,
    relationships: [{ relationshipName: 'Mapped from', relationshipDistance: 1 }],
  },
]

describe('ConceptRelatedTable', () => {
  beforeEach(() => {
    // Pinia is required by useI18n() inside the component tree.
    setActivePinia(createPinia())
    vi.mocked(getConceptRecordCounts).mockReset().mockResolvedValue(new Map())
  })

  it('renders one row per related concept with relationship name and vocabulary', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })

    const wrapper = mount(ConceptRelatedTable, {
      props: { related },
      global: { plugins: [vuetify, router] },
    })

    const text = wrapper.text()
    expect(text).toContain('Diabetes mellitus')
    expect(text).toContain('Diabetes type II')
    expect(text).toContain('Is a')
    expect(text).toContain('Mapped from')
    expect(text).toContain('ICD10CM')
  })

  it('shows empty state when no related concepts', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related: [] },
      global: { plugins: [vuetify, router] },
    })
    expect(wrapper.text()).toMatch(/no related concepts/i)
  })

  it('offers relationship, vocabulary, domain, and standard facets', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related },
      global: { plugins: [vuetify, router] },
    })

    const filters = wrapper.findComponent(ConceptFacetFilters)
    expect(filters.props('facets').map(facet => facet.key)).toEqual([
      'relationship',
      'vocabularyId',
      'domainId',
      'standardConcept',
    ])

    const options = filters.props('facetOptions') as Record<string, Array<{ value: string }>>
    expect(options.relationship.map(option => option.value)).toEqual(['Is a', 'Mapped from'])
    expect(options.vocabularyId.map(option => option.value)).toEqual(['ICD10CM', 'SNOMED'])
    expect(options.domainId.map(option => option.value)).toEqual(['Condition'])
    expect(options.standardConcept.map(option => option.value)).toEqual(['Non-Standard', 'Standard'])
  })

  it('filters related rows by concept name, code, ID, and selected facets', async () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related },
      global: { plugins: [vuetify, router] },
    })
    const filters = wrapper.findComponent(ConceptFacetFilters)

    filters.vm.$emit('update:resultFilter', 'E11')
    await nextTick()
    expect(wrapper.text()).toContain('Diabetes type II')
    expect(wrapper.text()).not.toContain('Diabetes mellitus')

    filters.vm.$emit('update:resultFilter', '1234')
    await nextTick()
    expect(wrapper.text()).toContain('Diabetes type II')

    filters.vm.$emit('update:resultFilter', '')
    filters.vm.$emit('update:facet', { key: 'relationship', values: ['Is a'] })
    await nextTick()
    expect(wrapper.text()).toContain('Diabetes mellitus')
    expect(wrapper.text()).not.toContain('Diabetes type II')
  })

  it('loads unique related concept counts from the selected results source', async () => {
    useWebAPIStore().sources = [
      { sourceKey: 'RES', sourceName: 'Results', daimons: [{ daimonType: 'Results' }] },
    ] as never
    vi.mocked(getConceptRecordCounts).mockResolvedValue(
      new Map([
        [73211009, { recordCount: 1111, descendantRecordCount: 2222, personCount: 0, descendantPersonCount: 0 }],
        [1234, { recordCount: 3333, descendantRecordCount: 4444, personCount: 0, descendantPersonCount: 0 }],
      ])
    )
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related },
      global: { plugins: [vuetify, router] },
    })

    wrapper
      .findComponent('[data-testid="related-record-count-source"]')
      .vm.$emit('update:modelValue', 'RES')
    await flushPromises()

    expect(getConceptRecordCounts).toHaveBeenLastCalledWith('RES', [73211009, 1234])
    for (const count of ['1111', '2222', '3333', '4444']) {
      expect(wrapper.text().replace(/[\s,]/g, '')).toContain(count)
    }
  })

  it('hides validity and person counts by default and shows them when chosen in Columns', async () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related },
      global: { plugins: [vuetify, router] },
    })
    const headerKeys = () =>
      (wrapper.findComponent({ name: 'VDataTable' }).props('headers') as Array<{ key: string }>).map(h => h.key)

    expect(wrapper.find('[data-testid="concept-search-columns"]').exists()).toBe(true)
    expect(headerKeys()).toEqual([
      'select',
      'relationship',
      'conceptName',
      'vocabularyId',
      'conceptCode',
      'domainId',
      'conceptClassId',
      'standardConcept',
      'recordCount',
      'descendantRecordCount',
    ])

    const prefs = useConceptTablePreferencesStore()
    prefs.setColumnVisibility('invalidReason', true)
    prefs.setColumnVisibility('personCount', true)
    prefs.setColumnVisibility('descendantPersonCount', true)
    prefs.setColumnVisibility('vocabularyId', false)
    await nextTick()

    expect(headerKeys()).toEqual(expect.arrayContaining(['invalidReason', 'personCount', 'descendantPersonCount']))
    expect(headerKeys()).not.toContain('vocabularyId')
    expect(headerKeys().slice(0, 3)).toEqual(['select', 'relationship', 'conceptName'])
  })

  it('renders validity and person count cells once those columns are shown', async () => {
    useWebAPIStore().sources = [
      { sourceKey: 'RES', sourceName: 'Results', daimons: [{ daimonType: 'Results' }] },
    ] as never
    useWebAPIStore().setResultsSource('RES')
    let resolveCounts!: (m: Map<number, unknown>) => void
    vi.mocked(getConceptRecordCounts).mockReturnValue(new Promise(r => (resolveCounts = r)) as never)
    const prefs = useConceptTablePreferencesStore()
    prefs.setColumnVisibility('invalidReason', true)
    prefs.setColumnVisibility('personCount', true)
    prefs.setColumnVisibility('descendantPersonCount', true)
    const withInvalid: RelatedConcept[] = [related[0]!, { ...related[1]!, invalidReason: 'D' }]
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related: withInvalid },
      global: { plugins: [vuetify, router] },
    })
    await flushPromises()

    // Counts still loading: each person-count cell shows a spinner.
    expect(wrapper.findAll('.count .v-progress-circular').length).toBeGreaterThanOrEqual(4)

    resolveCounts(
      new Map([
        [73211009, { recordCount: 1, descendantRecordCount: 2, personCount: 5555, descendantPersonCount: 6666 }],
        [1234, { recordCount: 3, descendantRecordCount: 4, personCount: 7777, descendantPersonCount: 8888 }],
      ])
    )
    await flushPromises()

    expect(wrapper.findAll('.count .v-progress-circular')).toHaveLength(0)
    const text = wrapper.text().replace(/[\s,]/g, '')
    for (const count of ['5555', '6666', '7777', '8888']) expect(text).toContain(count)
    const chips = wrapper.findAll('.v-chip').map(c => c.classes().join(' '))
    expect(chips.some(c => c.includes('text-error'))).toBe(true)
    expect(chips.some(c => c.includes('text-success'))).toBe(true)
  })

  it('clears the text filter and facets from the filter bar', async () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related },
      global: { plugins: [vuetify, router] },
    })
    const filters = wrapper.findComponent(ConceptFacetFilters)
    filters.vm.$emit('update:resultFilter', 'E11')
    await nextTick()
    expect(wrapper.text()).not.toContain('Diabetes mellitus')

    filters.vm.$emit('clear')
    await nextTick()

    expect(wrapper.text()).toContain('Diabetes mellitus')
    expect(wrapper.text()).toContain('Diabetes type II')
  })

  it('sorts by descendant record count descending by default and requires a direction', async () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related },
      global: { plugins: [vuetify, router] },
    })
    const table = wrapper.findComponent({ name: 'VDataTable' })

    expect(table.props('sortBy')).toEqual([{ key: 'descendantRecordCount', order: 'desc' }])
    expect(table.props('mustSort')).toBe(true)

    table.vm.$emit('update:sortBy', [{ key: 'descendantRecordCount', order: 'asc' }])
    await nextTick()
    expect(table.props('sortBy')).toEqual([{ key: 'descendantRecordCount', order: 'asc' }])
  })
})
