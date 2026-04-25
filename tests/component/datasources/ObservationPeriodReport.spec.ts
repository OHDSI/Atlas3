import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import ObservationPeriodReport from '@/components/datasources/ObservationPeriodReport.vue'
import type { ObservationPeriodReport as OPR } from '@/models/datasource.types'

const vuetify = createVuetify({ components, directives })

function makeData(overrides: Partial<OPR> = {}): OPR {
  return {
    ageAtFirst: { categories: ['0', '1'], values: [1, 2] },
    observationLength: { categories: ['30', '60'], values: [100, 200] },
    cumulativeObservation: { categories: ['30', '60'], series: [{ name: 'c', data: [10, 20] }] },
    observedByMonth: { categories: ['202301'], series: [{ name: 'o', data: [100] }] },
    ageByGender: [{ category: 'M', min: 0, p10: 5, p25: 15, median: 35, p75: 55, p90: 70, max: 90 }],
    durationByGender: [{ category: 'M', min: 1, p10: 30, p25: 100, median: 365, p75: 730, p90: 1095, max: 3650 }],
    durationByAgeDecile: [{ category: '0-9', min: 1, p10: 30, p25: 100, median: 365, p75: 730, p90: 1095, max: 3650 }],
    personsWithContinuousObsByYear: { categories: ['2005'], values: [1000] },
    observationPeriodsPerPerson: [{ name: '1', value: 900 }],
    ...overrides
  }
}

describe('ObservationPeriodReport', () => {
  it('renders all 9 chart sections when data is complete', () => {
    const wrapper = mount(ObservationPeriodReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: { data: makeData() }
    })

    expect(wrapper.find('[data-testid=age-at-first-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=observation-length-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=cumulative-observation-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=observed-by-month-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=age-by-gender-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=duration-by-gender-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=duration-by-age-decile-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=persons-continuous-by-year-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=observation-periods-per-person-chart]').exists()).toBe(true)
  })

  it('hides chart sections when data is missing', () => {
    const wrapper = mount(ObservationPeriodReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: { data: makeData({ ageByGender: undefined, durationByAgeDecile: undefined }) }
    })

    expect(wrapper.find('[data-testid=age-by-gender-chart]').exists()).toBe(false)
    expect(wrapper.find('[data-testid=duration-by-age-decile-chart]').exists()).toBe(false)
  })

  it('renders empty state when every section is empty', () => {
    const wrapper = mount(ObservationPeriodReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: {
        data: {
          ageAtFirst: { categories: [], values: [] },
          observationLength: { categories: [], values: [] },
          cumulativeObservation: { categories: [], series: [] },
          observedByMonth: { categories: [], series: [] },
          ageByGender: [],
          durationByGender: [],
          durationByAgeDecile: [],
          personsWithContinuousObsByYear: { categories: [], values: [] },
          observationPeriodsPerPerson: []
        }
      }
    })

    expect(wrapper.find('[data-testid=empty-report-state]').exists()).toBe(true)
  })

  it('does not render empty state when at least one section has data', () => {
    const wrapper = mount(ObservationPeriodReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: { data: makeData() }
    })

    expect(wrapper.find('[data-testid=empty-report-state]').exists()).toBe(false)
  })
})
