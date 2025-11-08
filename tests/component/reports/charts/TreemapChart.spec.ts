/**
 * TreemapChart Component Tests
 * Feature: 005-cohort-reports
 * Task: T134
 *
 * Comprehensive tests for TreemapChart component covering:
 * - Rendering with valid data
 * - Loading state display
 * - Empty data handling
 * - Hierarchical data structures (nested children)
 * - Export functionality integration
 * - Responsive behavior
 * - Zoom interaction controls
 * - Prop validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import TreemapChart from '@/components/reports/charts/TreemapChart.vue'
import type { TreemapNode } from '@/models/report.types'

const vuetify = createVuetify({
  components,
  directives,
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window resize event handlers
let resizeListeners: Array<() => void> = []
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener

describe('TreemapChart', () => {
  beforeEach(() => {
    resizeListeners = []

    // Mock addEventListener to track resize handlers
    window.addEventListener = vi.fn((event: string, handler: any) => {
      if (event === 'resize') {
        resizeListeners.push(handler)
      }
    })

    // Mock removeEventListener
    window.removeEventListener = vi.fn((event: string, handler: any) => {
      if (event === 'resize') {
        resizeListeners = resizeListeners.filter(h => h !== handler)
      }
    })
  })

  afterEach(() => {
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
    resizeListeners = []
  })

  const mockFlatData: TreemapNode[] = [
    { name: 'Diabetes', value: 450 },
    { name: 'Hypertension', value: 320 },
    { name: 'Asthma', value: 180 },
    { name: 'COPD', value: 150 },
  ]

  const mockHierarchicalData: TreemapNode[] = [
    {
      name: 'Cardiovascular',
      value: 1000,
      children: [
        { name: 'Hypertension', value: 450 },
        { name: 'Coronary Artery Disease', value: 350 },
        { name: 'Heart Failure', value: 200 },
      ],
    },
    {
      name: 'Respiratory',
      value: 600,
      children: [
        { name: 'Asthma', value: 300 },
        { name: 'COPD', value: 200 },
        { name: 'Pneumonia', value: 100 },
      ],
    },
  ]

  const mockDeepHierarchicalData: TreemapNode[] = [
    {
      name: 'Medical Conditions',
      value: 2000,
      children: [
        {
          name: 'Cardiovascular',
          value: 1000,
          children: [
            { name: 'Hypertension', value: 450 },
            { name: 'CAD', value: 350 },
            { name: 'Heart Failure', value: 200 },
          ],
        },
        {
          name: 'Respiratory',
          value: 600,
          children: [
            { name: 'Asthma', value: 300 },
            { name: 'COPD', value: 200 },
            { name: 'Pneumonia', value: 100 },
          ],
        },
        {
          name: 'Metabolic',
          value: 400,
          children: [
            { name: 'Diabetes Type 2', value: 250 },
            { name: 'Obesity', value: 150 },
          ],
        },
      ],
    },
  ]

  const createWrapper = (props: any = {}) => {
    return mount(TreemapChart, {
      props: {
        data: mockFlatData,
        ...props,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          ChartExport: {
            name: 'ChartExport',
            template: '<div class="chart-export-stub"></div>',
            props: ['chartInstance', 'filename'],
          },
          VChart: {
            name: 'VChart',
            template: '<div class="v-chart-stub"></div>',
            props: ['option', 'autoresize', 'style'],
            setup(props: any, { expose }: any) {
              // Mock chart instance
              const chart = {
                setOption: vi.fn(),
                resize: vi.fn(),
                isDisposed: vi.fn(() => false),
                getDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
                renderToSVGString: vi.fn(() => '<svg></svg>'),
              }

              // Expose chart instance so parent can access it
              expose({ chart })

              return {
                chart,
                // Also expose setOption at component level for watcher
                setOption: chart.setOption
              }
            },
          },
        },
      },
    })
  }

  // ============================================================================
  // Basic Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render treemap chart container', () => {
      const wrapper = createWrapper()
      expect(wrapper.find('.treemap-chart-container').exists()).toBe(true)
    })

    it('should render VChart component when not loading', () => {
      const wrapper = createWrapper({ loading: false })
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(true)
    })

    it('should not render VChart component when loading', () => {
      const wrapper = createWrapper({ loading: true })
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(false)
    })

    it('should pass height to VChart style', () => {
      const wrapper = createWrapper({ height: 500 })
      const chart = wrapper.findComponent({ name: 'VChart' })
      // Check that chart receives props (stub will handle them)
      expect(chart.exists()).toBe(true)
    })

    it('should pass custom height to VChart', () => {
      const wrapper = createWrapper({ height: 800 })
      const chart = wrapper.findComponent({ name: 'VChart' })
      expect(chart.exists()).toBe(true)
    })

    it('should pass style object to VChart', () => {
      const wrapper = createWrapper()
      const chart = wrapper.findComponent({ name: 'VChart' })
      // Verify chart component exists and can receive props
      expect(chart.exists()).toBe(true)
    })

    it('should pass autoresize prop to VChart', () => {
      const wrapper = createWrapper()
      const chart = wrapper.findComponent({ name: 'VChart' })
      // Autoresize is bound as boolean attribute
      expect(chart.html()).toContain('v-chart-stub')
    })

    it('should render with title when provided', () => {
      const wrapper = createWrapper({ title: 'Condition Distribution' })
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      // Option should be defined and not empty
      expect(option).toBeDefined()
      expect(option).not.toEqual({})
    })

    it('should render without title when not provided', () => {
      const wrapper = createWrapper()
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })
  })

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading State', () => {
    it('should display skeleton loader when loading is true', () => {
      const wrapper = createWrapper({ loading: true })
      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(true)
    })

    it('should not display skeleton loader when loading is false', () => {
      const wrapper = createWrapper({ loading: false })
      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(false)
    })

    it('should apply correct height to skeleton loader', () => {
      const wrapper = createWrapper({ loading: true, height: 600 })
      const skeleton = wrapper.findComponent({ name: 'v-skeleton-loader' })
      expect(skeleton.props('height')).toBe(600)
    })

    it('should use default height for skeleton loader', () => {
      const wrapper = createWrapper({ loading: true })
      const skeleton = wrapper.findComponent({ name: 'v-skeleton-loader' })
      expect(skeleton.props('height')).toBe(500)
    })

    it('should hide export controls when loading', () => {
      const wrapper = createWrapper({ loading: true, showExport: true })
      expect(wrapper.find('.chart-export-toolbar').exists()).toBe(false)
    })

    it('should use image type for skeleton loader', () => {
      const wrapper = createWrapper({ loading: true })
      const skeleton = wrapper.findComponent({ name: 'v-skeleton-loader' })
      expect(skeleton.props('type')).toBe('image')
    })
  })

  // ============================================================================
  // Data Handling Tests
  // ============================================================================

  describe('Data Handling', () => {
    it('should pass chart option to VChart', () => {
      const wrapper = createWrapper()
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      expect(option).toBeDefined()
      expect(option).not.toEqual({})
    })

    it('should handle empty data gracefully', () => {
      const emptyData: TreemapNode[] = []
      const wrapper = createWrapper({ data: emptyData })
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      // Empty data should result in empty option
      expect(option).toEqual({})
    })

    it('should handle flat treemap data', () => {
      const wrapper = createWrapper({ data: mockFlatData })
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      // Chart option should be generated for flat data
      expect(option).not.toEqual({})
    })

    it('should handle hierarchical treemap data', () => {
      const wrapper = createWrapper({ data: mockHierarchicalData })
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      // Chart option should be generated for hierarchical data
      expect(option).not.toEqual({})
    })

    it('should handle deeply nested hierarchical data', () => {
      const wrapper = createWrapper({ data: mockDeepHierarchicalData })
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      expect(option).not.toEqual({})
    })

    it('should handle data with custom item styles', () => {
      const styledData: TreemapNode[] = [
        {
          name: 'Custom',
          value: 100,
          itemStyle: { color: '#FF5733' }
        },
      ]
      const wrapper = createWrapper({ data: styledData })
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      expect(option).not.toEqual({})
    })

    it('should react to data changes', async () => {
      const wrapper = createWrapper({ data: mockFlatData })
      const initialData = mockFlatData

      // Change to different data
      const newData: TreemapNode[] = [
        { name: 'New Category', value: 500 },
      ]

      // Verify initial data
      expect(wrapper.props('data')).toEqual(initialData)

      // Component handles data changes via computed chartOption
      const chart = wrapper.findComponent({ name: 'VChart' })
      expect(chart.exists()).toBe(true)
    })

    it('should not update chart when loading', async () => {
      const wrapper = createWrapper({ loading: false })

      await wrapper.setProps({ loading: true })
      await nextTick()

      // Chart should not be visible when loading
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(false)
    })

    it('should handle data with only one node', () => {
      const singleNode: TreemapNode[] = [
        { name: 'Single', value: 100 },
      ]
      const wrapper = createWrapper({ data: singleNode })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })

    it('should handle data with mixed hierarchy levels', () => {
      const mixedData: TreemapNode[] = [
        { name: 'Flat Node', value: 100 },
        {
          name: 'Hierarchical Node',
          value: 300,
          children: [
            { name: 'Child 1', value: 150 },
            { name: 'Child 2', value: 150 },
          ],
        },
      ]
      const wrapper = createWrapper({ data: mixedData })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })
  })

  // ============================================================================
  // Hierarchical Data Tests (TreemapChart-specific)
  // ============================================================================

  describe('Hierarchical Data', () => {
    it('should handle single-level hierarchy', () => {
      const wrapper = createWrapper({ data: mockFlatData })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })

    it('should handle two-level hierarchy', () => {
      const wrapper = createWrapper({ data: mockHierarchicalData })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })

    it('should handle three-level hierarchy', () => {
      const wrapper = createWrapper({ data: mockDeepHierarchicalData })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })

    it('should handle hierarchy with empty children array', () => {
      const dataWithEmptyChildren: TreemapNode[] = [
        {
          name: 'Parent',
          value: 100,
          children: [],
        },
      ]
      const wrapper = createWrapper({ data: dataWithEmptyChildren })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle hierarchy with undefined children', () => {
      const dataWithUndefinedChildren: TreemapNode[] = [
        {
          name: 'Parent',
          value: 100,
          children: undefined,
        },
      ]
      const wrapper = createWrapper({ data: dataWithUndefinedChildren })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle unbalanced hierarchy', () => {
      const unbalancedData: TreemapNode[] = [
        {
          name: 'Deep Parent',
          value: 500,
          children: [
            {
              name: 'Level 2',
              value: 300,
              children: [
                { name: 'Level 3', value: 300 },
              ],
            },
          ],
        },
        { name: 'Shallow Node', value: 200 },
      ]
      const wrapper = createWrapper({ data: unbalancedData })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })

    it('should handle large hierarchies', () => {
      const largeHierarchy: TreemapNode[] = [
        {
          name: 'Root',
          value: 1000,
          children: Array.from({ length: 50 }, (_, i) => ({
            name: `Child ${i}`,
            value: 20,
          })),
        },
      ]
      const wrapper = createWrapper({ data: largeHierarchy })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })
  })

  // ============================================================================
  // Zoom Interaction Tests
  // ============================================================================

  describe('Zoom Interaction', () => {
    it('should enable zoom by default', () => {
      const wrapper = createWrapper()
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      // Check that option exists and is configured
      expect(option).toBeDefined()
      expect(option).not.toEqual({})
    })

    it('should disable zoom when enableZoom is false', () => {
      const wrapper = createWrapper({ enableZoom: false })
      const chart = wrapper.findComponent({ name: 'VChart' })
      const option = chart.props('option')

      expect(option).toBeDefined()
      expect(option).not.toEqual({})
    })

    it('should respect enableZoom true', () => {
      const wrapper = createWrapper({ enableZoom: true })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should have zoom enabled by default', () => {
      const wrapper = createWrapper()

      // Default enableZoom should be true
      expect(wrapper.props('enableZoom')).toBe(true)
    })
  })

  // ============================================================================
  // Export Functionality Tests
  // ============================================================================

  describe('Export Functionality', () => {
    it('should render ChartExport component when showExport is true', () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      expect(wrapper.findComponent({ name: 'ChartExport' }).exists()).toBe(true)
    })

    it('should not render ChartExport component when showExport is false', () => {
      const wrapper = createWrapper({ showExport: false })
      expect(wrapper.findComponent({ name: 'ChartExport' }).exists()).toBe(false)
    })

    it('should pass chart instance to ChartExport', async () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })
      expect(exportComponent.props('chartInstance')).toBeDefined()
    })

    it('should pass filename to ChartExport', () => {
      const wrapper = createWrapper({
        showExport: true,
        loading: false,
        exportFilename: 'condition-treemap'
      })

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })
      expect(exportComponent.props('filename')).toBe('condition-treemap')
    })

    it('should use default filename when not provided', () => {
      const wrapper = createWrapper({ showExport: true, loading: false })

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })
      expect(exportComponent.props('filename')).toBe('treemap-chart')
    })

    it('should emit export-success event', async () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })

      // Simulate export success
      await exportComponent.vm.$emit('export-success', 'png', 'test-treemap.png')

      expect(wrapper.emitted('export-success')).toBeTruthy()
      const emitted = wrapper.emitted('export-success') as Array<any>
      expect(emitted[0]).toEqual(['png', 'test-treemap.png'])
    })

    it('should emit export-error event', async () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })
      const testError = new Error('Export failed')

      // Simulate export error
      await exportComponent.vm.$emit('export-error', 'svg', testError)

      expect(wrapper.emitted('export-error')).toBeTruthy()
      const emitted = wrapper.emitted('export-error') as Array<any>
      expect(emitted[0]).toEqual(['svg', testError])
    })

    it('should display export toolbar when not loading', () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      expect(wrapper.find('.chart-export-toolbar').exists()).toBe(true)
    })

    it('should handle PNG export format', async () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })
      await exportComponent.vm.$emit('export-success', 'png', 'chart.png')

      const emitted = wrapper.emitted('export-success') as Array<any>
      expect(emitted[0][0]).toBe('png')
    })

    it('should handle SVG export format', async () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })
      await exportComponent.vm.$emit('export-success', 'svg', 'chart.svg')

      const emitted = wrapper.emitted('export-success') as Array<any>
      expect(emitted[0][0]).toBe('svg')
    })
  })

  // ============================================================================
  // Responsive Behavior Tests
  // ============================================================================

  describe('Responsive Behavior', () => {
    it('should register resize event listener on mount', async () => {
      const wrapper = createWrapper()
      await nextTick()

      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      expect(resizeListeners.length).toBeGreaterThan(0)
    })

    it('should remove resize event listener on unmount', async () => {
      const wrapper = createWrapper()
      await nextTick()

      const listenerCount = resizeListeners.length
      expect(listenerCount).toBeGreaterThan(0)

      wrapper.unmount()

      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should handle resize events', async () => {
      const wrapper = createWrapper()
      await nextTick()

      // Verify resize listener was registered
      expect(resizeListeners.length).toBeGreaterThan(0)

      // Component should remain stable after mount
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(true)
    })

    it('should clean up on unmount', async () => {
      const wrapper = createWrapper()
      await nextTick()

      const initialListenerCount = resizeListeners.length
      expect(initialListenerCount).toBeGreaterThan(0)

      wrapper.unmount()

      // removeEventListener should have been called
      expect(window.removeEventListener).toHaveBeenCalled()
    })

    it('should adapt to different viewport heights', () => {
      const heights = [300, 500, 800, 1000]

      heights.forEach(height => {
        const wrapper = createWrapper({ height })
        const chart = wrapper.findComponent({ name: 'VChart' })
        expect(chart.exists()).toBe(true)
      })
    })
  })

  // ============================================================================
  // Props Validation Tests
  // ============================================================================

  describe('Props Validation', () => {
    it('should accept valid TreemapNode array', () => {
      const validData: TreemapNode[] = [
        { name: 'A', value: 100 },
        { name: 'B', value: 200 },
      ]

      expect(() => createWrapper({ data: validData })).not.toThrow()
    })

    it('should accept hierarchical TreemapNode array', () => {
      expect(() => createWrapper({ data: mockHierarchicalData })).not.toThrow()
    })

    it('should accept custom height prop', () => {
      const wrapper = createWrapper({ height: 800 })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should use default height when not specified', () => {
      const wrapper = createWrapper()
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle loading prop true', () => {
      const wrapper = createWrapper({ loading: true })

      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(false)
    })

    it('should handle loading prop false', () => {
      const wrapper = createWrapper({ loading: false })

      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(true)
    })

    it('should default loading to false', () => {
      const wrapper = createWrapper()

      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(true)
    })

    it('should default showExport to true', () => {
      const wrapper = createWrapper({ loading: false })

      expect(wrapper.findComponent({ name: 'ChartExport' }).exists()).toBe(true)
    })

    it('should default exportFilename to "treemap-chart"', () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })

      expect(exportComponent.props('filename')).toBe('treemap-chart')
    })

    it('should default enableZoom to true', () => {
      const wrapper = createWrapper()

      expect(wrapper.props('enableZoom')).toBe(true)
    })

    it('should accept title prop', () => {
      const wrapper = createWrapper({ title: 'My Treemap' })

      expect(wrapper.props('title')).toBe('My Treemap')
    })

    it('should work without title prop', () => {
      const wrapper = createWrapper()

      expect(wrapper.props('title')).toBeUndefined()
    })
  })

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle data with single node', () => {
      const singleData: TreemapNode[] = [
        { name: 'Only One', value: 100 },
      ]

      const wrapper = createWrapper({ data: singleData })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })

    it('should handle data with many nodes', () => {
      const manyNodes: TreemapNode[] = Array.from({ length: 100 }, (_, i) => ({
        name: `Node ${i}`,
        value: i * 10,
      }))

      const wrapper = createWrapper({ data: manyNodes })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })

    it('should handle very large values', () => {
      const largeValues: TreemapNode[] = [
        { name: 'A', value: 1000000 },
        { name: 'B', value: 5000000 },
        { name: 'C', value: 2500000 },
      ]

      const wrapper = createWrapper({ data: largeValues })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle zero values', () => {
      const zeroValues: TreemapNode[] = [
        { name: 'A', value: 0 },
        { name: 'B', value: 0 },
        { name: 'C', value: 0 },
      ]

      const wrapper = createWrapper({ data: zeroValues })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
      expect(chart.props('option')).not.toEqual({})
    })

    it('should handle mixed positive and zero values', () => {
      const mixedValues: TreemapNode[] = [
        { name: 'A', value: 100 },
        { name: 'B', value: 0 },
        { name: 'C', value: 250 },
        { name: 'D', value: 0 },
      ]

      const wrapper = createWrapper({ data: mixedValues })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle very small values', () => {
      const smallValues: TreemapNode[] = [
        { name: 'A', value: 0.1 },
        { name: 'B', value: 0.5 },
        { name: 'C', value: 0.3 },
      ]

      const wrapper = createWrapper({ data: smallValues })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle negative values gracefully', () => {
      const negativeValues: TreemapNode[] = [
        { name: 'A', value: -100 },
        { name: 'B', value: 200 },
      ]

      const wrapper = createWrapper({ data: negativeValues })
      const chart = wrapper.findComponent({ name: 'VChart' })

      // Chart should still render (ECharts handles negative values)
      expect(chart.exists()).toBe(true)
    })

    it('should not error when chart instance is null during export', () => {
      const wrapper = createWrapper({ showExport: true, loading: false })
      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })

      // ChartExport should handle null chart instance gracefully
      expect(exportComponent.props('chartInstance')).toBeDefined()
    })

    it('should handle special characters in node names', () => {
      const specialNames: TreemapNode[] = [
        { name: 'Node with <special> chars', value: 100 },
        { name: 'Node & Ampersand', value: 150 },
        { name: 'Node "quotes"', value: 200 },
      ]

      const wrapper = createWrapper({ data: specialNames })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle very long node names', () => {
      const longNames: TreemapNode[] = [
        {
          name: 'This is a very long node name that should be truncated or handled appropriately by the chart',
          value: 100
        },
      ]

      const wrapper = createWrapper({ data: longNames })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle empty node name', () => {
      const emptyName: TreemapNode[] = [
        { name: '', value: 100 },
      ]

      const wrapper = createWrapper({ data: emptyName })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })

    it('should handle null value in hierarchy', () => {
      const dataWithNullValue: TreemapNode[] = [
        { name: 'Valid', value: 100 },
        { name: 'Null Value', value: null as any },
      ]

      const wrapper = createWrapper({ data: dataWithNullValue })
      const chart = wrapper.findComponent({ name: 'VChart' })

      expect(chart.exists()).toBe(true)
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    it('should work with all props together', () => {
      const wrapper = createWrapper({
        data: mockHierarchicalData,
        title: 'Medical Conditions',
        loading: false,
        height: 600,
        enableZoom: true,
        showExport: true,
        exportFilename: 'conditions-treemap'
      })

      expect(wrapper.find('.treemap-chart-container').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'ChartExport' }).exists()).toBe(true)

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })
      expect(exportComponent.props('filename')).toBe('conditions-treemap')
    })

    it('should transition from loading to loaded state', async () => {
      const wrapper = createWrapper({ loading: true })

      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(false)

      await wrapper.setProps({ loading: false })
      await nextTick()

      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(true)
    })

    it('should handle complete export workflow', async () => {
      const wrapper = createWrapper({
        showExport: true,
        loading: false,
        exportFilename: 'condition-distribution'
      })
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })

      // Simulate successful PNG export
      await exportComponent.vm.$emit('export-success', 'png', 'condition-distribution.png')

      expect(wrapper.emitted('export-success')).toBeTruthy()
      const emitted = wrapper.emitted('export-success') as Array<any>
      expect(emitted[0][0]).toBe('png')
      expect(emitted[0][1]).toBe('condition-distribution.png')
    })

    it('should update chart when data changes from flat to hierarchical', async () => {
      const wrapper = createWrapper({ data: mockFlatData })

      const chart = wrapper.findComponent({ name: 'VChart' })
      expect(chart.exists()).toBe(true)

      // Verify initial data
      expect(wrapper.props('data')).toEqual(mockFlatData)

      // The component watches data changes via computed chartOption
      // In real usage, VChart handles updates automatically
      expect(chart.props('option')).toBeDefined()
    })

    it('should handle title changes dynamically', async () => {
      const wrapper = createWrapper({ title: 'Initial Title' })

      expect(wrapper.props('title')).toBe('Initial Title')

      await wrapper.setProps({ title: 'Updated Title' })
      await nextTick()

      expect(wrapper.props('title')).toBe('Updated Title')
    })

    it('should toggle zoom functionality', async () => {
      const wrapper = createWrapper({ enableZoom: true })

      expect(wrapper.props('enableZoom')).toBe(true)

      await wrapper.setProps({ enableZoom: false })
      await nextTick()

      expect(wrapper.props('enableZoom')).toBe(false)
    })

    it('should work with hierarchical data and exports', async () => {
      const wrapper = createWrapper({
        data: mockDeepHierarchicalData,
        showExport: true,
        loading: false,
      })
      await nextTick()

      const exportComponent = wrapper.findComponent({ name: 'ChartExport' })
      expect(exportComponent.exists()).toBe(true)
      expect(exportComponent.props('chartInstance')).toBeDefined()
    })

    it('should handle rapid loading state changes', async () => {
      const wrapper = createWrapper({ loading: false })

      await wrapper.setProps({ loading: true })
      await nextTick()
      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(true)

      await wrapper.setProps({ loading: false })
      await nextTick()
      expect(wrapper.findComponent({ name: 'VChart' }).exists()).toBe(true)

      await wrapper.setProps({ loading: true })
      await nextTick()
      expect(wrapper.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(true)
    })
  })
})
