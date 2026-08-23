import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import IncludedConceptsTable from '@/components/concepts/IncludedConceptsTable.vue'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (_k: string, fallback?: string) => ({ value: fallback ?? _k }) }),
}))

const vuetify = createVuetify({ components, directives })

function makeConcept(id: number, overrides: Partial<Concept> = {}): Concept {
  return {
    conceptId: id,
    conceptName: `Concept ${id}`,
    conceptCode: `${id}`,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    ...overrides,
  }
}

describe('IncludedConceptsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('renders rows from items prop', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [makeConcept(1), makeConcept(2)],
        loading: false,
        error: null,
        manualCount: 1,
        sourceKey: 'SYNPUF1K',
      },
    })
    expect(wrapper.text()).toContain('Concept 1')
    expect(wrapper.text()).toContain('Concept 2')
  })

  it('renders the "empty manual" copy when manualCount === 0', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: { items: [], loading: false, error: null, manualCount: 0 },
    })
    expect(wrapper.text()).toMatch(/Add concepts on the Selected tab/i)
  })

  it('renders the "no resolved concepts" copy when manualCount > 0 and items is empty', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: { items: [], loading: false, error: null, manualCount: 3 },
    })
    expect(wrapper.text()).toMatch(/No concepts resolved/i)
  })

  it('renders error alert and emits retry on click', async () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [],
        loading: false,
        error: 'HTTP 500: boom',
        manualCount: 2,
      },
    })
    expect(wrapper.text()).toMatch(/boom/i)
    await wrapper.get('[data-testid="included-retry-btn"]').trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('emits view-concept when a concept name is clicked', async () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [makeConcept(42)],
        loading: false,
        error: null,
        manualCount: 1,
        sourceKey: 'SYNPUF1K',
      },
    })
    await wrapper.get('[data-testid="included-name-link-42"]').trigger('click')
    expect(wrapper.emitted('view-concept')).toEqual([
      [{ conceptId: 42, sourceKey: 'SYNPUF1K' }],
    ])
  })

  it('renders the concept name as plain text (no link) when sourceKey is undefined', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [makeConcept(7)],
        loading: false,
        error: null,
        manualCount: 1,
      },
    })
    expect(wrapper.find('[data-testid="included-name-link-7"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Concept 7')
  })

  it('does not render any descendants/mapped/exclude checkbox columns', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [makeConcept(1)],
        loading: false,
        error: null,
        manualCount: 1,
      },
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
  })
})

