import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { MultiLineChartData } from '@/models/datasource.types'

vi.mock('@/utils/chart-config', () => ({
  multiLineChartOptions: vi.fn((data) => ({
    xAxis: { data: data.categories },
    series: data.series
  })),
  createResizeHandler: vi.fn(() => vi.fn())
}))

let chartConfig: typeof import('@/utils/chart-config')
let MultiLineChart: typeof import('@/components/datasources/charts/MultiLineChart.vue').default

beforeAll(async () => {
  vi.resetModules()
  chartConfig = await import('@/utils/chart-config')
  MultiLineChart = (await import('@/components/datasources/charts/MultiLineChart.vue')).default
})

const vuetify = createVuetify({ components, directives })

const mockMultiLineData: MultiLineChartData = {
  categories: ['2020', '2021', '2022', '2023', '2024'],
  series: [
    {
      name: 'Data Source A',
      data: [100, 150, 200, 250, 300]
    },
    {
      name: 'Data Source B',
      data: [120, 180, 190, 280, 320]
    },
    {
      name: 'Data Source C',
      data: [90, 140, 210, 240, 290]
    }
  ]
}

function mountComponent(props = {}) {
  return mount(MultiLineChart, {
    props: {
      data: mockMultiLineData,
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

describe('MultiLineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chart when not loading', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.multi-line-chart').exists()).toBe(true)
    expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
  })

  it('should show skeleton loader when loading', () => {
    const wrapper = mountComponent({ loading: true })

    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
    expect(wrapper.find('.v-chart-stub').exists()).toBe(false)
  })

  it('should apply default height prop', () => {
    const wrapper = mountComponent()

    expect(wrapper.vm.$props.height).toBe(350)
  })

  it('should apply custom height prop', () => {
    const wrapper = mountComponent({ height: 500 })

    expect(wrapper.vm.$props.height).toBe(500)
  })

  it('should call chart options function with data', () => {
    mountComponent()

    expect(chartConfig.multiLineChartOptions).toHaveBeenCalledWith(mockMultiLineData)
  })

  it('should handle empty data', () => {
    const emptyData: MultiLineChartData = {
      categories: [],
      series: []
    }
    const wrapper = mountComponent({ data: emptyData })

    expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
  })

  it('should render container', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.multi-line-chart').exists()).toBe(true)
  })

  it('should handle multiple series', () => {
    mountComponent()

    expect(chartConfig.multiLineChartOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        series: expect.arrayContaining([
          expect.objectContaining({ name: 'Data Source A' }),
          expect.objectContaining({ name: 'Data Source B' }),
          expect.objectContaining({ name: 'Data Source C' })
        ])
      })
    )
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
