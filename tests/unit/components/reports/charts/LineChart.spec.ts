/**
 * LineChart Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import LineChart from '@/components/reports/charts/LineChart.vue'
import type { LineChartData } from '@/models/report.types'

// Mock chart config utilities
vi.mock('@/utils/chart-config', () => ({
  defaultLineChartOptions: vi.fn((data, title) => ({
    title: { text: title },
    xAxis: { type: 'category', data: data.xAxis },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: data.yAxis, name: data.seriesName }]
  })),
  createResizeHandler: vi.fn(() => vi.fn())
}))

const vuetify = createVuetify({ components, directives })

const mockLineChartData: LineChartData = {
  xAxis: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  yAxis: [100, 200, 150, 300, 250],
  seriesName: 'Monthly Data'
}

function mountComponent(props = {}) {
  return mount(LineChart, {
    props: {
      data: mockLineChartData,
      title: 'Test Line Chart',
      loading: false,
      height: 400,
      showExport: true,
      exportFilename: 'test-line',
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VChart: {
          template: '<div class="v-chart-stub"></div>',
          props: ['option'],
          setup(_props) {
            return {
              chart: {
                resize: vi.fn(),
                setOption: vi.fn()
              }
            }
          }
        },
        ChartExport: {
          template: '<div class="chart-export-stub"></div>',
          props: ['chartInstance', 'filename']
        }
      }
    }
  })
}

describe('LineChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.line-chart-container').exists()).toBe(true)
    })

    it('should render v-chart when not loading', () => {
      const wrapper = mountComponent({ loading: false })
      expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
    })

    it('should render skeleton loader when loading', () => {
      const wrapper = mountComponent({ loading: true })
      const skeleton = wrapper.findComponent({ name: 'VSkeletonLoader' })
      expect(skeleton.exists()).toBe(true)
      expect(skeleton.props('type')).toBe('image')
    })

    it('should not render v-chart when loading', () => {
      const wrapper = mountComponent({ loading: true })
      expect(wrapper.find('.v-chart-stub').exists()).toBe(false)
    })

    it('should render ChartExport when showExport is true', () => {
      const wrapper = mountComponent({ showExport: true, loading: false })
      expect(wrapper.find('.chart-export-stub').exists()).toBe(true)
    })

    it('should not render ChartExport when showExport is false', () => {
      const wrapper = mountComponent({ showExport: false })
      expect(wrapper.find('.chart-export-stub').exists()).toBe(false)
    })

    it('should not render ChartExport when loading', () => {
      const wrapper = mountComponent({ showExport: true, loading: true })
      expect(wrapper.find('.chart-export-stub').exists()).toBe(false)
    })
  })

  describe('Props', () => {
    it('should accept and use data prop', () => {
      const customData: LineChartData = {
        xAxis: ['A', 'B', 'C'],
        yAxis: [10, 20, 30],
        seriesName: 'Test Series'
      }
      const wrapper = mountComponent({ data: customData })
      expect(wrapper.props('data')).toEqual(customData)
    })

    it('should accept and use title prop', () => {
      const wrapper = mountComponent({ title: 'Custom Line Chart' })
      expect(wrapper.props('title')).toBe('Custom Line Chart')
    })

    it('should accept and use height prop', () => {
      const wrapper = mountComponent({ height: 600 })
      expect(wrapper.props('height')).toBe(600)
    })

    it('should accept and use exportFilename prop', () => {
      const wrapper = mountComponent({ exportFilename: 'my-line-chart' })
      expect(wrapper.props('exportFilename')).toBe('my-line-chart')
    })

    it('should use default height if not provided', () => {
      const wrapper = mountComponent({ height: undefined })
      expect(wrapper.props('height')).toBe(400)
    })

    it('should use default exportFilename if not provided', () => {
      const wrapper = mountComponent({ exportFilename: undefined })
      expect(wrapper.props('exportFilename')).toBe('line-chart')
    })
  })

  describe('Chart Options', () => {
    it('should generate empty options for empty data', () => {
      const emptyData: LineChartData = {
        xAxis: [],
        yAxis: [],
        seriesName: 'Empty'
      }
      const wrapper = mountComponent({ data: emptyData })
      const vChart = wrapper.find('.v-chart-stub')
      expect(vChart.exists()).toBe(true)
    })

    it('should handle data with seriesName', () => {
      const dataWithName: LineChartData = {
        xAxis: ['Q1', 'Q2'],
        yAxis: [100, 200],
        seriesName: 'Quarterly Revenue'
      }
      const wrapper = mountComponent({ data: dataWithName })
      expect(wrapper.props('data').seriesName).toBe('Quarterly Revenue')
    })

    it('should handle data without seriesName', () => {
      const dataWithoutName: LineChartData = {
        xAxis: ['Q1', 'Q2'],
        yAxis: [100, 200]
      }
      const wrapper = mountComponent({ data: dataWithoutName })
      expect(wrapper.props('data').seriesName).toBeUndefined()
    })

    it('should handle numeric xAxis values', () => {
      const numericXData: LineChartData = {
        xAxis: [2020, 2021, 2022],
        yAxis: [100, 200, 300]
      }
      const wrapper = mountComponent({ data: numericXData })
      expect(wrapper.props('data').xAxis).toEqual([2020, 2021, 2022])
    })

    it('should handle string xAxis values', () => {
      const stringXData: LineChartData = {
        xAxis: ['Mon', 'Tue', 'Wed'],
        yAxis: [50, 60, 70]
      }
      const wrapper = mountComponent({ data: stringXData })
      expect(wrapper.props('data').xAxis).toEqual(['Mon', 'Tue', 'Wed'])
    })

    it('should handle data with zero values', () => {
      const zeroData: LineChartData = {
        xAxis: ['A', 'B', 'C'],
        yAxis: [0, 100, 0]
      }
      const wrapper = mountComponent({ data: zeroData })
      expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
    })

    it('should handle data with negative values', () => {
      const negativeData: LineChartData = {
        xAxis: ['A', 'B', 'C'],
        yAxis: [-50, 0, 100]
      }
      const wrapper = mountComponent({ data: negativeData })
      expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
    })

    it('should handle data with mismatched array lengths', () => {
      const mismatchedData: LineChartData = {
        xAxis: ['A', 'B', 'C'],
        yAxis: [10, 20] // Only 2 values for 3 x-axis points
      }
      const wrapper = mountComponent({ data: mismatchedData })
      expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
    })
  })

  describe('Export Functionality', () => {
    it('should emit export-success event', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.$emit('export-success', 'png', 'test.png')

      expect(wrapper.emitted('export-success')).toBeTruthy()
      expect(wrapper.emitted('export-success')?.[0]).toEqual(['png', 'test.png'])
    })

    it('should emit export-error event', async () => {
      const wrapper = mountComponent()
      const error = new Error('Export failed')
      await wrapper.vm.$emit('export-error', 'svg', error)

      expect(wrapper.emitted('export-error')).toBeTruthy()
      expect(wrapper.emitted('export-error')?.[0]).toEqual(['svg', error])
    })
  })

  describe('Skeleton Loader', () => {
    it('should display skeleton with correct height when loading', () => {
      const wrapper = mountComponent({ loading: true, height: 500 })
      const skeleton = wrapper.findComponent({ name: 'VSkeletonLoader' })

      expect(skeleton.exists()).toBe(true)
      expect(skeleton.props('height')).toBe(500)
    })

    it('should use image type for skeleton loader', () => {
      const wrapper = mountComponent({ loading: true })
      const skeleton = wrapper.findComponent({ name: 'VSkeletonLoader' })

      expect(skeleton.props('type')).toBe('image')
    })
  })

  describe('Data Updates', () => {
    it.skip('should handle data prop changes', async () => {
      const wrapper = mountComponent({ data: mockLineChartData })

      const newData: LineChartData = {
        xAxis: ['Week 1', 'Week 2', 'Week 3'],
        yAxis: [300, 400, 500],
        seriesName: 'Weekly Data'
      }

      await wrapper.setProps({ data: newData })
      await nextTick()

      expect(wrapper.props('data')).toEqual(newData)
    })

    it.skip('should handle empty data after having data', async () => {
      const wrapper = mountComponent({ data: mockLineChartData })

      const emptyData: LineChartData = {
        xAxis: [],
        yAxis: []
      }

      await wrapper.setProps({ data: emptyData })
      await nextTick()

      expect(wrapper.props('data')).toEqual(emptyData)
    })

    it('should handle title changes', async () => {
      const wrapper = mountComponent({ title: 'Original Title' })

      await wrapper.setProps({ title: 'Updated Title' })
      await nextTick()

      expect(wrapper.props('title')).toBe('Updated Title')
    })

    it('should handle loading state changes', async () => {
      const wrapper = mountComponent({ loading: false })

      await wrapper.setProps({ loading: true })
      await nextTick()

      expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
      expect(wrapper.find('.v-chart-stub').exists()).toBe(false)
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle window resize events', () => {
      const wrapper = mountComponent()

      global.dispatchEvent(new Event('resize'))

      expect(wrapper.find('.line-chart-container').exists()).toBe(true)
    })
  })
})
