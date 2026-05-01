import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileFilterChips from '@/components/profile/ProfileFilterChips.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

function seedTwoDomains() {
  const s = useProfileStore()
  s.person = {
    gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 40, recordCount: 3,
    records: [
      { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
      { conceptId: 2, conceptName: 'B', domain: 'Drug', startDate: 1, endDate: null, startDay: 1, endDay: null },
      { conceptId: 3, conceptName: 'C', domain: 'Condition', startDate: 1, endDate: null, startDay: 2, endDay: null },
    ],
    cohorts: [], observationPeriods: [],
  } as never
  return s
}

describe('ProfileFilterChips', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders one chip per domain present in store.domainCounts', () => {
    seedTwoDomains()
    const w = mount(ProfileFilterChips, { global: { plugins: [vuetify] } })
    expect(w.find('[data-test-domain="Drug"]').exists()).toBe(true)
    expect(w.find('[data-test-domain="Condition"]').exists()).toBe(true)
  })

  it('clicking an inactive chip activates the domain filter', async () => {
    const s = seedTwoDomains()
    const w = mount(ProfileFilterChips, { global: { plugins: [vuetify] } })
    const chip = w.find('[data-test="profile-chip-Drug"]')
    expect(chip.exists()).toBe(true)
    await chip.trigger('click')
    expect(s.domainFilter.has('Drug')).toBe(true)
    // After toggling on, the chip flips to the active variant.
    await w.vm.$nextTick()
    expect(w.find('[data-test-domain="Drug"]').attributes('data-test')).toBe('profile-chip-active')
  })

  it('clicking an active chip toggles it back off', async () => {
    const s = seedTwoDomains()
    s.setDomainFilter('Drug', true)
    const w = mount(ProfileFilterChips, { global: { plugins: [vuetify] } })
    const active = w.find('[data-test-domain="Drug"]')
    expect(active.attributes('data-test')).toBe('profile-chip-active')
    await active.trigger('click')
    expect(s.domainFilter.has('Drug')).toBe(false)
  })
})
