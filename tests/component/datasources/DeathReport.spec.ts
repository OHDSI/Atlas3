import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import DeathReport from '@/components/datasources/DeathReport.vue'
import type { DeathReport as DR } from '@/models/datasource.types'

const vuetify = createVuetify({ components, directives })

function makeData(overrides: Partial<DR> = {}): DR {
  return {
    ageAtDeath: [{ category: 'MALE', min: 30, p10: 45, p25: 58, median: 70, p75: 80, p90: 88, max: 100 }],
    deathByType: [{ name: 'Natural', value: 100 }],
    prevalenceByMonth: { categories: ['202301'], series: [{ name: 'p', data: [12] }] },
    prevalenceByGenderAgeYear: {
      categories: ['60 - 69'],
      series: [{ name: 'MALE', category: '60 - 69', data: [{ x: 2010, y: 12 }] }]
    },
    ...overrides
  }
}

describe('DeathReport', () => {
  it('renders trellis chart for prevalence by age/gender/year', () => {
    const wrapper = mount(DeathReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: { data: makeData() }
    })

    expect(wrapper.find('[data-testid=prevalence-by-gender-age-year-chart]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TrellisChart' }).exists()).toBe(true)
  })

  it('hides trellis section when data missing', () => {
    const wrapper = mount(DeathReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: { data: makeData({ prevalenceByGenderAgeYear: undefined }) }
    })

    expect(wrapper.find('[data-testid=prevalence-by-gender-age-year-chart]').exists()).toBe(false)
  })

  it('renders empty state when every section is empty', () => {
    const wrapper = mount(DeathReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: {
        data: {
          ageAtDeath: [],
          deathByType: [],
          prevalenceByMonth: { categories: [], series: [{ name: 'Prevalence per 1000', data: [] }] },
          prevalenceByGenderAgeYear: undefined
        }
      }
    })

    expect(wrapper.find('[data-testid=empty-report-state]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=prevalence-by-month-chart]').exists()).toBe(false)
  })

  it('does not render empty state when at least one section has data', () => {
    const wrapper = mount(DeathReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: { data: makeData() }
    })

    expect(wrapper.find('[data-testid=empty-report-state]').exists()).toBe(false)
  })
})
