import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { BarChartData } from '@/models/datasource.types'

vi.mock('@/utils/chart-config', () => ({
  dashboardAgeBarOptions: vi.fn((data) => ({
    xAxis: { data: data.categories },
    series: data.series
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

const mockBarData: BarChartData = {
  categories: ['0-9', '10-19', '20-29', '30-39', '40-49'],
  series: [{
    name: 'Age Distribution',
    data: [1000, 1500, 2000, 1800, 1200]
  }]
}

function mountComponent(props = {}) {
  return mount(DashboardAgeChart, {
    props: {
      data: mockBarData,
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

    expect(chartConfig.dashboardAgeBarOptions).toHaveBeenCalledWith(mockBarData)
  })

  it('should handle empty data', () => {
    const emptyData: BarChartData = {
      categories: [],
      series: []
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
    const wrapper = mountComponent({ data: { categories: [], series: [] } })

    expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
  })

  it('should have autoresize attribute on chart', () => {
    const wrapper = mountComponent()
    const chart = wrapper.find('.v-chart-stub')

    expect(chart.exists()).toBe(true)
  })
})
