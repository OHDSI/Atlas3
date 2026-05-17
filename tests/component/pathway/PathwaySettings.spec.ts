/**
 * PathwaySettings interaction tests
 *
 * Verifies every `update:modelValue` handler fires its expected emit when the
 * underlying AtlasSelect / AtlasSwitch input changes. Lifts function coverage
 * from ~0% by triggering the inline arrow handlers that existing render-only
 * specs don't exercise.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import PathwaySettings from '@/components/pathway/PathwaySettings.vue'
import type { PathwayDesign } from '@/models/pathway.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const baseModel: PathwayDesign = {
  combinationWindow: 0,
  minCellCount: 5,
  maxDepth: 3,
  allowRepeats: false,
}

function mountIt(modelValue: PathwayDesign = baseModel) {
  return mount(PathwaySettings, {
    props: { modelValue, readonly: false },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasSelect: {
          name: 'AtlasSelect',
          props: ['modelValue', 'items', 'ariaLabel'],
          emits: ['update:modelValue'],
          template:
            '<button class="stub-select" :aria-label="ariaLabel" @click="$emit(\'update:modelValue\', items && items[1])">{{ modelValue }}</button>',
        },
        AtlasSwitch: {
          name: 'AtlasSwitch',
          props: ['modelValue', 'ariaLabel'],
          emits: ['update:modelValue'],
          template:
            '<button class="stub-switch" :aria-label="ariaLabel" @click="$emit(\'update:modelValue\', !modelValue)">{{ modelValue }}</button>',
        },
      },
    },
  })
}

describe('PathwaySettings interactions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('emits update:modelValue with new combinationWindow when select changes', async () => {
    const wrapper = mountIt()
    await wrapper.find('[aria-label="Collapse window (days)"]').trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![0]![0] as PathwayDesign
    expect(next.combinationWindow).not.toBe(baseModel.combinationWindow)
    expect(next.minCellCount).toBe(baseModel.minCellCount)
  })

  it('emits update:modelValue with new minCellCount when select changes', async () => {
    const wrapper = mountIt()
    await wrapper.find('[aria-label="Minimum cell count"]').trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![0]![0] as PathwayDesign
    expect(next.minCellCount).not.toBe(baseModel.minCellCount)
  })

  it('emits update:modelValue with new maxDepth when select changes', async () => {
    const wrapper = mountIt()
    await wrapper.find('[aria-label="Maximum path length"]').trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![0]![0] as PathwayDesign
    expect(next.maxDepth).not.toBe(baseModel.maxDepth)
  })

  it('emits update:modelValue toggling allowRepeats when switch fires', async () => {
    const wrapper = mountIt()
    await wrapper.find('[aria-label="Allow repeats"]').trigger('click')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const next = emits![0]![0] as PathwayDesign
    expect(next.allowRepeats).toBe(true)
  })

  it('does not emit when select returns null', async () => {
    // Stub that emits null on click. PathwaySettings guards `v !== null`.
    const wrapper = mount(PathwaySettings, {
      props: { modelValue: baseModel, readonly: false },
      global: {
        plugins: [vuetify],
        stubs: {
          AtlasSelect: {
            name: 'AtlasSelect',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<button class="stub-select" @click="$emit(\'update:modelValue\', null)" />',
          },
          AtlasSwitch: {
            name: 'AtlasSwitch',
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template:
              '<button class="stub-switch" @click="$emit(\'update:modelValue\', null)" />',
          },
        },
      },
    })
    const selects = wrapper.findAll('.stub-select')
    for (const sel of selects) await sel.trigger('click')
    await wrapper.find('.stub-switch').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })
})
