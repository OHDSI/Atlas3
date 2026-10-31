import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CompareTab from '@/components/concepts/CompareTab.vue'
import ComparisonVennDiagram from '@/components/concepts/ComparisonVennDiagram.vue'
import ConceptSetChooserDialog from '@/components/concepts/ConceptSetChooserDialog.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ComparisonResultItem } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const arrayToCsvMock = vi.fn((_rows: unknown[], _cols: unknown[]) => 'csv')
const downloadCsvMock = vi.fn()
vi.mock('@/utils/csv', () => ({
  arrayToCsv: (rows: unknown[], cols: unknown[]) => arrayToCsvMock(rows, cols),
  downloadCsv: (name: string, csv: string) => downloadCsvMock(name, csv),
}))

const getConceptSetByIdMock = vi.fn()
vi.mock('@/services/concept-set.service', () => ({
  getConceptSetById: (...args: unknown[]) => getConceptSetByIdMock(...args),
}))

const webapiStub = {
  vocabularySource: '',
  getValidVocabularySource: () => webapiStub.vocabularySource,
  sources: [] as unknown[],
  isLoadingSources: false,
  fetchSources: vi.fn(),
}
vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => webapiStub),
}))

const vuetify = createVuetify({ components, directives })

function row(p: Partial<ComparisonResultItem>): ComparisonResultItem {
  return {
    conceptId: 1,
    conceptIn1Only: 0,
    conceptIn2Only: 0,
    conceptIn1And2: 0,
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
  row({ conceptId: 1, conceptIn1And2: 1 }),
  row({ conceptId: 2, conceptIn1And2: 1 }),
  row({ conceptId: 3, conceptIn1And2: 1 }),
  row({ conceptId: 4, conceptIn1Only: 1 }),
  row({ conceptId: 5, conceptIn1Only: 1 }),
  row({ conceptId: 6, conceptIn2Only: 1 }),
]

const ITEM = {
  conceptId: 1,
  conceptName: 'C1',
  conceptCode: 'c1',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'x',
  standardConcept: 'S',
  invalidReason: null,
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
}

interface MountOptions {
  active?: boolean
  provideKey?: boolean
}

function mountTab({ active = false, provideKey = true }: MountOptions = {}) {
  return mount(CompareTab, {
    props: { active },
    global: {
      plugins: [vuetify],
      provide: provideKey ? { sourceKey: { value: 'SRC' } } : {},
      stubs: { ComparisonVennDiagram: true, ConceptSetChooserDialog: true },
    },
  })
}

function primeSets(leftName = 'Alpha Set', rightName = 'Beta Set') {
  const store = useConceptSetsStore()
  store.currentSet = { id: 1, name: leftName, items: [ITEM] } as never
  store.comparisonOtherSet = { id: 2, name: rightName, items: [] } as never
  return store
}

function runButton(wrapper: VueWrapper) {
  return wrapper.find('[data-testid="compare-run"]')
}

type Vm = {
  onCompare: () => void
  onExport: () => void
  onOtherSelected: (id: number) => void
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  webapiStub.vocabularySource = ''
  webapiStub.sources = []
  webapiStub.isLoadingSources = false
})

describe('CompareTab source loading', () => {
  it('does not fetch sources while inactive', () => {
    mountTab({ active: false })
    expect(webapiStub.fetchSources).not.toHaveBeenCalled()
  })

  it('does not fetch sources when they are already loaded', () => {
    webapiStub.sources = [{ sourceKey: 'X' }]
    mountTab({ active: true })
    expect(webapiStub.fetchSources).not.toHaveBeenCalled()
  })

  it('does not fetch sources while they are loading', () => {
    webapiStub.isLoadingSources = true
    mountTab({ active: true })
    expect(webapiStub.fetchSources).not.toHaveBeenCalled()
  })

  it('fetches sources once activated later', async () => {
    const wrapper = mountTab({ active: false })
    await wrapper.setProps({ active: true })
    expect(webapiStub.fetchSources).toHaveBeenCalledTimes(1)
  })
})

