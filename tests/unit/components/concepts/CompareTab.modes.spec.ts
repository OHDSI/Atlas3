import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CompareTab from '@/components/concepts/CompareTab.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const downloadCsvMock = vi.fn()
vi.mock('@/utils/csv', () => ({
  arrayToCsv: vi.fn(() => 'csv'),
  downloadCsv: (name: string, csv: string) => downloadCsvMock(name, csv),
}))

const getConceptSetByIdMock = vi.fn()
vi.mock('@/services/concept-set.service', () => ({
  getConceptSetById: (id: number | string) => getConceptSetByIdMock(id),
}))

const fetchSourcesMock = vi.fn()
const webapiStub = {
  getValidVocabularySource: () => '',
  sources: [] as unknown[],
  isLoadingSources: false,
  fetchSources: fetchSourcesMock,
}
vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => webapiStub),
}))

const vuetify = createVuetify({ components, directives })

function mountComponent() {
  setActivePinia(createPinia())
  const wrapper = mount(CompareTab, {
    props: { active: false },
    global: {
      plugins: [vuetify],
      provide: { sourceKey: { value: 'SRC' } },
      stubs: {
        ComparisonVennDiagram: true,
        ConceptSetChooserDialog: true,
      },
    },
  })
  return wrapper
}

function primeComparable() {
  const store = useConceptSetsStore()
  store.currentSet = { id: 1, name: 'CS1', items: [
    { conceptId: 1, conceptName: 'C1', conceptCode: 'c1', domainId: 'Condition', vocabularyId: 'SNOMED', conceptClassId: 'x', standardConcept: 'S', invalidReason: null, isExcluded: false, includeDescendants: false, includeMapped: false },
  ] }
  store.comparisonOtherSet = { id: 2, name: 'CS2', items: [] }
  store.comparison = [
    { conceptId: 1, conceptIn1Only: 1, conceptIn2Only: 0, conceptIn1And2: 0, conceptName: 'C1', conceptCode: 'c1', conceptClassId: 'x', domainId: 'Condition', vocabularyId: 'SNOMED', standardConcept: 'S', invalidReason: null, validStartDate: null, validEndDate: null, nameMismatch: false },
  ]
  return store
}

describe('CompareTab — mode toggle (#102)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders Expression / Included mode buttons and hides Source for now', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="mode-expression"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-included"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-source"]').exists()).toBe(false)
  })

  it('switching to Expression calls loadComparisonForMode with expression', async () => {
    const wrapper = mountComponent()
    const store = primeComparable()
    const spy = vi.spyOn(store, 'loadComparisonForMode').mockResolvedValue()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="mode-expression"]').trigger('click')

    expect(spy).toHaveBeenCalledWith('SRC', 2, 'expression')
  })

  it('fetches vocabulary sources when activated with none loaded', () => {
    fetchSourcesMock.mockClear()
    mount(CompareTab, {
      props: { active: true },
      global: {
        plugins: [vuetify],
        provide: { sourceKey: { value: 'SRC' } },
        stubs: { ComparisonVennDiagram: true, ConceptSetChooserDialog: true },
      },
    })
    expect(fetchSourcesMock).toHaveBeenCalled()
  })

  it('clears comparisonError when the error alert is dismissed', async () => {
    const wrapper = mountComponent()
    const store = useConceptSetsStore()
    store.comparisonError = 'boom'
    await wrapper.vm.$nextTick()

    const alert = wrapper.findComponent({ name: 'AtlasAlert' })
    expect(alert.exists()).toBe(true)
    await alert.vm.$emit('close')

    expect(store.comparisonError).toBeNull()
  })

  it('relabels the code/vocabulary columns in Source mode', async () => {
    const wrapper = mountComponent()
    const store = primeComparable()
    store.comparisonMode = 'source'
    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    expect(text).toContain('Source Code')
    expect(text).toContain('Source Vocabulary')
  })

  it('keeps Concept Code header in non-source modes', async () => {
    const wrapper = mountComponent()
    const store = primeComparable()
    store.comparisonMode = 'included'
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Concept Code')
    expect(wrapper.text()).not.toContain('Source Vocabulary')
  })

  it('onCompare clears the cache and loads the active mode', async () => {
    const wrapper = mountComponent()
    const store = primeComparable()
    const clear = vi.spyOn(store, 'clearComparisonCache')
    const load = vi.spyOn(store, 'loadComparisonForMode').mockResolvedValue()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="compare-run"]').trigger('click')

    expect(clear).toHaveBeenCalled()
    expect(load).toHaveBeenCalledWith('SRC', 2, 'included')
  })

  it('clears the other set and comparison when the chip is dismissed', async () => {
    const wrapper = mountComponent()
    const store = primeComparable()
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as unknown as { onClearOther: () => void }).onClearOther()

    expect(store.comparisonOtherSet).toBeNull()
    expect(store.comparison).toEqual([])
  })

  it('loads the chosen other set (onOtherSelected → preloadOther)', async () => {
    const wrapper = mountComponent()
    const store = primeComparable()
    getConceptSetByIdMock.mockResolvedValue({ id: 3, name: 'CS3', items: [] })
    ;(wrapper.vm as unknown as { onOtherSelected: (id: number) => void }).onOtherSelected(3)
    await flushPromises()

    expect(getConceptSetByIdMock).toHaveBeenCalledWith(3)
    expect(store.comparisonOtherSet?.id).toBe(3)
  })

  it('includes the mode in the export filename', async () => {
    downloadCsvMock.mockClear()
    const wrapper = mountComponent()
    const store = primeComparable()
    store.comparisonMode = 'source'
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="compare-export"]').trigger('click')

    expect(downloadCsvMock).toHaveBeenCalled()
    expect(downloadCsvMock.mock.calls[0][0]).toMatch(/compare_source_/)
  })
})
