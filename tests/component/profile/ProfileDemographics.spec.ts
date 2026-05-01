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
    // Age renders as just the number (no "y" suffix).
    expect(wrapper.find('[data-test="profile-age"]').text()).toBe('52')
    // Events use toLocaleString() so 4829 renders as 4,829.
    expect(wrapper.find('[data-test="profile-count"]').text()).toBe('4,829')
  })

  it('age tooltip uses "observation" wording when no cohort context', () => {
    const { wrapper } = makeWrapper()
    // v-tooltip teleports its content; inspect the VTooltip component's
    // `text` prop instead of the rendered DOM.
    const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
    const texts = tooltips.map(t => String(t.props('text') ?? '').toLowerCase())
    expect(texts.some(t => t.includes('observation'))).toBe(true)
  })

  it('age tooltip uses "index" wording when cohort context present', () => {
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
    const tooltips = w.findAllComponents({ name: 'VTooltip' })
    const texts = tooltips.map(t => String(t.props('text') ?? '').toLowerCase())
    expect(texts.some(t => t.includes('index'))).toBe(true)
  })

  it('shows male icon for MALE gender', () => {
    setActivePinia(createPinia())
    const store = useProfileStore()
    store.person = {
      gender: 'MALE', yearOfBirth: 1985, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 100,
      records: [], cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileDemographics, { global: { plugins: [vuetify] } })
    expect(w.html()).toContain('mdi-gender-male')
  })

  it('falls back to mdi-help-circle-outline for unknown gender', () => {
    setActivePinia(createPinia())
    const store = useProfileStore()
    store.person = {
      gender: 'OTHER', yearOfBirth: 1985, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 0,
      records: [], cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileDemographics, { global: { plugins: [vuetify] } })
    expect(w.html()).toContain('mdi-help-circle-outline')
  })
})
