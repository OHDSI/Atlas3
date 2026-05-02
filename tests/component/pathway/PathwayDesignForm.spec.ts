import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PathwayDesignForm from '@/components/pathway/PathwayDesignForm.vue'
import { usePathwayStore } from '@/stores/pathway'

vi.mock('@/services/webapi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    listPathwayExecutions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  }
})

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
    expect(t).toContain('Description')
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

  it('renders each design section as a collapsible panel', () => {
    const store = usePathwayStore()
    store.createNewPathway()
    const w = mount(PathwayDesignForm, {
      global: { plugins: [vuetify], stubs: ['PathwayCohortList', 'PathwayCohortPicker', 'PathwaySettings', 'PathwayPastRuns'] },
    })
    const panels = w.findAllComponents({ name: 'VExpansionPanel' })
    expect(panels.length).toBeGreaterThanOrEqual(4)
  })

  it('renders PathwayPastRuns when pathwayId is provided', () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 1
    const w = mount(PathwayDesignForm, {
      props: { pathwayId: 1 },
      global: { plugins: [vuetify], stubs: ['PathwayCohortList', 'PathwayCohortPicker', 'PathwaySettings', 'PathwayPastRuns'] },
    })
    expect(w.findComponent({ name: 'PathwayPastRuns' }).exists()).toBe(true)
  })
})
