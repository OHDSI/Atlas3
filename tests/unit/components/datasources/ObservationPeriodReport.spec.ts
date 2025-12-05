/**
 * ObservationPeriodReport Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ObservationPeriodReport from '@/components/datasources/ObservationPeriodReport.vue'
import type { ObservationPeriodReport as ObservationPeriodReportData } from '@/models/datasource.types'

// Mock child components
vi.mock('@/components/datasources/shared/ChartSection.vue', () => ({
  default: { name: 'ChartSection', template: '<div class="chart-section"><slot /></div>', props: ['title'] }
}))
vi.mock('@/components/reports/charts/BarChart.vue', () => ({
  default: { name: 'BarChart', template: '<div class="bar-chart"></div>', props: ['data', 'xAxisLabel', 'yAxisLabel'] }
}))
vi.mock('@/components/datasources/charts/MultiLineChart.vue', () => ({
  default: { name: 'MultiLineChart', template: '<div class="multi-line-chart"></div>', props: ['data', 'xAxisLabel', 'yAxisLabel'] }
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ({ value: fallback })
  })
}))

const vuetify = createVuetify({ components, directives })

const mockData: ObservationPeriodReportData = {
  ageAtFirst: {
    categories: ['0-10', '11-20', '21-30'],
    values: [100, 200, 300],
    unit: 'People'
  },
  observationLength: {
    categories: ['0-30', '31-60', '61-90'],
    values: [150, 250, 200],
    unit: 'People'
  },
  cumulativeObservation: {
    categories: ['0', '30', '60', '90'],
    series: [{ name: 'Observation', data: [0, 100, 200, 300] }]
  },
  observedByMonth: {
    categories: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'People', data: [100, 150, 200] }]
  },
  ageByGender: {
    categories: ['0-10', '11-20', '21-30'],
    series: [
      { name: 'Male', data: [50, 100, 150] },
      { name: 'Female', data: [50, 100, 150] }
    ]
  },
  durationByGender: {
    categories: ['Male', 'Female'],
    values: [365, 400],
    unit: 'Days'
  }
}

function mountComponent(props = {}) {
  return mount(ObservationPeriodReport, {
    props: {
      data: mockData,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('ObservationPeriodReport', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountComponent()
  })

  it('should mount without errors', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.observation-period-report').exists()).toBe(true)
  })

  it('should render chart sections for all data', () => {
    const chartSections = wrapper.findAllComponents({ name: 'ChartSection' })
    expect(chartSections.length).toBe(6)
  })

  it('should render age at first observation chart', () => {
    const barCharts = wrapper.findAllComponents({ name: 'BarChart' })
    expect(barCharts.length).toBeGreaterThanOrEqual(1)
  })

  it('should pass correct data to age at first chart', () => {
    const barCharts = wrapper.findAllComponents({ name: 'BarChart' })
    const ageAtFirstChart = barCharts[0]
    expect(ageAtFirstChart.props('data')).toEqual(mockData.ageAtFirst)
  })

  it('should render observation length chart', () => {
    const barCharts = wrapper.findAllComponents({ name: 'BarChart' })
    expect(barCharts.length).toBeGreaterThanOrEqual(2)
  })

  it('should render cumulative observation chart', () => {
    const multiLineCharts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    expect(multiLineCharts.length).toBeGreaterThanOrEqual(1)
  })

  it('should render observed by month chart', () => {
    const multiLineCharts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    expect(multiLineCharts.length).toBeGreaterThanOrEqual(2)
  })

  it('should render age by gender chart', () => {
    const multiLineCharts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    expect(multiLineCharts.length).toBeGreaterThanOrEqual(3)
  })

  it('should render duration by gender chart', () => {
    const barCharts = wrapper.findAllComponents({ name: 'BarChart' })
    expect(barCharts.length).toBeGreaterThanOrEqual(3)
  })

  it('should not render age at first when data is undefined', () => {
    const partialData = { ...mockData, ageAtFirst: undefined }
    const wrapper2 = mountComponent({ data: partialData })
    const chartSections = wrapper2.findAllComponents({ name: 'ChartSection' })
    expect(chartSections.length).toBe(5)
  })

  it('should not render observation length when data is undefined', () => {
    const partialData = { ...mockData, observationLength: undefined }
    const wrapper2 = mountComponent({ data: partialData })
    const chartSections = wrapper2.findAllComponents({ name: 'ChartSection' })
    expect(chartSections.length).toBe(5)
  })

  it('should not render cumulative observation when data is undefined', () => {
    const partialData = { ...mockData, cumulativeObservation: undefined }
    const wrapper2 = mountComponent({ data: partialData })
    const chartSections = wrapper2.findAllComponents({ name: 'ChartSection' })
    expect(chartSections.length).toBe(5)
  })

  it('should handle minimal data', () => {
    const minimalData: ObservationPeriodReportData = {}
    const wrapper2 = mountComponent({ data: minimalData })
    expect(wrapper2.exists()).toBe(true)
  })

  it('should use grid layout with rows and columns', () => {
    const rows = wrapper.findAllComponents({ name: 'VRow' })
    expect(rows.length).toBeGreaterThan(0)

    const cols = wrapper.findAllComponents({ name: 'VCol' })
    expect(cols.length).toBeGreaterThan(0)
  })

  it('should pass axis labels to charts', () => {
    const multiLineCharts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    const cumulativeChart = multiLineCharts[0]
    expect(cumulativeChart.props('xAxisLabel')).toBeTruthy()
    expect(cumulativeChart.props('yAxisLabel')).toBeTruthy()
  })

  it('should have test ids on charts for e2e testing', () => {
    // The component includes data-testid attributes
    expect(wrapper.html()).toContain('data-testid')
  })
})
