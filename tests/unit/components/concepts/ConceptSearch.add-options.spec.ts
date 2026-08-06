/**
 * ConceptSearch — choosing how concepts are added (#163)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import ConceptSearch from '@/components/concepts/ConceptSearch.vue'
import ConceptTable from '@/components/concepts/ConceptTable.vue'
import ConceptAddOptions from '@/components/concepts/ConceptAddOptions.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useConceptSearchStore } from '@/stores/concept-search'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn().mockResolvedValue({ concepts: [], totalCount: 0 }),
  getConceptById: vi.fn(),
  getConceptsByIds: vi.fn(),
  getConceptsBySourceCodes: vi.fn(),
  getRecommendedConcepts: vi.fn().mockResolvedValue({ available: true, concepts: [] }),
  getConceptRecordCounts: vi.fn().mockResolvedValue(new Map()),
  compareConceptSets: vi.fn().mockResolvedValue([]),
  resolveConceptSetExpression: vi.fn().mockResolvedValue([]),
  getMappedSourceCodes: vi.fn().mockResolvedValue([]),
}))

const vuetify = createVuetify({ components, directives })

function concept(overrides: Partial<Concept> = {}): Concept {
  return {
    conceptId: 313217,
    conceptName: 'Atrial fibrillation',
    conceptCode: '49436004',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    ...overrides,
  }
}

const A = concept()
const B = concept({ conceptId: 4154290, conceptName: 'Paroxysmal atrial fibrillation' })

function mountSearch() {
  return mount(ConceptSearch, {
    global: { plugins: [vuetify], stubs: { ConceptTable: true } },
  })
}

function setResults(list: Concept[]) {
  useConceptSearchStore().allConcepts = list
}

describe('ConceptSearch — add options', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('makes the results table selectable so several concepts can be added at once', () => {
    const wrapper = mountSearch()
    expect(wrapper.findComponent(ConceptTable).props('selectable')).toBe(true)
  })

  it('hides the add-options bar until a search has returned something', async () => {
    const wrapper = mountSearch()
    expect(wrapper.findComponent(ConceptAddOptions).exists()).toBe(false)

    setResults([A])
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ConceptAddOptions).exists()).toBe(true)
  })

  it('applies the chosen flags to a row added with the Add button', async () => {
    const wrapper = mountSearch()
    setResults([A])
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptAddOptions).vm.$emit('update:modelValue', {
      isExcluded: false,
      includeDescendants: true,
      includeMapped: false,
    })
    await wrapper.vm.$nextTick()

    await wrapper.findComponent(ConceptTable).vm.$emit('add-concept', A)

    const sets = useConceptSetsStore()
    expect(sets.currentSet?.items[0]).toMatchObject({
      conceptId: A.conceptId,
      includeDescendants: true,
      isExcluded: false,
    })
  })

  it('adds every selected concept with the chosen flags in one go', async () => {
    const wrapper = mountSearch()
    setResults([A, B])
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent(ConceptTable)
    table.vm.$emit('update:selected', [A.conceptId, B.conceptId])
    wrapper.findComponent(ConceptAddOptions).vm.$emit('update:modelValue', {
      isExcluded: true,
      includeDescendants: true,
      includeMapped: false,
    })
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptAddOptions).vm.$emit('add')
    await wrapper.vm.$nextTick()

    const sets = useConceptSetsStore()
    expect(sets.currentSet?.items).toHaveLength(2)
    for (const item of sets.currentSet?.items ?? []) {
      expect(item).toMatchObject({ isExcluded: true, includeDescendants: true, includeMapped: false })
    }
  })

  it('counts only the concepts that actually landed, not the ones ticked', async () => {
    const wrapper = mountSearch()
    setResults([A, B])
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent(ConceptTable)
    await table.vm.$emit('add-concept', A)

    table.vm.$emit('update:selected', [A.conceptId, B.conceptId])
    await wrapper.vm.$nextTick()
    wrapper.findComponent(ConceptAddOptions).vm.$emit('add')
    await wrapper.vm.$nextTick()

    const sets = useConceptSetsStore()
    expect(sets.currentSet?.items).toHaveLength(2)
    expect(wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toContain('Added 1')
  })

  it('reports the selection count to the add-options bar', async () => {
    const wrapper = mountSearch()
    setResults([A, B])
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptTable).vm.$emit('update:selected', [A.conceptId])
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(ConceptAddOptions).props('selectedCount')).toBe(1)
  })

  it('clears the selection after a bulk add', async () => {
    const wrapper = mountSearch()
    setResults([A, B])
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent(ConceptTable)
    table.vm.$emit('update:selected', [A.conceptId, B.conceptId])
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptAddOptions).vm.$emit('add')
    await wrapper.vm.$nextTick()

    expect(table.props('selected')).toEqual([])
  })

  it('creates a set on a bulk add when none is open yet', async () => {
    const wrapper = mountSearch()
    const sets = useConceptSetsStore()
    expect(sets.currentSet).toBeNull()

    setResults([A])
    await wrapper.vm.$nextTick()
    wrapper.findComponent(ConceptTable).vm.$emit('update:selected', [A.conceptId])
    await wrapper.vm.$nextTick()
    wrapper.findComponent(ConceptAddOptions).vm.$emit('add')
    await wrapper.vm.$nextTick()

    expect(sets.editorOpen).toBe(true)
    expect(sets.currentSet?.items).toHaveLength(1)
  })

  it('keeps the chosen flags across successive searches', async () => {
    const wrapper = mountSearch()
    setResults([A])
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ConceptAddOptions).vm.$emit('update:modelValue', {
      isExcluded: true,
      includeDescendants: false,
      includeMapped: false,
    })
    await wrapper.vm.$nextTick()

    setResults([B])
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(ConceptAddOptions).props('modelValue')).toMatchObject({
      isExcluded: true,
    })
  })
})
