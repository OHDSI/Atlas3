/**
 * Tests for PluginConceptSetEditorHost
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { reactive, nextTick } from 'vue'
import PluginConceptSetEditorHost from '@/components/plugins/PluginConceptSetEditorHost.vue'
import { usePluginConceptSetEditorStore } from '@/stores/plugin-concept-set-editor'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useNotifications } from '@/stores/notifications'
import type { ConceptSet } from '@/models/concept-set.types'

const route = reactive({ path: '/plugins/demo' })

vi.mock('vue-router', () => ({
  useRoute: () => route,
}))

const EditorStub = {
  name: 'ConceptSetEditor',
  props: ['modelValue', 'conceptSet'],
  emits: ['update:modelValue', 'save', 'delete'],
  template: '<div class="editor-stub" />',
}

const mountHost = () =>
  mount(PluginConceptSetEditorHost, {
    global: { stubs: { ConceptSetEditor: EditorStub } },
  })

const openBlank = async (wrapper: ReturnType<typeof mountHost>) => {
  const store = usePluginConceptSetEditorStore()
  const result = store.open()
  await vi.waitFor(() => expect(store.isOpen).toBe(true))
  await wrapper.vm.$nextTick()
  return { result }
}

describe('PluginConceptSetEditorHost', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.path = '/plugins/demo'
  })

  it('renders nothing until a plugin asks', () => {
    const wrapper = mountHost()

    expect(wrapper.findComponent(EditorStub).exists()).toBe(false)
  })

  it('shows the editor on the working concept set while a request is outstanding', async () => {
    const wrapper = mountHost()
    await openBlank(wrapper)

    expect(wrapper.findComponent(EditorStub).props('conceptSet')).toEqual({ name: '', items: [] })
  })

  it('answers with the persisted id and name after a save', async () => {
    const wrapper = mountHost()
    const { result } = await openBlank(wrapper)

    useConceptSetsStore().currentSet = { id: '15', name: 'Statins', items: [] } as unknown as ConceptSet
    wrapper.findComponent(EditorStub).vm.$emit('save')

    await expect(result).resolves.toEqual({ conceptSetId: 15, name: 'Statins' })
  })

  it('ignores a save when the working set has no id', async () => {
    const store = usePluginConceptSetEditorStore()
    const wrapper = mountHost()
    await openBlank(wrapper)

    wrapper.findComponent(EditorStub).vm.$emit('save')

    expect(store.isOpen).toBe(true)
  })

  it('answers null when the drawer closes without a save', async () => {
    const wrapper = mountHost()
    const { result } = await openBlank(wrapper)

    wrapper.findComponent(EditorStub).vm.$emit('update:modelValue', false)

    await expect(result).resolves.toBeNull()
  })

  it('keeps the request open on an update that is not a close', async () => {
    const store = usePluginConceptSetEditorStore()
    const wrapper = mountHost()
    await openBlank(wrapper)

    wrapper.findComponent(EditorStub).vm.$emit('update:modelValue', true)

    expect(store.isOpen).toBe(true)
  })

  it('deletes the set when the editor asks to', async () => {
    const conceptSets = useConceptSetsStore()
    const remove = vi.spyOn(conceptSets, 'remove').mockResolvedValue(undefined as never)
    const wrapper = mountHost()
    await openBlank(wrapper)

    wrapper.findComponent(EditorStub).vm.$emit('delete', 8)

    expect(remove).toHaveBeenCalledWith(8)
  })

  it('answers null when the route changes', async () => {
    const wrapper = mountHost()
    const { result } = await openBlank(wrapper)

    route.path = '/cohortdefinitions'

    await expect(result).resolves.toBeNull()
  })

  it('shows a notification when the requested set does not load', async () => {
    const conceptSets = useConceptSetsStore()
    const notify = useNotifications()
    const danger = vi.spyOn(notify, 'danger')
    vi.spyOn(conceptSets, 'fetchOne').mockImplementation(async () => {
      conceptSets.currentSet = null
      conceptSets.error = 'Concept set not found'
    })
    mountHost()

    await usePluginConceptSetEditorStore().open(99)
    await nextTick()

    expect(danger).toHaveBeenCalledWith(expect.stringContaining('99'), {
      message: 'Concept set not found',
    })
    expect(usePluginConceptSetEditorStore().loadError).toBeNull()
  })
})
