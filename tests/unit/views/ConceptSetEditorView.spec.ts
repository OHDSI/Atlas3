import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ConceptSetEditorView from '@/views/ConceptSetEditorView.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

const routerPush = vi.fn()
const routerReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ({ value: fallback ?? key }),
  }),
}))

const ConceptSetEditorStub = {
  name: 'ConceptSetEditor',
  props: ['modelValue', 'conceptSet', 'presentation'],
  emits: ['update:modelValue', 'save', 'back-to-current'],
  template: '<div data-testid="concept-set-editor" />',
}

function mountView(props: { id?: string; version?: string } = {}) {
  return mount(ConceptSetEditorView, {
    props,
    global: {
      stubs: {
        AtlasPageShell: { template: '<div><slot /></div>' },
        ConceptSetEditor: ConceptSetEditorStub,
      },
    },
  })
}

describe('ConceptSetEditorView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(useConceptSetsStore(), 'fetchAll').mockResolvedValue()
  })

  it('creates a routed draft for /conceptset/new', async () => {
    const wrapper = mountView()
    await nextTick()

    const editor = wrapper.getComponent(ConceptSetEditorStub)
    expect(editor.props('presentation')).toBe('page')
    expect(editor.props('modelValue')).toBe(true)
    expect(useConceptSetsStore().currentSet).toMatchObject({ name: '', items: [] })
  })

  it('returns to the repository browser when the editor closes', async () => {
    const wrapper = mountView()
    await nextTick()

    await wrapper.getComponent(ConceptSetEditorStub).vm.$emit('update:modelValue', false)

    expect(routerPush).toHaveBeenCalledWith({ name: 'concepts', query: { tab: 'sets' } })
  })

  it('replaces a new-set URL with the persisted concept-set route after save', async () => {
    const wrapper = mountView()
    await nextTick()

    await wrapper.getComponent(ConceptSetEditorStub).vm.$emit('save', {
      id: 21,
      name: 'Saved set',
      items: [],
    })

    expect(routerReplace).toHaveBeenCalledWith({
      name: 'conceptset-edit',
      params: { id: '21' },
    })
  })
})
