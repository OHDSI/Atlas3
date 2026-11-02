import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationDesignRail from '@/components/characterization/CharacterizationDesignRail.vue'
import type { CharacterizationDefinition } from '@/models/characterization.types'

const vuetify = createVuetify({ components, directives })
const emptyDraft = (): CharacterizationDefinition => ({
  name: '', description: '', cohorts: [], featureAnalyses: [], stratas: [],
})

describe('CharacterizationDesignRail', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the design form', () => {
    const w = mount(CharacterizationDesignRail, {
      global: { plugins: [vuetify], stubs: ['CharacterizationDesignForm'] },
      props: {
        modelValue: emptyDraft(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
      },
    })
    expect(w.findComponent({ name: 'CharacterizationDesignForm' }).exists()).toBe(true)
  })

  it('forwards update:modelValue from the form', async () => {
    const w = mount(CharacterizationDesignRail, {
      global: {
        plugins: [vuetify],
        stubs: {
          CharacterizationDesignForm: {
            template: '<div data-testid="stub-form" @click="$emit(\'update:modelValue\', { name: \'x\' })"></div>',
            emits: ['update:modelValue'],
          },
        },
      },
      props: {
        modelValue: emptyDraft(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
      },
    })
    await w.find('[data-testid="stub-form"]').trigger('click')
    expect(w.emitted('update:modelValue')?.[0]).toEqual([{ name: 'x' }])
  })

  it('re-emits create-feature-analysis from the form', async () => {
    const w = mount(CharacterizationDesignRail, {
      global: {
        plugins: [vuetify],
        stubs: {
          CharacterizationDesignForm: {
            template: '<div data-testid="stub-form" @click="$emit(\'create-feature-analysis\', { type: \'CUSTOM_FE\' })"></div>',
            emits: ['create-feature-analysis', 'update:modelValue'],
          },
        },
      },
      props: { modelValue: emptyDraft(), availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await w.find('[data-testid="stub-form"]').trigger('click')
    expect(w.emitted('create-feature-analysis')).toEqual([[{ type: 'CUSTOM_FE' }]])
  })

  it('forwards createDisabledReason to the form', () => {
    const w = mount(CharacterizationDesignRail, {
      global: { plugins: [vuetify], stubs: ['CharacterizationDesignForm'] },
      props: {
        modelValue: emptyDraft(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
        createDisabledReason: 'Name it first',
      },
    })
    expect(
      w.findComponent({ name: 'CharacterizationDesignForm' }).props('createDisabledReason')
    ).toBe('Name it first')
  })
})
