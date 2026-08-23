/**
 * Tests for PluginConceptSetChooserHost
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PluginConceptSetChooserHost from '@/components/plugins/PluginConceptSetChooserHost.vue'
import { usePluginConceptSetChooserStore } from '@/stores/plugin-concept-set-chooser'
import { useConceptSetsStore } from '@/stores/concept-sets'

const ChooserStub = {
  name: 'ConceptSetChooserDialog',
  props: ['modelValue', 'title'],
  emits: ['update:modelValue', 'select'],
  template: '<div class="chooser-stub" />',
}

const mountHost = () =>
  mount(PluginConceptSetChooserHost, {
    global: { stubs: { ConceptSetChooserDialog: ChooserStub } },
  })

describe('PluginConceptSetChooserHost', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders nothing until a plugin asks, so nothing is mounted or fetched on boot', () => {
    const wrapper = mountHost()

    expect(wrapper.findComponent(ChooserStub).exists()).toBe(false)
  })

  it('shows the dialog while a request is outstanding', async () => {
    const store = usePluginConceptSetChooserStore()
    const wrapper = mountHost()

    void store.open('Pick one')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.findComponent(ChooserStub)
    expect(dialog.exists()).toBe(true)
    expect(dialog.props('title')).toBe('Pick one')
  })

  it('answers with the id and the name taken from the loaded list', async () => {
    const store = usePluginConceptSetChooserStore()
    const conceptSets = useConceptSetsStore()
    conceptSets.conceptSets = [{ id: 5, name: 'Aspirin' }] as never

    const choice = store.open()
    const wrapper = mountHost()
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ChooserStub).vm.$emit('select', 5)

    await expect(choice).resolves.toEqual({ conceptSetId: 5, name: 'Aspirin' })
  })

  it('falls back to the id when the list has no matching entry', async () => {
    const store = usePluginConceptSetChooserStore()
    const choice = store.open()
    const wrapper = mountHost()
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ChooserStub).vm.$emit('select', 42)

    await expect(choice).resolves.toEqual({ conceptSetId: 42, name: '42' })
  })

  it('treats dismissal as no choice', async () => {
    const store = usePluginConceptSetChooserStore()
    const choice = store.open()
    const wrapper = mountHost()
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ChooserStub).vm.$emit('update:modelValue', false)

    await expect(choice).resolves.toBeNull()
  })

  it('ignores an update that is not a dismissal', async () => {
    const store = usePluginConceptSetChooserStore()
    const settled = vi.fn()
    void store.open().then(settled)
    const wrapper = mountHost()
    await wrapper.vm.$nextTick()

    wrapper.findComponent(ChooserStub).vm.$emit('update:modelValue', true)
    await wrapper.vm.$nextTick()

    expect(settled).not.toHaveBeenCalled()
    expect(store.isOpen).toBe(true)
  })
})
