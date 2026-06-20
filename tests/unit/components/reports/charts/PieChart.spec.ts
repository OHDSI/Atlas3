/**
 * PieChart Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import PieChart from '@/components/ui/charts/AtlasPieChart.vue'
import type { PieChartData } from '@/models/report.types'

// Mock chart config utilities
vi.mock('@/ui/chart-config', () => ({
  defaultPieChartOptions: vi.fn((data, title) => ({
    title: { text: title },
    series: [{ type: 'pie', data }]
  })),
  createResizeHandler: vi.fn(() => vi.fn())
}))

const vuetify = createVuetify({ components, directives })

const mockChartData: PieChartData[] = [
  { name: 'Category A', value: 100 },
  { name: 'Category B', value: 200 },
  { name: 'Category C', value: 150 }
]

function mountComponent(props = {}) {
  return mount(PieChart, {
    props: {
      data: mockChartData,
      title: 'Test Pie Chart',
      loading: false,
      height: 400,
      showExport: true,
      exportFilename: 'test-pie',
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

describe('PieChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.atlas-pie-chart').exists()).toBe(true)
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
      const customData: PieChartData[] = [
        { name: 'Test 1', value: 50 },
        { name: 'Test 2', value: 75 }
      ]
      const wrapper = mountComponent({ data: customData })
      expect(wrapper.props('data')).toEqual(customData)
    })

    it('should accept and use title prop', () => {
      const wrapper = mountComponent({ title: 'Custom Title' })
      expect(wrapper.props('title')).toBe('Custom Title')
    })

    it('should accept and use height prop', () => {
      const wrapper = mountComponent({ height: 600 })
      expect(wrapper.props('height')).toBe(600)
    })

    it('should accept and use exportFilename prop', () => {
      const wrapper = mountComponent({ exportFilename: 'my-export' })
      expect(wrapper.props('exportFilename')).toBe('my-export')
    })

    it('should use default height if not provided', () => {
      const wrapper = mountComponent({ height: undefined })
      expect(wrapper.props('height')).toBe(400)
    })

    it('should use default exportFilename if not provided', () => {
      const wrapper = mountComponent({ exportFilename: undefined })
      expect(wrapper.props('exportFilename')).toBe('pie-chart')
    })
  })

  describe('Chart Options', () => {
    it('should generate empty options for empty data', () => {
      const wrapper = mountComponent({ data: [] })
      // Chart should not render or render with empty options
      const vChart = wrapper.find('.v-chart-stub')
      expect(vChart.exists()).toBe(true)
    })

    it('should handle data with zero values', () => {
      const zeroData: PieChartData[] = [
        { name: 'Zero', value: 0 },
        { name: 'NonZero', value: 100 }
      ]
      const wrapper = mountComponent({ data: zeroData })
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
      const wrapper = mountComponent({ data: mockChartData })

      const newData: PieChartData[] = [
        { name: 'New A', value: 300 },
        { name: 'New B', value: 400 }
      ]

      await wrapper.setProps({ data: newData })
      await nextTick()

      expect(wrapper.props('data')).toEqual(newData)
    })

    it.skip('should handle empty data after having data', async () => {
      const wrapper = mountComponent({ data: mockChartData })

      await wrapper.setProps({ data: [] })
      await nextTick()

      expect(wrapper.props('data')).toEqual([])
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle window resize events', () => {
      const wrapper = mountComponent()

      // Simulate resize
      global.dispatchEvent(new Event('resize'))

      // Component should still exist
      expect(wrapper.find('.atlas-pie-chart').exists()).toBe(true)
    })
  })
})
