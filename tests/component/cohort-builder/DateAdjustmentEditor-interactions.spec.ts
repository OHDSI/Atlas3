/**
 * DateAdjustmentEditor interaction tests
 *
 * Triggers the four `updateStart*` / `updateEnd*` arrow handlers so v8
 * registers them as called. The existing render-only spec leaves these at
 * 0% function coverage by mounting the component without firing any events.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { DateAdjustment } from '@/models/event.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import DateAdjustmentEditor from '@/components/cohort-builder/DateAdjustmentEditor.vue'

const vuetify = createVuetify({ components, directives })

const stubs = {
  AtlasRow: { template: '<div><slot /></div>' },
  AtlasCol: { template: '<div><slot /></div>' },
  AtlasDivider: true,
  AtlasAlert: { template: '<div><slot /></div>' },
  AtlasSelect: {
    name: 'AtlasSelect',
    props: ['modelValue', 'items', 'label'],
    emits: ['update:modelValue'],
    template:
      '<button class="stub-select" :data-label="label" @click="$emit(\'update:modelValue\', \'END_DATE\')" />',
  },
  AtlasTextField: {
    name: 'AtlasTextField',
    props: ['modelValue', 'label'],
    emits: ['update:modelValue'],
    template:
      '<input class="stub-text" :data-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
}

function mountIt(modelValue?: DateAdjustment) {
  return mount(DateAdjustmentEditor, {
    props: { modelValue },
    global: { plugins: [vuetify], stubs },
  })
}

const base: DateAdjustment = {
  startWith: 'START_DATE',
  startOffset: 0,
  endWith: 'END_DATE',
  endOffset: 0,
}

describe('DateAdjustmentEditor interactions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('emits update:modelValue with new startWith when start select changes', async () => {
    const wrapper = mountIt(base)
    const selects = wrapper.findAll('.stub-select')
    await selects[0]!.trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![0]![0] as DateAdjustment
    expect(next.startWith).toBe('END_DATE')
    expect(next.endWith).toBe('END_DATE')
  })

  it('emits update:modelValue with new endWith when end select changes', async () => {
    const wrapper = mountIt(base)
    const selects = wrapper.findAll('.stub-select')
    await selects[1]!.trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![0]![0] as DateAdjustment
    expect(next.endWith).toBe('END_DATE')
  })

  it('emits update:modelValue with numeric startOffset when start text field input fires', async () => {
    const wrapper = mountIt(base)
    const inputs = wrapper.findAll('.stub-text')
    await inputs[0]!.setValue('42')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![emits!.length - 1]![0] as DateAdjustment
    expect(next.startOffset).toBe(42)
  })

  it('emits update:modelValue with numeric endOffset when end text field input fires', async () => {
    const wrapper = mountIt(base)
    const inputs = wrapper.findAll('.stub-text')
    await inputs[1]!.setValue('-7')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![emits!.length - 1]![0] as DateAdjustment
    expect(next.endOffset).toBe(-7)
  })

  it('uses defaults when modelValue is undefined and still emits on input', async () => {
    const wrapper = mountIt(undefined)
    const selects = wrapper.findAll('.stub-select')
    await selects[0]!.trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![0]![0] as DateAdjustment
    // Default startOffset is 0, default endWith is END_DATE, etc.
    expect(next.startWith).toBe('END_DATE')
    expect(next.startOffset).toBe(0)
    expect(next.endWith).toBe('END_DATE')
    expect(next.endOffset).toBe(0)
  })
})
