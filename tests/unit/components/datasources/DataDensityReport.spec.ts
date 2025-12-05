/**
 * DataDensityReport Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataDensityReport from '@/components/datasources/DataDensityReport.vue'
import type { DataDensityReport as DataDensityReportData } from '@/models/datasource.types'

// Mock child components
vi.mock('@/components/datasources/shared/ChartSection.vue', () => ({
  default: { name: 'ChartSection', template: '<div class="chart-section"><slot /></div>', props: ['title'] }
}))
vi.mock('@/components/datasources/charts/MultiLineChart.vue', () => ({
  default: { name: 'MultiLineChart', template: '<div class="multi-line-chart"></div>', props: ['data', 'height'] }
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

const mockData: DataDensityReportData = {
  totalRecords: {
    categories: ['2020', '2021', '2022'],
    series: [
      { name: 'Condition', data: [1000, 1500, 2000] },
      { name: 'Procedure', data: [800, 1200, 1600] }
    ]
  },
  recordsPerPerson: {
    categories: ['2020', '2021', '2022'],
    series: [
      { name: 'Condition', data: [10, 15, 20] },
      { name: 'Procedure', data: [8, 12, 16] }
    ]
  },
  conceptsPerPerson: {
    categories: ['Condition', 'Procedure', 'Drug'],
    series: [{ name: 'Concepts', data: [100, 150, 200] }],
    unit: 'Concepts'
  }
}

function mountComponent(props = {}) {
  return mount(DataDensityReport, {
    props: {
      data: mockData,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('DataDensityReport', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountComponent()
  })

  it('should mount without errors', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.data-density-report').exists()).toBe(true)
  })

  it('should render three chart sections', () => {
    const chartSections = wrapper.findAllComponents({ name: 'ChartSection' })
    expect(chartSections.length).toBe(3)
  })

  it('should render total records chart', () => {
    const charts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    expect(charts.length).toBeGreaterThanOrEqual(1)
    expect(charts[0].props('data')).toEqual(mockData.totalRecords)
  })

  it('should render records per person chart', () => {
    const charts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    expect(charts.length).toBeGreaterThanOrEqual(2)
    expect(charts[1].props('data')).toEqual(mockData.recordsPerPerson)
  })

  it('should render concepts per person bar chart', () => {
    const barChart = wrapper.findComponent({ name: 'BarChart' })
    expect(barChart.exists()).toBe(true)
  })

  it('should transform concepts data correctly for bar chart', () => {
    const barChart = wrapper.findComponent({ name: 'BarChart' })
    const barChartData = barChart.props('data')

    expect(barChartData.categories).toEqual(mockData.conceptsPerPerson.categories)
    expect(barChartData.values).toEqual([100, 150, 200])
    expect(barChartData.unit).toBe('Concepts')
  })

  it('should render charts with correct height', () => {
    const charts = wrapper.findAllComponents({ name: 'MultiLineChart' })
    charts.forEach(chart => {
      expect(chart.props('height')).toBe(350)
    })
  })

  it('should use grid layout with rows and columns', () => {
    const rows = wrapper.findAllComponents({ name: 'VRow' })
    expect(rows.length).toBe(3)

    const cols = wrapper.findAllComponents({ name: 'VCol' })
    expect(cols.length).toBe(3)
  })

  it('should handle empty series data gracefully', () => {
    const emptyData = {
      ...mockData,
      conceptsPerPerson: {
        categories: ['Test'],
        series: [],
        unit: 'Concepts'
      }
    }

    const wrapper2 = mountComponent({ data: emptyData })
    const barChart = wrapper2.findComponent({ name: 'BarChart' })
    expect(barChart.props('data').values).toEqual([])
  })
})
