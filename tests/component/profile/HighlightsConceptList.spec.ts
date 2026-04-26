import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HighlightsConceptList from '@/components/profile/HighlightsConceptList.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

describe('HighlightsConceptList', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists unique concepts with counts', () => {
    const s = useProfileStore()
    s.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 3,
      records: [
        { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
        { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 1, endDay: null },
        { conceptId: 2, conceptName: 'B', domain: 'Drug', startDate: 1, endDate: null, startDay: 2, endDay: null },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(HighlightsConceptList, { global: { plugins: [vuetify] } })
    expect(w.text()).toContain('A')
    expect(w.text()).toContain('2')
  })

  it('emits selectionChange with chosen concept ids', async () => {
    const s = useProfileStore()
    s.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 1,
      records: [
        { conceptId: 7, conceptName: 'Z', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(HighlightsConceptList, { global: { plugins: [vuetify] } })
    await w.find('[data-test="highlight-concept-cb-7"] input').setValue(true)
    expect(w.emitted('selectionChange')?.[0]?.[0]).toEqual([7])
  })

  it('drops selections whose concept disappears from filtered records', async () => {
    const s = useProfileStore()
    s.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 1,
      records: [
        { conceptId: 7, conceptName: 'Z', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(HighlightsConceptList, { global: { plugins: [vuetify] } })
    await w.find('[data-test="highlight-concept-cb-7"] input').setValue(true)
    expect(w.emitted('selectionChange')?.[0]?.[0]).toEqual([7])
    // Now filter so the concept disappears
    s.setTextFilter('nope')
    await w.vm.$nextTick()
    await w.vm.$nextTick()
    const events = w.emitted('selectionChange') ?? []
    expect(events[events.length - 1]?.[0]).toEqual([])
  })
})
