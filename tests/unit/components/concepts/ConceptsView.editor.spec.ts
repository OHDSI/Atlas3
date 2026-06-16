/**
 * ConceptsView — page-level concept set editor
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import ConceptsView from '@/views/ConceptsView.vue'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (k: string, f: string) => ({ value: f ?? k }) }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}))

// Prevent any network from the concept stores' service calls.
vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn(),
  getConceptById: vi.fn(),
  getConceptsByIds: vi.fn(),
  getConceptsBySourceCodes: vi.fn(),
  getRecommendedConcepts: vi.fn().mockResolvedValue({ available: true, concepts: [] }),
  getConceptRecordCounts: vi.fn().mockResolvedValue(new Map()),
  compareConceptSets: vi.fn().mockResolvedValue([]),
  resolveConceptSetExpression: vi.fn().mockResolvedValue([]),
}))

const vuetify = createVuetify({ components, directives })

function mountView() {
  return mount(ConceptsView, {
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasPageShell: { template: '<div><slot /></div>' },
        AtlasTabs: { template: '<div><slot /></div>' },
        AtlasTab: { template: '<div><slot /></div>' },
        AtlasIcon: true,
        ConceptSearch: true,
        ConceptSetList: true,
        ConceptSetEditor: true,
      },
    },
  })
}

describe('ConceptsView — page-level editor', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not render the editor when closed', () => {
    const wrapper = mountView()
    expect(wrapper.findComponent(ConceptSetEditor).exists()).toBe(false)
  })

  it('renders the editor at page level when editorOpen is true', async () => {
    const wrapper = mountView()
    const sets = useConceptSetsStore()
    sets.openCreateEditor()
    await nextTick()
    expect(wrapper.findComponent(ConceptSetEditor).exists()).toBe(true)
  })

  it('closes the editor when it emits update:modelValue(false)', async () => {
    const wrapper = mountView()
    const sets = useConceptSetsStore()
    sets.openCreateEditor()
    await nextTick()

    await wrapper.findComponent(ConceptSetEditor).vm.$emit('update:modelValue', false)
    expect(sets.editorOpen).toBe(false)
  })

  it('refreshes the list when the editor emits save', async () => {
    const wrapper = mountView()
    const sets = useConceptSetsStore()
    const fetchAll = vi.spyOn(sets, 'fetchAll').mockResolvedValue(undefined)
    sets.openCreateEditor()
    await nextTick()

    await wrapper.findComponent(ConceptSetEditor).vm.$emit('save')
    expect(fetchAll).toHaveBeenCalledOnce()
  })

  it('removes the set and closes the editor when the editor emits delete', async () => {
    const wrapper = mountView()
    const sets = useConceptSetsStore()
    const remove = vi.spyOn(sets, 'remove').mockResolvedValue(true)
    sets.openCreateEditor()
    await nextTick()

    await wrapper.findComponent(ConceptSetEditor).vm.$emit('delete', 42)
    expect(remove).toHaveBeenCalledWith(42)
    await flushPromises()
    expect(sets.editorOpen).toBe(false)
  })
})
