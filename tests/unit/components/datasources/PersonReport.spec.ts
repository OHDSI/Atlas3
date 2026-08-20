/**
 * PersonReport Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PersonReport from '@/components/datasources/PersonReport.vue'
import type { PersonReport as PersonReportData } from '@/models/datasource.types'

// Mock child components
vi.mock('@/components/datasources/shared/ChartSection.vue', () => ({
  default: { name: 'ChartSection', template: '<div class="chart-section"><slot /></div>', props: ['title'] }
}))
vi.mock('@/components/ui/charts/AtlasPieChart.vue', () => ({
  default: { name: 'AtlasPieChart', template: '<div class="pie-chart"></div>', props: ['data', 'height'] }
}))
vi.mock('@/components/datasources/charts/DashboardAgeChart.vue', () => ({
  default: { name: 'DashboardAgeChart', template: '<div class="dashboard-age-chart"></div>', props: ['data', 'height'] }
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ({ value: fallback })
  })
}))

const vuetify = createVuetify({ components, directives })

const mockData: PersonReportData = {
  yearOfBirth: {
    intervalSize: 1,
    offset: 1950,
    bins: [
      { intervalIndex: 0, countValue: 100 },
      { intervalIndex: 10, countValue: 200 },
      { intervalIndex: 20, countValue: 300 },
      { intervalIndex: 30, countValue: 400 },
      { intervalIndex: 40, countValue: 500 }
    ],
    unit: 'Person Count',
    seriesName: 'Person Count'
  },
  gender: [
    { name: 'Male', value: 500 },
    { name: 'Female', value: 500 },
    { name: 'Other', value: 50 }
  ],
  race: [
    { name: 'White', value: 600 },
    { name: 'Black', value: 300 },
    { name: 'Asian', value: 150 }
  ],
  ethnicity: [
    { name: 'Hispanic', value: 400 },
    { name: 'Non-Hispanic', value: 650 }
  ]
}

function mountComponent(props = {}) {
  return mount(PersonReport, {
    props: {
      data: mockData,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('PersonReport', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountComponent()
  })

  it('should mount without errors', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.person-report').exists()).toBe(true)
  })

  it('should render four chart sections', () => {
    const chartSections = wrapper.findAllComponents({ name: 'ChartSection' })
    expect(chartSections.length).toBe(4)
  })

  it('should render year of birth histogram chart', () => {
    const histogramChart = wrapper.findComponent({ name: 'DashboardAgeChart' })
    expect(histogramChart.exists()).toBe(true)
  })

  it('should pass correct histogram data to year of birth chart', () => {
    const histogramChart = wrapper.findComponent({ name: 'DashboardAgeChart' })
    const histogramData = histogramChart.props('data')

    expect(histogramData.intervalSize).toBe(1)
    expect(histogramData.offset).toBe(1950)
    expect(histogramData.bins).toHaveLength(5)
    expect(histogramData.bins[0]).toEqual({ intervalIndex: 0, countValue: 100 })
  })

  it('should render gender pie chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'AtlasPieChart' })
    expect(pieCharts.length).toBe(3)
  })

  it('should pass correct data to gender chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'AtlasPieChart' })
    const genderChart = pieCharts[0]
    expect(genderChart.props('data')).toEqual(mockData.gender)
  })

  it('should render race pie chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'AtlasPieChart' })
    expect(pieCharts.length).toBeGreaterThanOrEqual(2)
  })

  it('should pass correct data to race chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'AtlasPieChart' })
    const raceChart = pieCharts[1]
    expect(raceChart.props('data')).toEqual(mockData.race)
  })

  it('should render ethnicity pie chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'AtlasPieChart' })
    expect(pieCharts.length).toBe(3)
  })

  it('should pass correct data to ethnicity chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'AtlasPieChart' })
    const ethnicityChart = pieCharts[2]
    expect(ethnicityChart.props('data')).toEqual(mockData.ethnicity)
  })

  it('should render all pie charts with same height', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'AtlasPieChart' })
    pieCharts.forEach(chart => {
      expect(chart.props('height')).toBe(300)
    })
  })

  it('should render histogram chart with correct height', () => {
    const histogramChart = wrapper.findComponent({ name: 'DashboardAgeChart' })
    expect(histogramChart.props('height')).toBe(350)
  })

  it('should use responsive grid layout', () => {
    const rows = wrapper.findAllComponents({ name: 'VRow' })
    expect(rows.length).toBe(2)

    const cols = wrapper.findAllComponents({ name: 'VCol' })
    expect(cols.length).toBeGreaterThan(0)
  })

  it('should have three columns in second row for pie charts', () => {
    const rows = wrapper.findAllComponents({ name: 'VRow' })
    const secondRow = rows[1]
    const cols = secondRow.findAllComponents({ name: 'VCol' })
    expect(cols.length).toBe(3)
  })
  })

