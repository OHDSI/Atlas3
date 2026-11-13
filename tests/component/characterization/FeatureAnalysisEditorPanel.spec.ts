import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import FeatureAnalysisEditorPanel from '@/components/characterization/FeatureAnalysisEditorPanel.vue'
import type { FeatureAnalysis } from '@/models/feature-analysis.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const requestClose = vi.fn()
const isDirty = vi.fn(() => false)

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
    expose({ requestClose, isDirty })
    return () => h('div', { 'data-testid': 'editor-stub' })
  },
})

const SheetStub = defineComponent({
  name: 'AtlasSideSheet',
  props: {
    modelValue: Boolean,
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
      stubs: { AtlasSideSheet: SheetStub, FeatureAnalysisEditor: EditorStub },
    },
  })
}

describe('FeatureAnalysisEditorPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    requestClose.mockReset()
    isDirty.mockReset().mockReturnValue(false)
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

  it('routes a sheet dismissal (scrim click or Esc) through requestClose', () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    wrapper.findComponent(SheetStub).vm.$emit('update:modelValue', false)
    expect(requestClose).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('closed')).toBeUndefined()
  })

  it('reports whether the hosted editor is dirty', () => {
    const wrapper = mountPanel({ featureAnalysisId: 42 })
    const panel = wrapper.vm as unknown as { isDirty: () => boolean }
    expect(panel.isDirty()).toBe(false)
    isDirty.mockReturnValue(true)
    expect(panel.isDirty()).toBe(true)
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