describe('IncludedConceptsTable — filtering, sorting and pagination (issue #266)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  const mixedItems = [
    makeConcept(1, { conceptName: 'Type 2 diabetes mellitus', vocabularyId: 'SNOMED' }),
    makeConcept(2, { conceptName: 'Essential hypertension', vocabularyId: 'SNOMED' }),
    makeConcept(3, {
      conceptName: 'Metformin 500 MG',
      vocabularyId: 'RxNorm',
      domainId: 'Drug',
    }),
  ]

  function mountWith(items = mixedItems) {
    return mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: { items, loading: false, error: null, manualCount: items.length, sourceKey: 'SYNPUF1K' },
    })
  }

  function facetBar(wrapper: ReturnType<typeof mountWith>) {
    return wrapper.findComponent({ name: 'ConceptFacetFilters' })
  }

  it('offers a facet per categorical column the table shows, and no others', () => {
    const keys = (facetBar(mountWith()).props('facets') as { key: string }[]).map(f => f.key)

    // Vocabulary, Domain, Standard and Validity are all rendered as columns.
    expect(keys).toEqual(
      expect.arrayContaining(['vocabularyId', 'domainId', 'standardConcept', 'invalidReason'])
    )
    // Concept class is not a column here, so filtering by it would be a filter
    // over something the user cannot see.
    expect(keys).not.toContain('conceptClassId')
  })

  it('counts each facet option against the rows actually present', () => {
    const options = facetBar(mountWith()).props('facetOptions') as Record<
      string,
      { value: string; count: number }[]
    >
    const vocab = Object.fromEntries(options.vocabularyId.map(o => [o.value, o.count]))
    expect(vocab).toEqual({ SNOMED: 2, RxNorm: 1 })
  })

  it('narrows the rows to a selected facet value', async () => {
    const wrapper = mountWith()
    expect(wrapper.text()).toContain('Metformin 500 MG')

    facetBar(wrapper).vm.$emit('update:facet', { key: 'vocabularyId', values: ['RxNorm'] })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Metformin 500 MG')
    expect(wrapper.text()).not.toContain('Type 2 diabetes mellitus')
    expect(wrapper.text()).not.toContain('Essential hypertension')
  })

  it('matches the free-text filter on a substring, not just a prefix', async () => {
    const wrapper = mountWith()

    facetBar(wrapper).vm.$emit('update:resultFilter', 'diabetes')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Type 2 diabetes mellitus')
    expect(wrapper.text()).not.toContain('Metformin 500 MG')
  })

  it('offers a way back when the filters match nothing', async () => {
    const wrapper = mountWith()

    facetBar(wrapper).vm.$emit('update:resultFilter', 'no-such-concept')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/No concepts match the active filters/i)

    await wrapper.find('[data-testid="included-clear-filters-btn"]').trigger('click')
    await wrapper.vm.$nextTick()

    // Clearing restores every row rather than leaving the user stuck.
    expect(wrapper.text()).toContain('Type 2 diabetes mellitus')
    expect(wrapper.text()).toContain('Metformin 500 MG')
  })

  it('keeps the filter bar visible while nothing matches, so filters can be undone', async () => {
    const wrapper = mountWith()
    facetBar(wrapper).vm.$emit('update:resultFilter', 'no-such-concept')
    await wrapper.vm.$nextTick()
    expect(facetBar(wrapper).exists()).toBe(true)
  })

  it('hides the filter bar when there is nothing to filter', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: { items: [], loading: false, error: null, manualCount: 2 },
    })
    expect(facetBar(wrapper).exists()).toBe(false)
  })

  it('lets the table own the page size so the rows-per-page control is live', async () => {
    const wrapper = mountWith()
    const table = wrapper.findComponent({ name: 'AtlasDataTable' })

    // The default the table opens on.
    expect(table.props('itemsPerPage')).toBe(50)

    // A choice made in the footer is written back rather than discarded, which
    // is what the bare `:items-per-page="50"` binding failed to do.
    table.vm.$emit('update:itemsPerPage', 10)
    await wrapper.vm.$nextTick()
    expect(table.props('itemsPerPage')).toBe(10)
  })

  it('enables multi-column sort on the underlying data table', () => {
    // AtlasDataTable forwards unknown attributes to v-data-table, so the
    // contract worth pinning is what the data table itself ends up with.
    const dataTable = mountWith().findComponent({ name: 'VDataTable' })
    expect(dataTable.props('multiSort')).toBe(true)
  })

  it('keeps a multi-column sort order applied to the rows', async () => {
    const wrapper = mountWith([
      makeConcept(3, { conceptName: 'B second', vocabularyId: 'RxNorm' }),
      makeConcept(1, { conceptName: 'A first', vocabularyId: 'SNOMED' }),
      makeConcept(2, { conceptName: 'A first', vocabularyId: 'RxNorm' }),
    ])
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })

    dataTable.vm.$emit('update:sortBy', [
      { key: 'conceptName', order: 'asc' },
      { key: 'conceptId', order: 'desc' },
    ])
    await wrapper.vm.$nextTick()

    // Both columns survive: name ascending, then id descending within a tie.
    expect(dataTable.props('sortBy')).toEqual([
      { key: 'conceptName', order: 'asc' },
      { key: 'conceptId', order: 'desc' },
    ])
  })
})
