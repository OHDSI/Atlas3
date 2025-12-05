/**
 * DeathReport Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DeathReport from '@/components/datasources/DeathReport.vue'
import type { DeathReport as DeathReportData } from '@/models/datasource.types'

// Mock child components
vi.mock('@/components/datasources/shared/ChartSection.vue', () => ({
  default: { name: 'ChartSection', template: '<div class="chart-section"><slot /></div>', props: ['title'] }
}))
vi.mock('@/components/reports/charts/PieChart.vue', () => ({
  default: { name: 'PieChart', template: '<div class="pie-chart"></div>', props: ['data', 'height'] }
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

const mockData: DeathReportData = {
  ageAtDeath: [
    {
      category: 'Male',
      conceptId: 8507,
      minValue: 18,
      p10Value: 45,
      p25Value: 55,
      medianValue: 65,
      p75Value: 75,
      p90Value: 85,
      maxValue: 95
    },
    {
      category: 'Female',
      conceptId: 8532,
      minValue: 20,
      p10Value: 50,
      p25Value: 60,
      medianValue: 70,
      p75Value: 80,
      p90Value: 90,
      maxValue: 100
    }
  ],
  deathByType: [
    { name: 'Natural', value: 80 },
    { name: 'Accident', value: 15 },
    { name: 'Other', value: 5 }
  ],
  prevalenceByMonth: {
    categories: ['Jan', 'Feb', 'Mar'],
    series: [{ name: 'Deaths', data: [10, 12, 15] }]
  },
  prevalenceByGenderAgeYear: {
    categories: ['2020', '2021', '2022'],
    series: [
      { name: 'Male 0-10', data: [5, 6, 7] },
      { name: 'Female 0-10', data: [4, 5, 6] }
    ]
  }
}

function mountComponent(props = {}) {
  return mount(DeathReport, {
    props: {
      data: mockData,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('DeathReport', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountComponent()
  })

  it('should mount without errors', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.death-report').exists()).toBe(true)
  })

  it('should render age at death table', () => {
    const table = wrapper.findComponent({ name: 'VTable' })
    expect(table.exists()).toBe(true)
  })

  it('should display age at death statistics for each gender', () => {
    const table = wrapper.findComponent({ name: 'VTable' })
    const rows = table.findAll('tbody tr')
    expect(rows.length).toBe(2)
  })

  it('should render death by type pie chart', () => {
    const pieChart = wrapper.findComponent({ name: 'PieChart' })
    expect(pieChart.exists()).toBe(true)
    expect(pieChart.props('data')).toEqual(mockData.deathByType)
  })

  it('should render prevalence by month chart', () => {
    const charts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    expect(charts.length).toBeGreaterThanOrEqual(1)
  })

  it('should render prevalence by gender, age, year chart', () => {
    const charts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    expect(charts.length).toBe(2)
  })

  it('should pass correct props to prevalence by month chart', () => {
    const charts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    const monthChart = charts[0]
    expect(monthChart.props('data')).toEqual(mockData.prevalenceByMonth)
  })

  it('should pass correct props to prevalence by gender/age/year chart', () => {
    const charts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    const genderAgeYearChart = charts[1]
    expect(genderAgeYearChart.props('data')).toEqual(mockData.prevalenceByGenderAgeYear)
  })

  it('should not render age at death section when data is empty', () => {
    const emptyData = { ...mockData, ageAtDeath: [] }
    const wrapper2 = mountComponent({ data: emptyData })
    const table = wrapper2.findComponent({ name: 'VTable' })
    expect(table.exists()).toBe(false)
  })

  it('should not render death by type section when data is empty', () => {
    const emptyData = { ...mockData, deathByType: [] }
    const wrapper2 = mountComponent({ data: emptyData })
    const pieChart = wrapper2.findComponent({ name: 'PieChart' })
    expect(pieChart.exists()).toBe(false)
  })

  it('should not render prevalence by month when data is undefined', () => {
    const emptyData = { ...mockData, prevalenceByMonth: undefined }
    const wrapper2 = mountComponent({ data: emptyData })
    const charts = wrapper2.findAllComponents({ name: 'MultiLineChart' })
    expect(charts.length).toBe(1)
  })

  it('should highlight median value in statistics table', () => {
    const table = wrapper.findComponent({ name: 'VTable' })
    const strongElements = table.findAll('strong')
    expect(strongElements.length).toBeGreaterThan(0)
  })

  it('should use responsive grid layout', () => {
    const rows = wrapper.findAllComponents({ name: 'VRow' })
    expect(rows.length).toBeGreaterThan(0)
  })
})
