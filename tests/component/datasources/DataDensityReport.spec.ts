import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import DataDensityReport from '@/components/datasources/DataDensityReport.vue'
import type { DataDensityReport as DDR } from '@/models/datasource.types'

const vuetify = createVuetify({ components, directives })

function makeData(overrides: Partial<DDR> = {}): DDR {
  return {
    totalRecords: {
      xAxisType: 'time',
      monthCodes: [202301, 202302],
      series: [{ name: 'Total', data: [10, 20] }],
    },
    recordsPerPerson: {
      xAxisType: 'time',
      monthCodes: [202301, 202302],
      series: [{ name: 'Records', data: [1, 2] }],
    },
    conceptsPerPerson: [
      { category: 'C', min: 0, p10: 1, p25: 2, median: 3, p75: 4, p90: 5, max: 6 },
    ],
    ...overrides,
  }
}

describe('DataDensityReport', () => {
  it('renders the monthly multi-line charts and the box plot', () => {
    const wrapper = mount(DataDensityReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: { data: makeData() },
    })

    expect(wrapper.findAllComponents({ name: 'MultiLineChart' }).length).toBe(2)
    expect(wrapper.findComponent({ name: 'AtlasBoxPlotChart' }).exists()).toBe(true)
  })

  it('hides the concepts-per-person section when empty', () => {
    const wrapper = mount(DataDensityReport, {
      global: { plugins: [vuetify, createPinia()] },
      props: { data: makeData({ conceptsPerPerson: [] }) },
    })

    expect(wrapper.findComponent({ name: 'AtlasBoxPlotChart' }).exists()).toBe(false)
  })
})
