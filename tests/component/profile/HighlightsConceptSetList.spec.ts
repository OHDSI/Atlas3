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

  it('clicking a concept set toggles selection and emits selectionChange', async () => {
    const s = useProfileStore()
    s.cohortConceptSets = [{ id: 0, name: 'A' }, { id: 1, name: 'B' }]
    const w = mount(HighlightsConceptSetList, { global: { plugins: [vuetify] } })
    const items = w.findAll('.v-list-item')
    await items[0]!.trigger('click')
    expect(w.emitted('selectionChange')?.[0]?.[0]).toEqual([0])
    await items[1]!.trigger('click')
    expect(w.emitted('selectionChange')?.[1]?.[0]).toEqual([0, 1])
  })

  it('toggling a selected set removes it from the selection', async () => {
    const s = useProfileStore()
    s.cohortConceptSets = [{ id: 7, name: 'X' }]
    const w = mount(HighlightsConceptSetList, { global: { plugins: [vuetify] } })
    const item = w.find('.v-list-item')
    await item.trigger('click')
    await item.trigger('click')
    const events = w.emitted('selectionChange') ?? []
    expect(events[events.length - 1]?.[0]).toEqual([])
  })
})
