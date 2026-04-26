import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileDemographics from '@/components/profile/ProfileDemographics.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

function makeWrapper() {
  setActivePinia(createPinia())
  const store = useProfileStore()
  store.person = {
    gender: 'FEMALE', yearOfBirth: 1972, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 52, recordCount: 4829,
    records: [], cohorts: [], observationPeriods: [],
  } as never
  return { store, wrapper: mount(ProfileDemographics, { global: { plugins: [vuetify] } }) }
}

describe('ProfileDemographics', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows female icon and demographics', () => {
    const { wrapper } = makeWrapper()
    const html = wrapper.html()
    expect(html).toContain('mdi-gender-female')
    expect(html).toContain('1972')
    expect(html).toContain('52')
    expect(html).toContain('4829')
  })

  it('uses "at start of observation" wording when no cohort context', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.text().toLowerCase()).toContain('observation')
  })

  it('uses "at index" wording when cohort context present', () => {
    setActivePinia(createPinia())
    const store = useProfileStore()
    store.setRouteParams({ sourceKey: 'X', personId: 1, cohortDefinitionId: 42 })
    store.person = {
      gender: 'MALE', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 42, recordCount: 0,
      records: [], cohorts: [{ cohortDefinitionId: 42, startDate: 1, endDate: null }],
      observationPeriods: [],
    } as never
    const w = mount(ProfileDemographics, { global: { plugins: [vuetify] } })
    expect(w.text().toLowerCase()).toContain('index')
  })
})
