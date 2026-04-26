import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileEventsTable from '@/components/profile/ProfileEventsTable.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

describe('ProfileEventsTable', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders rows from filteredRecords', () => {
    const s = useProfileStore()
    s.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 1,
      records: [
        { conceptId: 1, conceptName: 'Lisinopril', domain: 'Drug', startDate: 1, endDate: null, startDay: -45, endDay: null },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileEventsTable, { global: { plugins: [vuetify] } })
    expect(w.text()).toContain('Lisinopril')
    expect(w.text()).toContain('-45')
  })

  it('search input updates store textFilter', async () => {
    const s = useProfileStore()
    s.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 0, records: [], cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileEventsTable, { global: { plugins: [vuetify] } })
    await w.find('[data-test="profile-search"] input').setValue('foo')
    expect(s.textFilter).toBe('foo')
  })
})
