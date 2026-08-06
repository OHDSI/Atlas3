/**
 * ConceptSearchInline — choosing how concepts are added (#163)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import ConceptSearchInline from '@/components/concepts/ConceptSearchInline.vue'
import ConceptAddOptions from '@/components/concepts/ConceptAddOptions.vue'
import { useConceptSearchStore } from '@/stores/concept-search'
import { createMockConcept } from '@/../tests/helpers/mock-factories'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn().mockResolvedValue({ concepts: [], totalCount: 0 }),
  getConceptRecordCounts: vi.fn().mockResolvedValue(new Map()),
}))

vi.mock('@/config/webapi', () => ({ getSourceKey: () => 'SYNPUF1K' }))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({
    getValidVocabularySource: () => 'SYNPUF1K',
    sources: [],
    selectedSource: null,
    vocabularySources: [],
  }),
}))

vi.mock('@/components/concepts/ConceptTable.vue', () => ({
  default: {
    name: 'ConceptTable',
    template: '<div />',
    props: ['concepts', 'loading', 'totalItems', 'page', 'itemsPerPage', 'showAddButton', 'conceptsInSet', 'selectable', 'selected'],
    emits: ['update:page', 'update:itemsPerPage', 'update:selected', 'add-concept', 'remove-concept', 'view-concept'],
  },
}))

const vuetify = createVuetify({ components, directives })

const A = createMockConcept({ conceptId: 1, conceptName: 'Diabetes' })
const B = createMockConcept({ conceptId: 2, conceptName: 'Metformin' })

function table(wrapper: VueWrapper) {
  return wrapper.findComponent({ name: 'ConceptTable' })
}

describe('ConceptSearchInline — add options', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    wrapper = mount(ConceptSearchInline, { global: { plugins: [vuetify] } })
  })

  function setResults(list = [A, B]) {
    useConceptSearchStore().allConcepts = list
    return wrapper.vm.$nextTick()
  }

  it('hides the add-options bar until results exist', async () => {
    expect(wrapper.findComponent(ConceptAddOptions).exists()).toBe(false)
    await setResults()
    expect(wrapper.findComponent(ConceptAddOptions).exists()).toBe(true)
  })

  it('makes the results table selectable', async () => {
    await setResults()
    expect(table(wrapper).props('selectable')).toBe(true)
  })

  it('emits the chosen flags alongside a single add', async () => {
    await setResults()
    wrapper.findComponent(ConceptAddOptions).vm.$emit('update:modelValue', {
      isExcluded: false,
      includeDescendants: true,
      includeMapped: false,
    })
    await wrapper.vm.$nextTick()

    table(wrapper).vm.$emit('add-concept', A)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('add-concept')?.[0]).toEqual([
      A,
      { isExcluded: false, includeDescendants: true, includeMapped: false },
    ])
  })

  it('emits every selected concept with the chosen flags on a bulk add', async () => {
    await setResults()
    table(wrapper).vm.$emit('update:selected', [A.conceptId, B.conceptId])
    wrapper.findComponent(ConceptAddOptions).vm.$emit('update:modelValue', {
      isExcluded: true,
      includeDescendants: false,
      includeMapped: true,
    })
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptAddOptions).vm.$emit('add')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('add-concepts')?.[0]).toEqual([
      [A, B],
      { isExcluded: true, includeDescendants: false, includeMapped: true },
    ])
  })

  it('clears the selection after a bulk add', async () => {
    await setResults()
    table(wrapper).vm.$emit('update:selected', [A.conceptId])
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptAddOptions).vm.$emit('add')
    await wrapper.vm.$nextTick()

    expect(table(wrapper).props('selected')).toEqual([])
  })

  it('does not emit a bulk add when nothing is selected', async () => {
    await setResults()
    wrapper.findComponent(ConceptAddOptions).vm.$emit('add')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('add-concepts')).toBeUndefined()
  })
})
