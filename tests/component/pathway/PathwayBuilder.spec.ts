import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PathwayBuilder from '@/components/pathway/PathwayBuilder.vue'
import { usePathwayStore } from '@/stores/pathway'

const vuetify = createVuetify({ components, directives })

describe('PathwayBuilder', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders empty state with no current pathway', () => {
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify],
        stubs: ['router-link', 'PathwayBuilderToolbar', 'PathwayDesignForm', 'PathwayGenerationPanel'],
      },
    })
    expect(w.text()).toMatch(/No pathway loaded/i)
  })

  it('renders editor when a pathway is loaded', () => {
    const store = usePathwayStore()
    store.createNewPathway()
    const w = mount(PathwayBuilder, {
      global: {
        plugins: [vuetify],
        stubs: ['router-link', 'PathwayBuilderToolbar', 'PathwayDesignForm', 'PathwayGenerationPanel'],
      },
    })
    expect(w.text()).not.toMatch(/No pathway loaded/i)
  })
})
