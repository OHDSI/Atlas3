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

  it('renders form and past runs', () => {
    const w = mount(CharacterizationDesignRail, {
      global: { plugins: [vuetify], stubs: ['CharacterizationDesignForm', 'CharacterizationPastRuns'] },
      props: {
        modelValue: emptyDraft(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
        runs: [],
        activeRunId: null,
        showPastRuns: true,
      },
    })
    expect(w.findComponent({ name: 'CharacterizationDesignForm' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'CharacterizationPastRuns' }).exists()).toBe(true)
  })

  it('hides past runs when showPastRuns=false', () => {
    const w = mount(CharacterizationDesignRail, {
      global: { plugins: [vuetify], stubs: ['CharacterizationDesignForm', 'CharacterizationPastRuns'] },
      props: {
        modelValue: emptyDraft(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
        runs: [],
        activeRunId: null,
        showPastRuns: false,
      },
    })
    expect(w.findComponent({ name: 'CharacterizationPastRuns' }).exists()).toBe(false)
  })

  it('forwards select events from past runs', async () => {
    const w = mount(CharacterizationDesignRail, {
      global: {
        plugins: [vuetify],
        stubs: {
          CharacterizationDesignForm: true,
          CharacterizationPastRuns: {
            template: '<div data-testid="stub-pastruns" @click="$emit(\'select\', 99)"></div>',
            emits: ['select'],
          },
        },
      },
      props: {
        modelValue: emptyDraft(),
        availableCohorts: [],
        availableFeatureAnalyses: [],
        runs: [],
        activeRunId: null,
        showPastRuns: true,
      },
    })
    await w.find('[data-testid="stub-pastruns"]').trigger('click')
    expect(w.emitted('select-run')?.[0]).toEqual([99])
  })
})