describe('CompareTab compare availability', () => {
  it('enables Compare when both sets and a source key exist', async () => {
    const wrapper = mountTab()
    primeSets()
    await wrapper.vm.$nextTick()
    expect(runButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('prefers the valid vocabulary source over the injected key', async () => {
    webapiStub.vocabularySource = 'VOCAB'
    const wrapper = mountTab()
    const store = primeSets()
    const load = vi.spyOn(store, 'loadComparisonForMode').mockResolvedValue()
    await wrapper.vm.$nextTick()
    await runButton(wrapper).trigger('click')
    expect(load).toHaveBeenCalledWith('VOCAB', 2, store.comparisonMode)
  })

  it('disables Compare without any source key', async () => {
    const wrapper = mountTab({ provideKey: false })
    primeSets()
    await wrapper.vm.$nextTick()
    expect(runButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('disables Compare and shows the hint when the current set has no items', async () => {
    const wrapper = mountTab()
    const store = primeSets()
    store.currentSet!.items = []
    await wrapper.vm.$nextTick()
    expect(runButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="compare-no-current"]').exists()).toBe(true)
  })

  it('hides the hint once the current set has items', async () => {
    const wrapper = mountTab()
    primeSets()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="compare-no-current"]').exists()).toBe(false)
  })

  it('disables Compare without a second set', async () => {
    const wrapper = mountTab()
    const store = primeSets()
    store.comparisonOtherSet = null
    await wrapper.vm.$nextTick()
    expect(runButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('disables Compare when the current set is unsaved', async () => {
    const wrapper = mountTab()
    const store = primeSets()
    store.currentSet = { name: 'Unsaved', items: [ITEM] } as never
    await wrapper.vm.$nextTick()
    expect(runButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('onCompare does nothing when comparison is not possible', async () => {
    const wrapper = mountTab()
    const store = primeSets()
    store.currentSet!.items = []
    const clear = vi.spyOn(store, 'clearComparisonCache')
    const load = vi.spyOn(store, 'loadComparisonForMode').mockResolvedValue()
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as Vm).onCompare()
    expect(clear).not.toHaveBeenCalled()
    expect(load).not.toHaveBeenCalled()
  })

  it('switching mode when comparison is not possible only records the mode', async () => {
    const wrapper = mountTab()
    const store = primeSets()
    store.currentSet!.items = []
    const load = vi.spyOn(store, 'loadComparisonForMode').mockResolvedValue()
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="mode-expression"]').trigger('click')
    expect(store.comparisonMode).toBe('expression')
    expect(load).not.toHaveBeenCalled()
  })
})

describe('CompareTab chooser', () => {
  it('opens the chooser only when asked', async () => {
    const wrapper = mountTab()
    const chooser = wrapper.findComponent(ConceptSetChooserDialog)
    expect(chooser.props('modelValue')).toBe(false)
    await wrapper.find('[data-testid="compare-pick-other"]').trigger('click')
    expect(chooser.props('modelValue')).toBe(true)
  })

  it('clears results, shows loading and requests the set with rethrow', async () => {
    const wrapper = mountTab()
    const store = primeSets()
    store.comparison = [...RESULTS]
    let resolve: (v: unknown) => void = () => {}
    getConceptSetByIdMock.mockReturnValueOnce(new Promise(r => { resolve = r }))
    ;(wrapper.vm as unknown as Vm).onOtherSelected(9)
    expect(store.comparison).toEqual([])
    expect(store.loadingComparison).toBe(true)
    await flushPromises()
    expect(getConceptSetByIdMock).toHaveBeenCalledWith(9, { rethrow: true })
    resolve({ id: 9, name: 'Nine', items: [] })
    await flushPromises()
    expect(store.comparisonOtherSet).toMatchObject({ id: 9 })
    expect(store.loadingComparison).toBe(false)
  })

  it('keeps the previous second set when the lookup returns nothing', async () => {
    const wrapper = mountTab()
    const store = primeSets()
    getConceptSetByIdMock.mockResolvedValueOnce(null)
    ;(wrapper.vm as unknown as Vm).onOtherSelected(9)
    await flushPromises()
    expect(store.comparisonOtherSet).toMatchObject({ id: 2 })
  })
})

describe('CompareTab results', () => {
  function primeResults(leftName = 'Alpha Set', rightName = 'Beta Set') {
    const store = primeSets(leftName, rightName)
    store.comparison = [...RESULTS]
    return store
  }

  it('passes counts and set names to the Venn diagram', async () => {
    const wrapper = mountTab()
    primeResults()
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ComparisonVennDiagram).props()).toMatchObject({
      leftOnly: 2,
      rightOnly: 1,
      both: 3,
      leftLabel: 'Alpha Set',
      rightLabel: 'Beta Set',
    })
  })

  it('falls back to CS1 / CS2 labels for unnamed sets', async () => {
    const wrapper = mountTab()
    primeResults('', '')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ComparisonVennDiagram).props()).toMatchObject({
      leftLabel: 'CS1',
      rightLabel: 'CS2',
    })
  })

  it('falls back to CS1 / CS2 labels with no sets loaded', async () => {
    const wrapper = mountTab()
    const store = useConceptSetsStore()
    store.comparison = [...RESULTS]
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ComparisonVennDiagram).props()).toMatchObject({
      leftLabel: 'CS1',
      rightLabel: 'CS2',
    })
  })

  it('shows every row when results exist before mounting', async () => {
    primeResults()
    const wrapper = mountTab()
    await wrapper.vm.$nextTick()
    const items = wrapper.findComponent({ name: 'AtlasDataTable' }).props('items') as unknown[]
    expect(items).toHaveLength(RESULTS.length)
  })

  it('defines the result table columns', async () => {
    const wrapper = mountTab()
    primeResults()
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'AtlasDataTable' }).props('headers')).toEqual([
      { title: 'Match', key: 'match', sortable: true, width: '120px' },
      { title: 'Concept Id', key: 'conceptId', sortable: true, width: '110px' },
      { title: 'Concept Code', key: 'conceptCode', sortable: true, width: '130px' },
      { title: 'Concept Name', key: 'conceptName', sortable: true },
      { title: 'Domain', key: 'domainId', sortable: true, width: '120px' },
      { title: 'Vocabulary', key: 'vocabularyId', sortable: true, width: '120px' },
      { title: 'Class', key: 'conceptClassId', sortable: true, width: '140px' },
    ])
  })

  it('colors match chips by which set holds the concept', async () => {
    const wrapper = mountTab()
    const store = primeSets()
    store.comparison = [
      row({ conceptId: 1, conceptIn1And2: 1 }),
      row({ conceptId: 2, conceptIn1Only: 1 }),
      row({ conceptId: 3, conceptIn2Only: 1 }),
    ]
    await wrapper.vm.$nextTick()
    const table = wrapper.findComponent({ name: 'AtlasDataTable' })
    const chips = table.findAllComponents({ name: 'AtlasChip' })
    expect(chips.map(c => [c.text(), c.props('tone')])).toEqual([
      ['Both', 'success'],
      ['Alpha Set', 'primary'],
      ['Beta Set', 'info'],
    ])
  })
})

