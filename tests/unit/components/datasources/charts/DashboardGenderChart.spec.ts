import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { PieChartData } from '@/models/datasource.types'

vi.mock('@/utils/chart-config', () => ({
  dashboardGenderPieOptions: vi.fn((data) => ({
    series: [{
      type: 'pie',
      data: data
    }]
  })),
  createResizeHandler: vi.fn(() => vi.fn())
}))

let chartConfig: typeof import('@/utils/chart-config')
let DashboardGenderChart: typeof import('@/components/datasources/charts/DashboardGenderChart.vue').default

beforeAll(async () => {
  vi.resetModules()
  chartConfig = await import('@/utils/chart-config')
  DashboardGenderChart = (await import('@/components/datasources/charts/DashboardGenderChart.vue')).default
})

const vuetify = createVuetify({ components, directives })

const mockPieData: PieChartData[] = [
  { name: 'Male', value: 5500 },
  { name: 'Female', value: 6200 },
  { name: 'Unknown', value: 300 }
]

function mountComponent(props = {}) {
  return mount(DashboardGenderChart, {
    props: {
      data: mockPieData,
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

describe('DashboardGenderChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chart when not loading', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.dashboard-gender-chart').exists()).toBe(true)
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
    const wrapper = mountComponent({ height: 350 })

    expect(wrapper.vm.$props.height).toBe(350)
  })

  it('should call chart options function with data', () => {
    mountComponent()

    expect(chartConfig.dashboardGenderPieOptions).toHaveBeenCalledWith(mockPieData)
  })

  it('should handle empty data', () => {
    const emptyData: PieChartData[] = []
    const wrapper = mountComponent({ data: emptyData })

    expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
  })

  it('should render container', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.dashboard-gender-chart').exists()).toBe(true)
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
