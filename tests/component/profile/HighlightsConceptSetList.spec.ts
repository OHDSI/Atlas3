import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HighlightsConceptSetList from '@/components/profile/HighlightsConceptSetList.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

describe('HighlightsConceptSetList', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders empty hint when no concept sets', () => {
    useProfileStore()
    const w = mount(HighlightsConceptSetList, { global: { plugins: [vuetify] } })
    expect(w.find('[data-test="cs-empty"]').exists()).toBe(true)
  })

  it('renders one row per concept set, each with an inert dot', () => {
    const s = useProfileStore()
    s.cohortConceptSets = [{ id: 0, name: 'ACE Inhibitors' }, { id: 1, name: 'Diagnoses' }]
    const w = mount(HighlightsConceptSetList, { global: { plugins: [vuetify] } })
    expect(w.text()).toContain('ACE Inhibitors')
    expect(w.text()).toContain('Diagnoses')
    expect(w.find('[data-test="highlight-color-dot-set-0"]').exists()).toBe(true)
    expect(w.find('[data-test="highlight-color-dot-set-1"]').exists()).toBe(true)
  })

  it('the concept-set dot is inert (aria-disabled, no click handler)', () => {
    const s = useProfileStore()
    s.cohortConceptSets = [{ id: 7, name: 'X' }]
    const w = mount(HighlightsConceptSetList, { global: { plugins: [vuetify] } })
    const dot = w.find('[data-test="highlight-color-dot-set-7"]')
    expect(dot.exists()).toBe(true)
    expect(dot.attributes('aria-disabled')).toBe('true')
    // No emits and no store mutation should occur from interacting with the dot.
    expect(w.emitted('selectionChange')).toBeUndefined()
    expect(s.highlights.size).toBe(0)
  })
})
