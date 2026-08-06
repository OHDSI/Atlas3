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
import { useConceptSetsStore } from '@/stores/concept-sets'
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

describe('ConceptSearchInline — search box and table wiring', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    wrapper = mount(ConceptSearchInline, { global: { plugins: [vuetify] } })
  })

  it('rejects a term shorter than three characters', async () => {
    const store = useConceptSearchStore()
    const spy = vi.spyOn(store, 'search')

    await wrapper.find('input').setValue('ab')
    await wrapper.find('input').trigger('keyup.enter')

    expect(spy).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Please enter at least 3 characters')
  })

  it('searches the trimmed term on Enter and on the append button', async () => {
    const store = useConceptSearchStore()
    const spy = vi.spyOn(store, 'search')

    await wrapper.find('input').setValue('  diabetes  ')
    await wrapper.find('input').trigger('keyup.enter')
    expect(spy).toHaveBeenLastCalledWith('diabetes')

    await wrapper.findComponent({ name: 'AtlasButton' }).trigger('click')
    expect(spy).toHaveBeenLastCalledWith('diabetes')
  })

  it('clears the store when the input is emptied', async () => {
    const store = useConceptSearchStore()
    const spy = vi.spyOn(store, 'clearSearch')

    await wrapper.find('input').setValue('diabetes')
    await wrapper.find('input').setValue('')

    expect(spy).toHaveBeenCalled()
  })

  it('resets the box and the store via the clear affordance', async () => {
    const store = useConceptSearchStore()
    const spy = vi.spyOn(store, 'clearSearch')

    await wrapper.find('input').setValue('diabetes')
    wrapper.findComponent({ name: 'AtlasTextField' }).vm.$emit('click:clear')
    await wrapper.vm.$nextTick()

    expect(spy).toHaveBeenCalled()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('surfaces a store error', async () => {
    useConceptSearchStore().error = 'boom'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('boom')
  })

  it('forwards pagination changes to the store', async () => {
    const store = useConceptSearchStore()
    const spy = vi.spyOn(store, 'updatePagination')

    table(wrapper).vm.$emit('update:page', 3)
    expect(spy).toHaveBeenLastCalledWith(3, store.itemsPerPage)

    table(wrapper).vm.$emit('update:itemsPerPage', 50)
    expect(spy).toHaveBeenLastCalledWith(1, 50)
  })

  it('re-emits remove and view events from the table', async () => {
    table(wrapper).vm.$emit('remove-concept', A)
    table(wrapper).vm.$emit('view-concept', { conceptId: 1, sourceKey: 'SYNPUF1K' })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('remove-concept')?.[0]).toEqual([A])
    expect(wrapper.emitted('view-concept')?.[0]).toEqual([{ conceptId: 1, sourceKey: 'SYNPUF1K' }])
  })

  it('marks concepts already in the open set', async () => {
    const sets = useConceptSetsStore()
    sets.currentSet = {
      id: 7,
      name: 'Set',
      items: [{ ...A, isExcluded: false, includeDescendants: false, includeMapped: false }],
    }
    await wrapper.vm.$nextTick()

    expect([...(table(wrapper).props('conceptsInSet') as Set<number>)]).toEqual([A.conceptId])
  })
})
