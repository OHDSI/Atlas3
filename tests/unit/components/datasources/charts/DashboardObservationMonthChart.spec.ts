import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { LineChartData } from '@/models/datasource.types'

vi.mock('@/ui/chart-config', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    dashboardObservationMonthLineOptions: vi.fn((data) => ({
      xAxis: { data: data.categories },
      series: data.series
    })),
    createResizeHandler: vi.fn(() => vi.fn())
  }
})

let chartConfig: typeof import('@/ui/chart-config')
let DashboardObservationMonthChart: typeof import('@/components/datasources/charts/DashboardObservationMonthChart.vue').default

beforeAll(async () => {
  vi.resetModules()
  chartConfig = await import('@/ui/chart-config')
  DashboardObservationMonthChart = (await import('@/components/datasources/charts/DashboardObservationMonthChart.vue')).default
})

const vuetify = createVuetify({ components, directives })

const mockLineData: LineChartData = {
  categories: ['2020-01', '2020-02', '2020-03', '2020-04', '2020-05'],
  series: [{
    name: 'Observations',
    data: [1200, 1350, 1100, 1450, 1600]
  }],
  xAxisLabel: 'Month',
  yAxisLabel: 'Count'
}

function mountComponent(props = {}) {
  return mount(DashboardObservationMonthChart, {
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

describe('DashboardObservationMonthChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chart when not loading', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.dashboard-observation-month-chart').exists()).toBe(true)
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
    const wrapper = mountComponent({ height: 450 })

    expect(wrapper.vm.$props.height).toBe(450)
  })

  it('should call chart options function with data', () => {
    const spy = vi.spyOn(chartConfig, 'multiLineChartOptions')
    mountComponent()

    expect(spy).toHaveBeenCalledWith(mockLineData)
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

    expect(wrapper.find('.dashboard-observation-month-chart').exists()).toBe(true)
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
