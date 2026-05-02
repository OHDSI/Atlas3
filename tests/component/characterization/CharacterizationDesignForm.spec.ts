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

  it('emits update:modelValue when name changes', async () => {
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
    await w.find('[data-testid="char-design-name"] input').setValue('Foo')
    const evts = w.emitted('update:modelValue')
    expect(evts).toBeTruthy()
    expect((evts![0]![0] as CharacterizationDefinition).name).toBe('Foo')
  })
})
