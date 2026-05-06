import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PathwayDesignForm from '@/components/pathway/PathwayDesignForm.vue'
import { usePathwayStore } from '@/stores/pathway'

const vuetify = createVuetify({ components, directives })

describe('PathwayDesignForm', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders sections for description, target, event, and settings when a pathway is loaded', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    const w = mount(PathwayDesignForm, {
      global: { plugins: [vuetify] },
    })
    await flushPromises()
    const t = w.text()
    expect(t).toContain('Target')
    expect(t).toContain('Event')
    expect(t).toContain('Settings')
  })

  it('renders nothing when no current pathway', () => {
    const w = mount(PathwayDesignForm, {
      global: { plugins: [vuetify] },
    })
    expect(w.find('.pathway-design-form').exists()).toBe(false)
  })

  it('renders each design section as a flat rail block', () => {
    const store = usePathwayStore()
    store.createNewPathway()
    const w = mount(PathwayDesignForm, {
      global: { plugins: [vuetify], stubs: ['PathwayCohortList', 'PathwayCohortPicker', 'PathwaySettings'] },
    })
    const sections = w.findAll('section.rail-section')
    expect(sections.length).toBe(3)
  })
})
