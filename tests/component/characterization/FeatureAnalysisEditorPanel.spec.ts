import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import FeatureAnalysisEditorPanel from '@/components/characterization/FeatureAnalysisEditorPanel.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { FeatureAnalysis } from '@/models/feature-analysis.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const requestClose = vi.fn()
const isDirty = vi.fn(() => false)
const isPrompting = vi.fn(() => false)

const EditorStub = defineComponent({
  name: 'FeatureAnalysisEditor',
  props: {
    featureAnalysisId: { type: Number, default: null },
    createKind: { type: Object, default: null },
    embedded: { type: Boolean, default: false },
    saveLabel: { type: String, default: undefined },
  },
  emits: ['saved', 'close'],
  setup(_props, { expose }) {
    expose({ requestClose, isDirty, isPrompting })
    return () => h('div', { 'data-testid': 'editor-stub' })
  },
})

const DrawerStub = defineComponent({
  name: 'VNavigationDrawer',
  props: {
    modelValue: Boolean,
    scrim: Boolean,
    disableRouteWatcher: Boolean,
  },
  emits: ['update:modelValue'],
  setup(_props, { slots }) {
    return () => h('div', { 'data-testid': 'cc-fa-panel' }, slots.default?.())
  },
})

function mountPanel(target: unknown) {
  return mount(FeatureAnalysisEditorPanel, {
    props: { target: target as never },
    global: {
      stubs: { VNavigationDrawer: DrawerStub, FeatureAnalysisEditor: EditorStub },
    },
  })
}

describe('FeatureAnalysisEditorPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    requestClose.mockReset()
    isDirty.mockReset().mockReturnValue(false)
    isPrompting.mockReset().mockReturnValue(false)
  })

  it('is closed when target is null', () => {
    const wrapper = mountPanel(null)
    expect(wrapper.find('[data-testid="cc-fa-panel"]').exists()).toBe(false)
  })

  it('passes a create target with Save and add', () => {
    const wrapper = mountPanel({ createKind: { type: 'CUSTOM_FE' } })
    const editor = wrapper.findComponent(EditorStub)
    expect(editor.props('featureAnalysisId')).toBeNull()
    expect(editor.props('createKind')).toEqual({ type: 'CUSTOM_FE' })
    expect(editor.props('saveLabel')).toBe('Save and add')
    expect(editor.props('embedded')).toBe(true)
  })

  it('passes an edit target without a save label', () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    const editor = wrapper.findComponent(EditorStub)
    expect(editor.props('featureAnalysisId')).toBe(42)
    expect(editor.props('createKind')).toBeNull()
    expect(editor.props('saveLabel')).toBeUndefined()
  })

  it('routes a scrim click through requestClose', () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    wrapper.findComponent(DrawerStub).vm.$emit('update:modelValue', false)
    expect(requestClose).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('closed')).toBeUndefined()
  })

  it('routes Esc on the body through requestClose', async () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    await wrapper.get('[data-testid="cc-fa-panel-body"]').trigger('keydown', { key: 'Escape' })
    expect(requestClose).toHaveBeenCalledTimes(1)
  })

  it('leaves Esc to the concept set editor while it is open', async () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    useConceptSetsStore().editorOpen = true
    await wrapper.get('[data-testid="cc-fa-panel-body"]').trigger('keydown', { key: 'Escape' })
    expect(requestClose).not.toHaveBeenCalled()
  })

  it('ignores Esc while the unsaved changes prompt is open', async () => {
    isPrompting.mockReturnValue(true)
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    await wrapper.get('[data-testid="cc-fa-panel-body"]').trigger('keydown', { key: 'Escape' })
    expect(requestClose).not.toHaveBeenCalled()
  })

  it('keeps the drawer open across query-only route changes', () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    expect(wrapper.findComponent(DrawerStub).props('disableRouteWatcher')).toBe(true)
  })

  it('reports whether the hosted editor is dirty', () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    const panel = wrapper.vm as unknown as { isDirty: () => boolean }
    expect(panel.isDirty()).toBe(false)
    isDirty.mockReturnValue(true)
    expect(panel.isDirty()).toBe(true)
  })

  it('drops the scrim while the concept set editor is open', async () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    expect(wrapper.findComponent(DrawerStub).props('scrim')).toBe(true)
    useConceptSetsStore().editorOpen = true
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(DrawerStub).props('scrim')).toBe(false)
  })

  it('re-emits saved and closed', () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    const editor = wrapper.findComponent(EditorStub)
    const fa = { id: 42 } as FeatureAnalysis
    editor.vm.$emit('saved', fa, false)
    editor.vm.$emit('close')
    expect(wrapper.emitted('saved')).toEqual([[fa, false]])
    expect(wrapper.emitted('closed')).toHaveLength(1)
  })

  it('remounts the editor when the target changes', async () => {
    const wrapper = mountPanel({ createKind: { type: 'CUSTOM_FE' } })
    const first = wrapper.findComponent(EditorStub).vm
    await wrapper.setProps({ target: { featureAnalysisId: 42 } })
    expect(wrapper.findComponent(EditorStub).vm).not.toBe(first)
  })
})
