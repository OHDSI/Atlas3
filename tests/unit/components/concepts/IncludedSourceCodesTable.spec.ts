import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import IncludedSourceCodesTable from '@/components/concepts/IncludedSourceCodesTable.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (_k: string, fallback: string) => ({ value: fallback }) }),
}))

const stubs = {
  AtlasAlert: { template: '<div class="stub-alert"><slot /></div>' },
  AtlasButton: { template: '<button><slot /></button>' },
  AtlasCard: { template: '<div class="stub-card"><slot /></div>' },
  AtlasChip: { template: '<span class="stub-chip"><slot /></span>' },
  AtlasDataTable: {
    name: 'AtlasDataTable',
    // multiSort is typed so the bare `multi-sort` attribute coerces to true,
    // the way v-data-table's own Boolean prop does.
    props: {
      items: { type: Array, default: () => [] },
      loading: Boolean,
      itemsPerPage: Number,
      multiSort: Boolean,
      sortBy: { type: Array, default: () => [] },
    },
    template: '<table class="stub-table"><tbody><tr v-for="i in items" :key="i.conceptId"><td>{{ i.conceptName }}</td></tr></tbody><tfoot v-if="items.length === 0"><slot name="no-data" /></tfoot></table>',
  },
  ConceptFacetFilters: {
    name: 'ConceptFacetFilters',
    props: ['facets', 'facetOptions', 'selected', 'activeFilterCount', 'resultFilter'],
    emits: ['update:facet', 'update:resultFilter', 'clear'],
    template: '<div class="stub-facets" />',
  },
  AtlasIcon: { template: '<i />' },
  AtlasSkeleton: { template: '<div class="stub-skeleton" />' },
}

function makeWrapper(props: Record<string, unknown> = {}) {
  return mount(IncludedSourceCodesTable, {
    props: { active: true, sourceKey: 'SYNPUF1K', ...props },
    global: { stubs },
  })
}

describe('IncludedSourceCodesTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Prevent the watcher from calling the real resolveSourceCodes, which would
    // reset sourceCodeItems/sourceCodeError when includedItems is empty.
    vi.spyOn(useConceptSetsStore(), 'resolveSourceCodes').mockResolvedValue()
  })

  it('renders rows for the store source-code items', () => {
    const store = useConceptSetsStore()
    store.sourceCodeItems = [
      {
        conceptId: 45542738,
        conceptName: 'Type 2 diabetes mellitus',
        conceptCode: 'E11.9',
        domainId: 'Condition',
        vocabularyId: 'ICD10CM',
        conceptClassId: 'ICD10 code',
        standardConcept: null,
        invalidReason: null,
      },
    ]
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('Type 2 diabetes mellitus')
  })

  it('shows the empty state when there are no source codes', () => {
    const store = useConceptSetsStore()
    store.sourceCodeItems = []
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('Add concepts')
  })

  it('triggers resolveSourceCodes when activated', async () => {
    const store = useConceptSetsStore()
    const spy = vi.spyOn(store, 'resolveSourceCodes').mockResolvedValue()
    makeWrapper({ active: false })
    expect(spy).not.toHaveBeenCalled()

    const wrapper = makeWrapper({ active: true })
    await wrapper.vm.$nextTick()
    expect(spy).toHaveBeenCalledWith('SYNPUF1K')
  })

  it('renders an error alert with a retry button', () => {
    const store = useConceptSetsStore()
    store.sourceCodeError = 'Network error'
    const wrapper = makeWrapper()
    expect(wrapper.find('.stub-alert').exists()).toBe(true)
  })
})

describe('IncludedSourceCodesTable — filtering and pagination (issue #266)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(useConceptSetsStore(), 'resolveSourceCodes').mockResolvedValue()
  })

  const code = (id: number, over: Record<string, unknown> = {}) => ({
    conceptId: id,
    conceptName: `Code ${id}`,
    conceptCode: `C${id}`,
    domainId: 'Condition',
    vocabularyId: 'ICD10CM',
    conceptClassId: 'ICD10 code',
    standardConcept: null,
    invalidReason: null,
    ...over,
  })

  function seed(items: ReturnType<typeof code>[]) {
    const store = useConceptSetsStore()
    store.sourceCodeItems = items as never
    return store
  }

  const facetBar = (wrapper: ReturnType<typeof makeWrapper>) =>
    wrapper.findComponent({ name: 'ConceptFacetFilters' })

  it('offers facets for the categorical columns this table shows', () => {
    seed([code(1)])
    const keys = (facetBar(makeWrapper()).props('facets') as { key: string }[]).map(f => f.key)

    expect(keys).toEqual(expect.arrayContaining(['conceptClassId', 'domainId', 'vocabularyId']))
    // Standard and validity are not columns on the source-codes table.
    expect(keys).not.toContain('standardConcept')
    expect(keys).not.toContain('invalidReason')
  })

  it('narrows the rows to a selected facet value', async () => {
    seed([code(1, { vocabularyId: 'ICD10CM' }), code(2, { vocabularyId: 'READ' })])
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('Code 2')

    facetBar(wrapper).vm.$emit('update:facet', { key: 'vocabularyId', values: ['ICD10CM'] })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Code 1')
    expect(wrapper.text()).not.toContain('Code 2')
  })

  it('matches the free-text filter on a substring', async () => {
    seed([code(1, { conceptName: 'Diabetes mellitus' }), code(2, { conceptName: 'Hypertension' })])
    const wrapper = makeWrapper()

    facetBar(wrapper).vm.$emit('update:resultFilter', 'betes')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Diabetes mellitus')
    expect(wrapper.text()).not.toContain('Hypertension')
  })

  it('drops stale filters when the included set changes', async () => {
    const store = seed([code(1, { vocabularyId: 'ICD10CM' })])
    const wrapper = makeWrapper()

    facetBar(wrapper).vm.$emit('update:facet', { key: 'vocabularyId', values: ['ICD10CM'] })
    await wrapper.vm.$nextTick()
    expect(facetBar(wrapper).props('activeFilterCount')).toBe(1)

    // A different included set resolves to a different value space; keeping the
    // old selection would hide every row the new resolve produced.
    store.includedItems = [{ conceptId: 99 }] as never
    await wrapper.vm.$nextTick()

    expect(facetBar(wrapper).props('activeFilterCount')).toBe(0)
  })

  it('lets the table own the page size so the rows-per-page control is live', async () => {
    seed([code(1)])
    const wrapper = makeWrapper()
    const table = wrapper.findComponent({ name: 'AtlasDataTable' })

    expect(table.props('itemsPerPage')).toBe(50)

    table.vm.$emit('update:itemsPerPage', 25)
    await wrapper.vm.$nextTick()
    expect(table.props('itemsPerPage')).toBe(25)
  })

  it('enables multi-column sort', () => {
    seed([code(1)])
    expect(
      makeWrapper().findComponent({ name: 'AtlasDataTable' }).props('multiSort')
    ).toBe(true)
  })

  it('offers a way back when the filters match nothing', async () => {
    seed([code(1)])
    const wrapper = makeWrapper()

    facetBar(wrapper).vm.$emit('update:resultFilter', 'no-such-code')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/No concepts match the active filters/i)

    await wrapper.find('[data-testid="source-codes-clear-filters-btn"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Code 1')
  })
})
