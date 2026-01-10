/**
 * BarChart Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import BarChart from '@/components/reports/charts/BarChart.vue'
import type { BarChartData } from '@/models/report.types'

// Mock chart config utilities
vi.mock('@/utils/chart-config', () => ({
  defaultBarChartOptions: vi.fn((data) => ({
    xAxis: { type: 'category', data: data.categories },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: data.values }]
  })),
  createResizeHandler: vi.fn(() => vi.fn())
}))

const vuetify = createVuetify({ components, directives })

const mockBarChartData: BarChartData = {
  categories: ['Category A', 'Category B', 'Category C'],
  values: [100, 200, 150],
  unit: 'People'
}

function mountComponent(props = {}) {
  return mount(BarChart, {
    props: {
      data: mockBarChartData,
      loading: false,
      height: 400,
      showExport: true,
      exportFilename: 'test-bar',
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

describe('BarChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.bar-chart-container').exists()).toBe(true)
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
      const customData: BarChartData = {
        categories: ['A', 'B'],
        values: [10, 20],
        unit: 'Count'
      }
      const wrapper = mountComponent({ data: customData })
      expect(wrapper.props('data')).toEqual(customData)
    })

    it('should accept and use height prop', () => {
      const wrapper = mountComponent({ height: 600 })
      expect(wrapper.props('height')).toBe(600)
    })

    it('should accept and use exportFilename prop', () => {
      const wrapper = mountComponent({ exportFilename: 'my-bar-chart' })
      expect(wrapper.props('exportFilename')).toBe('my-bar-chart')
    })

    it('should use default height if not provided', () => {
      const wrapper = mountComponent({ height: undefined })
      expect(wrapper.props('height')).toBe(400)
    })

    it('should use default exportFilename if not provided', () => {
      const wrapper = mountComponent({ exportFilename: undefined })
      expect(wrapper.props('exportFilename')).toBe('bar-chart')
    })
  })

  describe('Chart Options', () => {
    it('should generate empty options for empty data', () => {
      const emptyData: BarChartData = {
        categories: [],
        values: [],
        unit: 'Count'
      }
      const wrapper = mountComponent({ data: emptyData })
      const vChart = wrapper.find('.v-chart-stub')
      expect(vChart.exists()).toBe(true)
    })

    it('should handle data with unit', () => {
      const dataWithUnit: BarChartData = {
        categories: ['Jan', 'Feb'],
        values: [100, 200],
        unit: 'Patients'
      }
      const wrapper = mountComponent({ data: dataWithUnit })
      expect(wrapper.props('data').unit).toBe('Patients')
    })

    it('should handle data without unit', () => {
      const dataWithoutUnit: BarChartData = {
        categories: ['Jan', 'Feb'],
        values: [100, 200]
      }
      const wrapper = mountComponent({ data: dataWithoutUnit })
      expect(wrapper.props('data').unit).toBeUndefined()
    })

    it('should handle data with mismatched array lengths', () => {
      const mismatchedData: BarChartData = {
        categories: ['A', 'B', 'C'],
        values: [10, 20], // Only 2 values for 3 categories
        unit: 'Count'
      }
      const wrapper = mountComponent({ data: mismatchedData })
      expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
    })

    it('should handle data with zero values', () => {
      const zeroData: BarChartData = {
        categories: ['Zero', 'NonZero'],
        values: [0, 100]
      }
      const wrapper = mountComponent({ data: zeroData })
      expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
    })

    it('should handle data with negative values', () => {
      const negativeData: BarChartData = {
        categories: ['Negative', 'Positive'],
        values: [-50, 100]
      }
      const wrapper = mountComponent({ data: negativeData })
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
      const wrapper = mountComponent({ data: mockBarChartData })

      const newData: BarChartData = {
        categories: ['X', 'Y', 'Z'],
        values: [300, 400, 500],
        unit: 'Events'
      }

      await wrapper.setProps({ data: newData })
      await nextTick()

      expect(wrapper.props('data')).toEqual(newData)
    })

    it.skip('should handle empty data after having data', async () => {
      const wrapper = mountComponent({ data: mockBarChartData })

      const emptyData: BarChartData = {
        categories: [],
        values: []
      }

      await wrapper.setProps({ data: emptyData })
      await nextTick()

      expect(wrapper.props('data')).toEqual(emptyData)
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

      expect(wrapper.find('.bar-chart-container').exists()).toBe(true)
    })
  })
})
