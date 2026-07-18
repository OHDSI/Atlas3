/**
 * ConceptSetsListDialog interaction tests
 *
 * Triggers the per-row view button, the close button, and the dialog
 * update/close events so all inline emit handlers register as executed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import ConceptSetsListDialog from '@/components/cohort/ConceptSetsListDialog.vue'
import type { ConceptSetReference } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const stubs = {
  AtlasDialog: {
    name: 'AtlasDialog',
    props: ['modelValue', 'eyebrow', 'title', 'maxWidth'],
    emits: ['update:modelValue', 'close'],
    template:
      '<div class="stub-dialog">' +
      '<button class="stub-dialog-update" @click="$emit(\'update:modelValue\', false)" />' +
      '<button class="stub-dialog-close" @click="$emit(\'close\')" />' +
      '<slot />' +
      '<div class="stub-actions"><slot name="actions" /></div>' +
      '</div>',
  },
  AtlasIconButton: {
    name: 'AtlasIconButton',
    props: ['icon', 'variant', 'size'],
    emits: ['click'],
    template:
      '<button class="stub-icon-btn" @click="$emit(\'click\', $event)" />',
  },
  AtlasButton: {
    name: 'AtlasButton',
    emits: ['click'],
    template:
      '<button class="stub-button" @click="$emit(\'click\', $event)"><slot /></button>',
  },
}

const conceptSets: ConceptSetReference[] = [
  { id: 1, name: 'A', items: [{}] as unknown[] },
  { id: 2, name: 'B', items: [] },
]

function mountIt(props: Record<string, unknown> = {}) {
  return mount(ConceptSetsListDialog, {
    props: {
      modelValue: true,
      conceptSets,
      ...props,
    },
    global: { plugins: [vuetify], stubs },
  })
}

describe('ConceptSetsListDialog interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emits view with the concept set when the row icon button is clicked', async () => {
    const wrapper = mountIt()
    const buttons = wrapper.findAll('.stub-icon-btn')
    // 2 concept sets × 2 action buttons per row (edit + delete) = 4 buttons total
    expect(buttons.length).toBe(4)
    // First button in first row is the edit button for the first concept set
    await buttons[0]!.trigger('click')
    const emits = wrapper.emitted('view')
    expect(emits).toBeTruthy()
    expect(emits![0]![0]).toEqual(conceptSets[0])
  })

  it('emits update:modelValue=false when the close button is clicked', async () => {
    const wrapper = mountIt()
    await wrapper.find('.stub-button').trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    expect(emits![0]![0]).toBe(false)
  })

  it('forwards the dialog update:modelValue event', async () => {
    const wrapper = mountIt()
    await wrapper.find('.stub-dialog-update').trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    expect(emits![0]![0]).toBe(false)
  })

  it('emits update:modelValue=false when the dialog emits close', async () => {
    const wrapper = mountIt()
    await wrapper.find('.stub-dialog-close').trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    expect(emits![0]![0]).toBe(false)
  })

  it('renders the empty-state when no concept sets are provided', () => {
    const wrapper = mountIt({ conceptSets: [] })
    expect(wrapper.text()).toContain('No concept sets')
  })
})
