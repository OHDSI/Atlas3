/**
 * ValidationMessagesDialog interaction tests
 *
 * Triggers the close button + dialog `update:modelValue` + dialog `close` to
 * exercise every inline emit handler. Without these clicks the script body
 * sits at 0% functions even though the template renders.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import ValidationMessagesDialog from '@/components/cohort/ValidationMessagesDialog.vue'

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
  AtlasChip: {
    name: 'AtlasChip',
    props: ['tone', 'size', 'label'],
    template: '<span class="stub-chip"><slot /></span>',
  },
  AtlasButton: {
    name: 'AtlasButton',
    emits: ['click'],
    template:
      '<button class="stub-button" @click="$emit(\'click\', $event)"><slot /></button>',
  },
}

function mountIt(props: Record<string, unknown> = {}) {
  return mount(ValidationMessagesDialog, {
    props: {
      modelValue: true,
      warnings: [
        { severity: 'CRITICAL', message: 'Critical issue' },
        { severity: 'WARNING', message: 'Be careful' },
        { severity: 'INFO', message: 'FYI' },
      ],
      severityColor: 'red',
      ...props,
    },
    global: { plugins: [vuetify], stubs },
  })
}

describe('ValidationMessagesDialog interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('renders a row per warning severity', () => {
    const wrapper = mountIt()
    const chips = wrapper.findAll('.stub-chip')
    expect(chips.length).toBe(3)
  })
})
