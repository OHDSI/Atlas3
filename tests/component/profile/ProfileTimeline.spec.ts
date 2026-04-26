import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileTimeline from '@/components/profile/ProfileTimeline.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

describe('ProfileTimeline', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders v-chart with one series per domain', () => {
    const store = useProfileStore()
    store.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 2,
      records: [
        { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
        { conceptId: 2, conceptName: 'B', domain: 'Condition', startDate: 1, endDate: null, startDay: 1, endDay: null },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileTimeline, {
      global: { plugins: [vuetify], stubs: { 'v-chart': { template: '<div data-test="vchart" :data-options="JSON.stringify($attrs.option)" />' } } },
    })
    const opts = JSON.parse(w.find('[data-test="vchart"]').attributes('data-options') || '{}')
    expect(opts.series?.length).toBe(2)
  })

  it('emits brush with [from,to] day range', async () => {
    const store = useProfileStore()
    store.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 0, records: [], cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileTimeline, {
      global: { plugins: [vuetify], stubs: { 'v-chart': true } },
    })
    ;(w.vm as { onBrush?: (e: unknown) => void }).onBrush?.({ areas: [{ coordRange: [-30, 60] }] })
    expect(store.dateRange).toEqual([-30, 60])
  })
})
