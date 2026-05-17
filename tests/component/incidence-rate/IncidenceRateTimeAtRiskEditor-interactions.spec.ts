/**
 * IncidenceRateTimeAtRiskEditor interaction tests
 *
 * Triggers the AtlasSelect / AtlasTextField update handlers so the
 * `updateStart` / `updateEnd` arrow callbacks register on v8's function map.
 * The existing render-only spec keeps function coverage at 0%.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import IncidenceRateTimeAtRiskEditor from '@/components/incidence-rate/IncidenceRateTimeAtRiskEditor.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const stubs = {
  AtlasSelect: {
    name: 'AtlasSelect',
    props: ['modelValue', 'items'],
    emits: ['update:modelValue'],
    template:
      '<button class="stub-select" @click="$emit(\'update:modelValue\', \'EndDate\')" />',
  },
  AtlasTextField: {
    name: 'AtlasTextField',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input class="stub-text" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  AtlasAlert: true,
}

function setup() {
  setActivePinia(createPinia())
  const store = useIncidenceRateStore()
  store.createNewIR()
  const wrapper = mount(IncidenceRateTimeAtRiskEditor, {
    global: { plugins: [vuetify], stubs },
  })
  return { store, wrapper }
}

describe('IncidenceRateTimeAtRiskEditor interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates start.DateField when start select fires update', async () => {
    const { store, wrapper } = setup()
    const selects = wrapper.findAll('.stub-select')
    await selects[0]!.trigger('click')
    await flushPromises()
    expect(store.currentIR!.expression.timeAtRisk.start.DateField).toBe('EndDate')
  })

  it('updates end.DateField when end select fires update', async () => {
    const { store, wrapper } = setup()
    const selects = wrapper.findAll('.stub-select')
    await selects[1]!.trigger('click')
    await flushPromises()
    expect(store.currentIR!.expression.timeAtRisk.end.DateField).toBe('EndDate')
  })

  it('updates start.Offset when start text field emits an input', async () => {
    const { store, wrapper } = setup()
    const inputs = wrapper.findAll('.stub-text')
    await inputs[0]!.setValue('42')
    expect(store.currentIR!.expression.timeAtRisk.start.Offset).toBe(42)
  })

  it('updates end.Offset when end text field emits an input', async () => {
    const { store, wrapper } = setup()
    const inputs = wrapper.findAll('.stub-text')
    await inputs[1]!.setValue('-7')
    expect(store.currentIR!.expression.timeAtRisk.end.Offset).toBe(-7)
  })

  it('falls back to default TAR when no IR is loaded (computed default branch)', () => {
    setActivePinia(createPinia())
    // No createNewIR() — currentIR is null.
    const wrapper = mount(IncidenceRateTimeAtRiskEditor, {
      global: { plugins: [vuetify], stubs },
    })
    // Component renders with the default TAR object.
    expect(wrapper.findAll('.stub-select').length).toBe(2)
  })
})
