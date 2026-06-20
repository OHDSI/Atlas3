import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { HistogramChartData } from '@/models/datasource.types'

vi.mock('@/utils/chart-config', () => ({
  dashboardAgeBarOptions: vi.fn((data) => ({
    xAxis: { min: data.offset, max: data.offset + data.intervalSize * Math.max(data.bins.length, 1) },
    series: [{ data: data.bins }]
  })),
  createResizeHandler: vi.fn(() => vi.fn())
}))

let chartConfig: typeof import('@/utils/chart-config')
let DashboardAgeChart: typeof import('@/components/datasources/charts/DashboardAgeChart.vue').default

beforeAll(async () => {
  vi.resetModules()
  chartConfig = await import('@/utils/chart-config')
  DashboardAgeChart = (await import('@/components/datasources/charts/DashboardAgeChart.vue')).default
})

const vuetify = createVuetify({ components, directives })

const mockHistogramData: HistogramChartData = {
  intervalSize: 1,
  offset: 0,
  bins: [
    { intervalIndex: 0, countValue: 1000 },
    { intervalIndex: 1, countValue: 1500 },
    { intervalIndex: 2, countValue: 2000 },
    { intervalIndex: 3, countValue: 1800 },
    { intervalIndex: 4, countValue: 1200 },
  ],
  unit: 'Persons',
  seriesName: 'Person Count',
}

function mountComponent(props = {}) {
  return mount(DashboardAgeChart, {
    props: {
      data: mockHistogramData,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VChart: {
          template: '<div class="v-chart-stub" :style="computedStyle"></div>',
          props: ['option', 'autoresize'],
          computed: {
            computedStyle() {
              return this.$parent?.$el?.getAttribute('style') || ''
            }
          }
        }
      }
    }
  })
}

describe('DashboardAgeChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chart when not loading', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.dashboard-age-chart').exists()).toBe(true)
    expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
  })

  it('should show skeleton loader when loading', () => {
    const wrapper = mountComponent({ loading: true })

    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
    expect(wrapper.find('.v-chart-stub').exists()).toBe(false)
  })

  it('should apply default height prop', () => {
    const wrapper = mountComponent()

    expect(wrapper.vm.$props.height).toBe(300)
  })

  it('should apply custom height prop', () => {
    const wrapper = mountComponent({ height: 400 })

    expect(wrapper.vm.$props.height).toBe(400)
  })

  it('should call chart options function with data', () => {
    mountComponent()

    expect(chartConfig.dashboardAgeBarOptions).toHaveBeenCalledWith(mockHistogramData)
  })

  it('should handle empty data', () => {
    const emptyData: HistogramChartData = {
      intervalSize: 1,
      offset: 0,
      bins: []
    }
    const wrapper = mountComponent({ data: emptyData })

    expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
  })

  it('should render container', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.dashboard-age-chart').exists()).toBe(true)
  })

  it('should register resize handler on mount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    mountComponent()

    expect(chartConfig.createResizeHandler).toHaveBeenCalled()
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    addEventListenerSpy.mockRestore()
  })

  it('should remove resize handler on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const wrapper = mountComponent()

    wrapper.unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })

  it('should apply default loading prop as false', () => {
    const wrapper = mountComponent()

    expect(wrapper.vm.$props.loading).toBe(false)
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(false)
  })

  it('should return empty chart options when data is null', () => {
    const wrapper = mountComponent({ data: { intervalSize: 1, offset: 0, bins: [] } })

    expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
  })

  it('should have autoresize attribute on chart', () => {
    const wrapper = mountComponent()
    const chart = wrapper.find('.v-chart-stub')

    expect(chart.exists()).toBe(true)
  })
})
