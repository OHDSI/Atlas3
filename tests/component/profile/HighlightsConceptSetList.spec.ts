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

  it('renders cohort concept sets when present', () => {
    const s = useProfileStore()
    s.cohortConceptSets = [{ id: 0, name: 'ACE Inhibitors' }, { id: 1, name: 'Diagnoses' }]
    const w = mount(HighlightsConceptSetList, { global: { plugins: [vuetify] } })
    expect(w.text()).toContain('ACE Inhibitors')
    expect(w.text()).toContain('Diagnoses')
  })

  it('shows empty state when no concept sets', () => {
    useProfileStore()
    const w = mount(HighlightsConceptSetList, { global: { plugins: [vuetify] } })
    expect(w.find('[data-test="cs-empty"]').exists()).toBe(true)
  })
})
