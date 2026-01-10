/**
 * DashboardReport Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DashboardReport from '@/components/datasources/DashboardReport.vue'
import type { DashboardReport as DashboardReportData } from '@/models/datasource.types'

// Mock child components
vi.mock('@/components/datasources/shared/CDMSummaryTable.vue', () => ({
  default: { name: 'CDMSummaryTable', template: '<div class="cdm-summary-table"></div>', props: ['data'] }
}))
vi.mock('@/components/datasources/shared/ChartSection.vue', () => ({
  default: { name: 'ChartSection', template: '<div class="chart-section"><slot /></div>', props: ['title'] }
}))
vi.mock('@/components/datasources/charts/DashboardGenderChart.vue', () => ({
  default: { name: 'DashboardGenderChart', template: '<div class="gender-chart"></div>', props: ['data', 'height'] }
}))
vi.mock('@/components/datasources/charts/DashboardAgeChart.vue', () => ({
  default: { name: 'DashboardAgeChart', template: '<div class="age-chart"></div>', props: ['data', 'height'] }
}))
vi.mock('@/components/datasources/charts/DashboardCumulativeChart.vue', () => ({
  default: { name: 'DashboardCumulativeChart', template: '<div class="cumulative-chart"></div>', props: ['data', 'height'] }
}))
vi.mock('@/components/datasources/charts/DashboardObservationMonthChart.vue', () => ({
  default: { name: 'DashboardObservationMonthChart', template: '<div class="observation-month-chart"></div>', props: ['data', 'height'] }
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ({ value: fallback })
  })
}))

const vuetify = createVuetify({ components, directives })

const mockData: DashboardReportData = {
  summary: {
    sourceName: 'Test Data Source',
    personCount: 1000
  },
  genderDistribution: [
    { name: 'Male', value: 500 },
    { name: 'Female', value: 500 }
  ],
  ageDistribution: {
    categories: ['0-10', '11-20', '21-30'],
    series: [{ name: 'Age', data: [100, 200, 300] }]
  },
  cumulativeObservation: {
    categories: ['2020', '2021', '2022'],
    series: [{ name: 'Observation', data: [100, 200, 300] }]
  },
  observationByMonth: {
    categories: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'Persons', data: [100, 150, 200] }]
  }
}

function mountComponent(props = {}) {
  return mount(DashboardReport, {
    props: {
      data: mockData,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('DashboardReport', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountComponent()
  })

  it('should mount without errors', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.dashboard-report').exists()).toBe(true)
  })

  it('should render CDM summary table', () => {
    const summaryTable = wrapper.findComponent({ name: 'CDMSummaryTable' })
    expect(summaryTable.exists()).toBe(true)
  })

  it('should render four chart sections', () => {
    const chartSections = wrapper.findAllComponents({ name: 'ChartSection' })
    expect(chartSections.length).toBe(4)
  })

  it('should render gender distribution chart', () => {
    const genderChart = wrapper.findComponent({ name: 'DashboardGenderChart' })
    expect(genderChart.exists()).toBe(true)
    expect(genderChart.props('data')).toEqual(mockData.genderDistribution)
  })

  it('should render age distribution chart', () => {
    const ageChart = wrapper.findComponent({ name: 'DashboardAgeChart' })
    expect(ageChart.exists()).toBe(true)
    expect(ageChart.props('data')).toEqual(mockData.ageDistribution)
  })

  it('should render cumulative observation chart', () => {
    const cumulativeChart = wrapper.findComponent({ name: 'DashboardCumulativeChart' })
    expect(cumulativeChart.exists()).toBe(true)
    expect(cumulativeChart.props('data')).toEqual(mockData.cumulativeObservation)
  })

  it('should render observation by month chart', () => {
    const monthChart = wrapper.findComponent({ name: 'DashboardObservationMonthChart' })
    expect(monthChart.exists()).toBe(true)
    expect(monthChart.props('data')).toEqual(mockData.observationByMonth)
  })

  it('should render charts with correct height', () => {
    const genderChart = wrapper.findComponent({ name: 'DashboardGenderChart' })
    expect(genderChart.props('height')).toBe(300)
  })

  it('should use responsive grid layout', () => {
    const rows = wrapper.findAllComponents({ name: 'VRow' })
    expect(rows.length).toBeGreaterThan(0)

    const cols = wrapper.findAllComponents({ name: 'VCol' })
    expect(cols.length).toBeGreaterThan(0)
  })
})
