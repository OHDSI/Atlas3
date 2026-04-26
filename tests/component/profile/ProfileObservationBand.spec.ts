import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileObservationBand from '@/components/profile/ProfileObservationBand.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

function seed(periods: Array<{ startDays: number; endDays: number }>) {
  const s = useProfileStore()
  s.person = {
    gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 40, recordCount: 0, records: [], cohorts: [],
    observationPeriods: periods.map(p => ({ startDate: 1, endDate: 2, ...p })),
  } as never
  return s
}

describe('ProfileObservationBand', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders no <rect> when there are no observation periods', () => {
    useProfileStore()
    const w = mount(ProfileObservationBand, { global: { plugins: [vuetify] } })
    expect(w.findAll('rect')).toHaveLength(0)
  })

  it('renders one <rect> per observation period', () => {
    seed([{ startDays: -100, endDays: 100 }, { startDays: 200, endDays: 365 }])
    const w = mount(ProfileObservationBand, { global: { plugins: [vuetify] } })
    expect(w.findAll('rect')).toHaveLength(2)
  })

  it('maps a single band to the full viewBox width', () => {
    seed([{ startDays: -50, endDays: 50 }])
    const w = mount(ProfileObservationBand, { global: { plugins: [vuetify] } })
    const rect = w.find('rect')
    // x at min → 0, width spans full viewWidth (1000)
    expect(rect.attributes('x')).toBe('0')
    expect(Number(rect.attributes('width'))).toBeCloseTo(1000, 0)
  })

  it('clamps width to at least 1 when band is degenerate (x1 === x2)', () => {
    seed([{ startDays: 0, endDays: 0 }])
    const w = mount(ProfileObservationBand, { global: { plugins: [vuetify] } })
    const rect = w.find('rect')
    expect(Number(rect.attributes('width'))).toBeGreaterThanOrEqual(1)
  })
})