describe('CompareTab export', () => {
  it('does nothing without visible rows', async () => {
    const wrapper = mountTab()
    primeSets()
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as Vm).onExport()
    expect(arrayToCsvMock).not.toHaveBeenCalled()
    expect(downloadCsvMock).not.toHaveBeenCalled()
  })

  it('exports the fixed CSV columns under a filename built from both set names', async () => {
    const wrapper = mountTab()
    const store = primeSets('My  Big Set', 'Other\tSet')
    store.comparisonMode = 'included'
    store.comparison = [...RESULTS]
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="compare-export"]').trigger('click')
    expect(arrayToCsvMock.mock.calls[0][1]).toEqual([
      { key: 'match', label: 'Match' },
      { key: 'conceptId', label: 'Concept Id' },
      { key: 'conceptCode', label: 'Concept Code' },
      { key: 'conceptName', label: 'Concept Name' },
      { key: 'domainId', label: 'Domain' },
      { key: 'vocabularyId', label: 'Vocabulary' },
      { key: 'conceptClassId', label: 'Class' },
      { key: 'standardConcept', label: 'Standard' },
      { key: 'invalidReason', label: 'Invalid Reason' },
    ])
    expect(downloadCsvMock).toHaveBeenCalledWith('compare_included_My_Big_Set_vs_Other_Set.csv', 'csv')
  })

  it('uses cs1 / cs2 in the filename when no sets are loaded', async () => {
    const wrapper = mountTab()
    const store = useConceptSetsStore()
    store.comparisonMode = 'expression'
    store.comparison = [...RESULTS]
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="compare-export"]').trigger('click')
    expect(downloadCsvMock).toHaveBeenCalledWith('compare_expression_cs1_vs_cs2.csv', 'csv')
  })
})
