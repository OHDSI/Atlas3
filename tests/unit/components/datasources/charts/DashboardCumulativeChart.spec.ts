import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { LineChartData } from '@/models/datasource.types'

vi.mock('@/ui/chart-config', () => ({
  dashboardCumulativeLineOptions: vi.fn((data) => ({
    xAxis: { data: data.categories },
    series: data.series
  })),
  createResizeHandler: vi.fn(() => vi.fn())
}))

let chartConfig: typeof import('@/ui/chart-config')
let DashboardCumulativeChart: typeof import('@/components/datasources/charts/DashboardCumulativeChart.vue').default

beforeAll(async () => {
  vi.resetModules()
  chartConfig = await import('@/ui/chart-config')
  DashboardCumulativeChart = (await import('@/components/datasources/charts/DashboardCumulativeChart.vue')).default
})

const vuetify = createVuetify({ components, directives })

const mockLineData: LineChartData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  series: [{
    name: 'Cumulative Observation',
    data: [100, 250, 450, 720, 1000]
  }],
  xAxisLabel: 'Month',
  yAxisLabel: 'Persons'
}

function mountComponent(props = {}) {
  return mount(DashboardCumulativeChart, {
    props: {
      data: mockLineData,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VChart: {
          template: '<div class="v-chart-stub"></div>',
          props: ['option', 'autoresize']
        }
      }
    }
  })
}

describe('DashboardCumulativeChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chart when not loading', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.dashboard-cumulative-chart').exists()).toBe(true)
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
    const wrapper = mountComponent({ height: 500 })

    expect(wrapper.vm.$props.height).toBe(500)
  })

  it('should call chart options function with data', () => {
    mountComponent()

    expect(chartConfig.dashboardCumulativeLineOptions).toHaveBeenCalledWith(mockLineData)
  })

  it('should handle empty data', () => {
    const emptyData: LineChartData = {
      categories: [],
      series: []
    }
    const wrapper = mountComponent({ data: emptyData })

    expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
  })

  it('should render container', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.dashboard-cumulative-chart').exists()).toBe(true)
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
  })
})
