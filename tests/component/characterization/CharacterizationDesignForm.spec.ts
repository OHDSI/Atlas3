import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationDesignForm from '@/components/characterization/CharacterizationDesignForm.vue'
import type { CharacterizationDefinition } from '@/models/characterization.types'

const vuetify = createVuetify({ components, directives })

const empty = (): CharacterizationDefinition => ({
  name: '', description: '', cohorts: [], featureAnalyses: [], stratas: [],
})

describe('CharacterizationDesignForm', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the four sub-pickers', () => {
    const w = mount(CharacterizationDesignForm, {
      global: {
        plugins: [vuetify],
        stubs: ['LinkedCohortPicker', 'LinkedFeatureAnalysisPicker', 'StrataEditor'],
      },
      props: {
        modelValue: empty(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
      },
    })
    expect(w.findComponent({ name: 'LinkedCohortPicker' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'LinkedFeatureAnalysisPicker' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'StrataEditor' }).exists()).toBe(true)
  })

  it('forwards update:strata-only from StrataEditor as a strataOnly model update', async () => {
    const w = mount(CharacterizationDesignForm, {
      global: {
        plugins: [vuetify],
        stubs: {
          LinkedCohortPicker: true,
          LinkedFeatureAnalysisPicker: true,
          StrataEditor: {
            template: '<div data-testid="stub-strata" @click="$emit(\'update:strata-only\', true)"></div>',
            emits: ['update:modelValue', 'update:strata-only'],
          },
        },
      },
      props: {
        modelValue: empty(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
      },
    })
    await w.find('[data-testid="stub-strata"]').trigger('click')
    const evts = w.emitted('update:modelValue')
    expect(evts).toBeTruthy()
    expect((evts![0]![0] as CharacterizationDefinition).strataOnly).toBe(true)
  })

  it('re-emits create-feature-analysis from the picker', async () => {
    const w = mount(CharacterizationDesignForm, {
      global: {
        plugins: [vuetify],
        stubs: {
          LinkedCohortPicker: true,
          StrataEditor: true,
          LinkedFeatureAnalysisPicker: {
            template: '<div data-testid="stub-fa" @click="$emit(\'create-feature-analysis\', { type: \'CUSTOM_FE\' })"></div>',
            emits: ['create-feature-analysis', 'update:modelValue'],
          },
        },
      },
      props: { modelValue: empty(), availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await w.find('[data-testid="stub-fa"]').trigger('click')
    expect(w.emitted('create-feature-analysis')).toEqual([[{ type: 'CUSTOM_FE' }]])
  })

  it('forwards createDisabledReason to the picker', () => {
    const w = mount(CharacterizationDesignForm, {
      global: {
        plugins: [vuetify],
        stubs: ['LinkedCohortPicker', 'LinkedFeatureAnalysisPicker', 'StrataEditor'],
      },
      props: {
        modelValue: empty(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
        createDisabledReason: 'Name it first',
      },
    })
    expect(
      w.findComponent({ name: 'LinkedFeatureAnalysisPicker' }).props('createDisabledReason')
    ).toBe('Name it first')
  })
})
