import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileToolbar from '@/components/profile/ProfileToolbar.vue'
import { useProfileStore } from '@/stores/profile'

vi.mock('@/services/profile.service', () => ({
  getPerson: vi.fn().mockResolvedValue({ success: true, data: {
    gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 40, recordCount: 0, records: [], cohorts: [], observationPeriods: [],
  }}),
  getCohortConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const vuetify = createVuetify({ components, directives })

describe('ProfileToolbar', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('renders the page title', () => {
    const w = mount(ProfileToolbar, { global: { plugins: [vuetify] } })
    expect(w.text().toLowerCase()).toContain('profile')
  })

  it('disables refresh when source or personId missing', () => {
    const w = mount(ProfileToolbar, { global: { plugins: [vuetify] } })
    const btn = w.find('[data-test="profile-refresh"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('enables refresh when source + personId set; click triggers loadPerson', async () => {
    const s = useProfileStore()
    s.setRouteParams({ sourceKey: 'SYNPUF', personId: 7 })
    const w = mount(ProfileToolbar, { global: { plugins: [vuetify] } })
    const btn = w.find('[data-test="profile-refresh"]')
    expect(btn.attributes('disabled')).toBeUndefined()
    await btn.trigger('click')
    const { getPerson } = await import('@/services/profile.service')
    expect(getPerson).toHaveBeenCalledWith('SYNPUF', 7, undefined)
  })
})
