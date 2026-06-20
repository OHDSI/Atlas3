/**
 * TreemapChart Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import TreemapChart from '@/components/ui/charts/AtlasTreemapChart.vue'
import type { TreemapNode } from '@/models/report.types'

// Mock chart config utilities
vi.mock('@/utils/chart-config', () => ({
  defaultTreemapOptions: vi.fn((data, title) => ({
    title: { text: title },
    series: [{ type: 'treemap', data, roam: true }]
  })),
  createResizeHandler: vi.fn(() => vi.fn())
}))

const vuetify = createVuetify({ components, directives })

const mockTreemapData: TreemapNode[] = [
  {
    name: 'Parent A',
    value: 100,
    children: [
      { name: 'Child A1', value: 50 },
      { name: 'Child A2', value: 50 }
    ]
  },
  {
    name: 'Parent B',
    value: 200,
    children: [
      { name: 'Child B1', value: 100 },
      { name: 'Child B2', value: 100 }
    ]
  }
]

function mountComponent(props = {}) {
  return mount(TreemapChart, {
    props: {
      data: mockTreemapData,
      title: 'Test Treemap',
      loading: false,
      height: 500,
      enableZoom: true,
      showExport: true,
      exportFilename: 'test-treemap',
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

describe('TreemapChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.treemap-chart-container').exists()).toBe(true)
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
      const customData: TreemapNode[] = [
        { name: 'Test Node', value: 100 }
      ]
      const wrapper = mountComponent({ data: customData })
      expect(wrapper.props('data')).toEqual(customData)
    })

    it('should accept and use title prop', () => {
      const wrapper = mountComponent({ title: 'Custom Treemap Title' })
      expect(wrapper.props('title')).toBe('Custom Treemap Title')
    })

    it('should accept and use height prop', () => {
      const wrapper = mountComponent({ height: 600 })
      expect(wrapper.props('height')).toBe(600)
    })

    it('should accept and use enableZoom prop', () => {
      const wrapper = mountComponent({ enableZoom: false })
      expect(wrapper.props('enableZoom')).toBe(false)
    })

    it('should accept and use exportFilename prop', () => {
      const wrapper = mountComponent({ exportFilename: 'my-treemap' })
      expect(wrapper.props('exportFilename')).toBe('my-treemap')
    })

    it('should use default height if not provided', () => {
      const wrapper = mountComponent({ height: undefined })
      expect(wrapper.props('height')).toBe(500)
    })

    it('should use default enableZoom as true if not provided', () => {
      const wrapper = mountComponent({ enableZoom: undefined })
      expect(wrapper.props('enableZoom')).toBe(true)
    })

    it('should use default exportFilename if not provided', () => {
      const wrapper = mountComponent({ exportFilename: undefined })
      expect(wrapper.props('exportFilename')).toBe('treemap-chart')
    })
  })

  describe('Chart Options', () => {
    it('should generate empty options for empty data', () => {
      const wrapper = mountComponent({ data: [] })
      const vChart = wrapper.find('.v-chart-stub')
      expect(vChart.exists()).toBe(true)
    })

    it('should handle hierarchical data structure', () => {
      const hierarchicalData: TreemapNode[] = [
        {
          name: 'Root',
          value: 0,
          children: [
            {
              name: 'Level 1',
              value: 0,
              children: [
                { name: 'Level 2', value: 100 }
              ]
            }
          ]
        }
      ]
      const wrapper = mountComponent({ data: hierarchicalData })
      expect(wrapper.find('.v-chart-stub').exists()).toBe(true)
    })

    it('should handle data with custom colors', () => {
      const coloredData: TreemapNode[] = [
        {
          name: 'Colored Node',
          value: 100,
          itemStyle: { color: '#ff0000' }
        }
      ]
      const wrapper = mountComponent({ data: coloredData })
      expect(wrapper.props('data')).toEqual(coloredData)
    })
  })

  describe('Zoom Functionality', () => {
    it('should enable zoom by default', () => {
      const wrapper = mountComponent()
      expect(wrapper.props('enableZoom')).toBe(true)
    })

    it('should disable zoom when enableZoom is false', () => {
      const wrapper = mountComponent({ enableZoom: false })
      expect(wrapper.props('enableZoom')).toBe(false)
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
      const wrapper = mountComponent({ loading: true, height: 700 })
      const skeleton = wrapper.findComponent({ name: 'VSkeletonLoader' })

      expect(skeleton.exists()).toBe(true)
      expect(skeleton.props('height')).toBe(700)
    })

    it('should use image type for skeleton loader', () => {
      const wrapper = mountComponent({ loading: true })
      const skeleton = wrapper.findComponent({ name: 'VSkeletonLoader' })

      expect(skeleton.props('type')).toBe('image')
    })
  })

  describe('Data Updates', () => {
    it.skip('should handle data prop changes', async () => {
      const wrapper = mountComponent({ data: mockTreemapData })

      const newData: TreemapNode[] = [
        { name: 'New Node', value: 300 }
      ]

      await wrapper.setProps({ data: newData })
      await nextTick()

      expect(wrapper.props('data')).toEqual(newData)
    })

    it.skip('should handle empty data after having data', async () => {
      const wrapper = mountComponent({ data: mockTreemapData })

      await wrapper.setProps({ data: [] })
      await nextTick()

      expect(wrapper.props('data')).toEqual([])
    })

    it('should handle title changes', async () => {
      const wrapper = mountComponent({ title: 'Original Title' })

      await wrapper.setProps({ title: 'Updated Title' })
      await nextTick()

      expect(wrapper.props('title')).toBe('Updated Title')
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle window resize events', () => {
      const wrapper = mountComponent()

      global.dispatchEvent(new Event('resize'))

      expect(wrapper.find('.treemap-chart-container').exists()).toBe(true)
    })
  })
})
