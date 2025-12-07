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
vi.mock('@/components/reports/charts/PieChart.vue', () => ({
  default: { name: 'PieChart', template: '<div class="pie-chart"></div>', props: ['data', 'height'] }
}))
vi.mock('@/components/reports/charts/BarChart.vue', () => ({
  default: { name: 'BarChart', template: '<div class="bar-chart"></div>', props: ['data', 'height'] }
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
    categories: ['1950', '1960', '1970', '1980', '1990'],
    series: [{ name: 'Birth Year', data: [100, 200, 300, 400, 500] }],
    unit: 'People'
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

  it('should render year of birth bar chart', () => {
    const barChart = wrapper.findComponent({ name: 'BarChart' })
    expect(barChart.exists()).toBe(true)
  })

  it('should pass correct data to year of birth chart', () => {
    const barChart = wrapper.findComponent({ name: 'BarChart' })
    const barChartData = barChart.props('data')

    expect(barChartData.categories).toEqual(mockData.yearOfBirth.categories)
    expect(barChartData.values).toEqual([100, 200, 300, 400, 500])
  })

  it('should render gender pie chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'PieChart' })
    expect(pieCharts.length).toBe(3)
  })

  it('should pass correct data to gender chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'PieChart' })
    const genderChart = pieCharts[0]
    expect(genderChart.props('data')).toEqual(mockData.gender)
  })

  it('should render race pie chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'PieChart' })
    expect(pieCharts.length).toBeGreaterThanOrEqual(2)
  })

  it('should pass correct data to race chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'PieChart' })
    const raceChart = pieCharts[1]
    expect(raceChart.props('data')).toEqual(mockData.race)
  })

  it('should render ethnicity pie chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'PieChart' })
    expect(pieCharts.length).toBe(3)
  })

  it('should pass correct data to ethnicity chart', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'PieChart' })
    const ethnicityChart = pieCharts[2]
    expect(ethnicityChart.props('data')).toEqual(mockData.ethnicity)
  })

  it('should render all pie charts with same height', () => {
    const pieCharts = wrapper.findAllComponents({ name: 'PieChart' })
    pieCharts.forEach(chart => {
      expect(chart.props('height')).toBe(300)
    })
  })

  it('should render bar chart with correct height', () => {
    const barChart = wrapper.findComponent({ name: 'BarChart' })
    expect(barChart.props('height')).toBe(350)
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

  it('should transform year of birth data correctly', () => {
    const barChart = wrapper.findComponent({ name: 'BarChart' })
    const data = barChart.props('data')

    expect(data.categories).toBeDefined()
    expect(data.values).toBeDefined()
    expect(data.unit).toBe('People')
  })

  it('should handle empty series data gracefully', () => {
    const emptyData = {
      ...mockData,
      yearOfBirth: {
        categories: ['1950'],
        series: [],
        unit: 'People'
      }
    }

    const wrapper2 = mountComponent({ data: emptyData })
    const barChart = wrapper2.findComponent({ name: 'BarChart' })
    expect(barChart.props('data').values).toEqual([])
  })

  it('should use md="4" for pie chart columns', () => {
    const rows = wrapper.findAllComponents({ name: 'VRow' })
    const secondRow = rows[1]
    const cols = secondRow.findAllComponents({ name: 'VCol' })

    // Each col should have md="4" for 3-column layout
    cols.forEach(col => {
      expect(col.props('md')).toBe('4')
    })
  })
})
