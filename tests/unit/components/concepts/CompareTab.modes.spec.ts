import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({
    getValidVocabularySource: () => '',
    sources: [],
    isLoadingSources: false,
    fetchSources: vi.fn(),
  })),
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

  it('renders Expression / Included / Source mode buttons', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="mode-expression"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-included"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mode-source"]').exists()).toBe(true)
  })

  it('switching to Source calls loadComparisonForMode with source', async () => {
    const wrapper = mountComponent()
    const store = primeComparable()
    const spy = vi.spyOn(store, 'loadComparisonForMode').mockResolvedValue()
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="mode-source"]').trigger('click')

    expect(spy).toHaveBeenCalledWith('SRC', 2, 'source')
  })
})
