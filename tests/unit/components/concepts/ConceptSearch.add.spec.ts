/**
 * ConceptSearch — add to concept set from standalone search
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import ConceptSearch from '@/components/concepts/ConceptSearch.vue'
import ConceptTable from '@/components/concepts/ConceptTable.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { AtlasSnackbar } from '@/components/ui'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    // Mirror the real composable: interpolate {param} placeholders from the
    // params object so tests exercise the actual formatted output.
    t: (key: string, fallback: string, params?: Record<string, unknown>) => {
      let text = fallback ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return { value: text }
    },
    tv: (key: string) => key,
  }),
}))

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn().mockResolvedValue({ concepts: [], totalCount: 0 }),
  getConceptById: vi.fn(),
  getConceptsByIds: vi.fn(),
  getConceptsBySourceCodes: vi.fn(),
  getRecommendedConcepts: vi.fn().mockResolvedValue({ available: true, concepts: [] }),
  getConceptRecordCounts: vi.fn().mockResolvedValue(new Map()),
  compareConceptSets: vi.fn().mockResolvedValue([]),
  resolveConceptSetExpression: vi.fn().mockResolvedValue([]),
}))

const vuetify = createVuetify({ components, directives })

const concept: Concept = {
  conceptId: 313217,
  conceptName: 'Atrial fibrillation',
  conceptCode: '49436004',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

function mountSearch() {
  return mount(ConceptSearch, {
    global: {
      plugins: [vuetify],
      stubs: { ConceptTable: true },
    },
  })
}

describe('ConceptSearch — add to concept set', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('passes show-add-button to the results table', () => {
    const wrapper = mountSearch()
    expect(wrapper.findComponent(ConceptTable).props('showAddButton')).toBe(true)
  })

  it('first Add creates a new set, opens the editor, and adds the concept', async () => {
    const wrapper = mountSearch()
    const sets = useConceptSetsStore()
    expect(sets.currentSet).toBeNull()

    await wrapper.findComponent(ConceptTable).vm.$emit('add-concept', concept)

    expect(sets.editorOpen).toBe(true)
    expect(sets.currentSet).not.toBeNull()
    expect(sets.currentSet?.items).toHaveLength(1)
    expect(sets.currentSet?.items[0].conceptId).toBe(313217)
  })

  it('reflects added concepts in conceptsInSet', async () => {
    const wrapper = mountSearch()
    const table = wrapper.findComponent(ConceptTable)
    await table.vm.$emit('add-concept', concept)
    expect((table.props('conceptsInSet') as Set<number>).has(313217)).toBe(true)
  })

  it('second Add reuses the same set', async () => {
    const wrapper = mountSearch()
    const sets = useConceptSetsStore()
    const table = wrapper.findComponent(ConceptTable)
    await table.vm.$emit('add-concept', concept)
    const firstSet = sets.currentSet
    await table.vm.$emit('add-concept', {
      ...concept,
      conceptId: 4154290,
      conceptName: 'Paroxysmal atrial fibrillation',
    })
    expect(sets.currentSet).toBe(firstSet)
    expect(sets.currentSet?.items).toHaveLength(2)
  })

  it('Remove takes the concept out of the set', async () => {
    const wrapper = mountSearch()
    const sets = useConceptSetsStore()
    const table = wrapper.findComponent(ConceptTable)
    await table.vm.$emit('add-concept', concept)
    expect(sets.currentSet?.items).toHaveLength(1)
    await table.vm.$emit('remove-concept', concept)
    expect(sets.currentSet?.items).toHaveLength(0)
  })

  it('shows a confirmation snackbar naming the added concept', async () => {
    const wrapper = mountSearch()
    await wrapper.findComponent(ConceptTable).vm.$emit('add-concept', concept)
    const snackbar = wrapper.findComponent(AtlasSnackbar)
    expect(snackbar.props('modelValue')).toBe(true)
    expect(snackbar.props('text')).toContain('Atrial fibrillation')
  })
})
