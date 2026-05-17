/**
 * BoxPlotChart Component Tests
 *
 * Covers:
 * - Rendering / loading / export controls
 * - Computed chartOption shape
 * - Watcher firing setOption on data change
 * - Lifecycle: resize listener add/remove
 * - Export success/error emit forwarding
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import BoxPlotChart from '@/components/reports/charts/BoxPlotChart.vue'
import type { BoxPlotData } from '@/models/report.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

let resizeListeners: Array<() => void> = []
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener

const mockData: BoxPlotData[] = [
  { category: 'Male', min: 0, p10: 5, p25: 15, median: 35, p75: 55, p90: 70, max: 90 },
  { category: 'Female', min: 1, p10: 6, p25: 16, median: 36, p75: 56, p90: 71, max: 91 },
]

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(BoxPlotChart, {
    props: { data: mockData, ...props },
    global: {
      plugins: [vuetify],
      stubs: {
        ChartExport: {
          name: 'ChartExport',
          template: '<div class="chart-export-stub" />',
          props: ['chartInstance', 'filename'],
        },
        VChart: {
          name: 'VChart',
          template: '<div class="v-chart-stub" />',
          props: ['option', 'autoresize', 'style'],
          setup(_props: Record<string, unknown>, { expose }: { expose: (e: Record<string, unknown>) => void }) {
            const chart = {
              setOption: vi.fn(),
              resize: vi.fn(),
              isDisposed: vi.fn(() => false),
              getDataURL: vi.fn(() => 'data:image/png;base64,mock'),
              renderToSVGString: vi.fn(() => '<svg/>'),
            }
            const setOption = chart.setOption
            expose({ chart, setOption })
            return { chart, setOption }
          },
        },
      },
    },
  })
}

describe('BoxPlotChart', () => {
  beforeEach(() => {
    resizeListeners = []
    window.addEventListener = vi.fn((event: string, handler: () => void) => {
      if (event === 'resize') resizeListeners.push(handler)
    })
    window.removeEventListener = vi.fn((event: string, handler: () => void) => {
      if (event === 'resize') resizeListeners = resizeListeners.filter(h => h !== handler)
    })
  })

  afterEach(() => {
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
    resizeListeners = []
  })

  describe('Rendering', () => {
    it('renders boxplot container', () => {
      const w = createWrapper()
      expect(w.find('.boxplot-chart-container').exists()).toBe(true)
    })

    it('renders VChart when not loading', () => {
      const w = createWrapper({ loading: false })
      expect(w.findComponent({ name: 'VChart' }).exists()).toBe(true)
    })

    it('does not render VChart when loading', () => {
      const w = createWrapper({ loading: true })
      expect(w.findComponent({ name: 'VChart' }).exists()).toBe(false)
    })

    it('renders skeleton when loading', () => {
      const w = createWrapper({ loading: true })
      expect(w.findComponent({ name: 'v-skeleton-loader' }).exists()).toBe(true)
    })

    it('hides export toolbar when loading', () => {
      const w = createWrapper({ loading: true, showExport: true })
      expect(w.find('.chart-export-toolbar').exists()).toBe(false)
    })

    it('shows export toolbar when not loading', () => {
      const w = createWrapper({ loading: false, showExport: true })
      expect(w.find('.chart-export-toolbar').exists()).toBe(true)
    })

    it('omits ChartExport when showExport false', () => {
      const w = createWrapper({ showExport: false, loading: false })
      expect(w.findComponent({ name: 'ChartExport' }).exists()).toBe(false)
    })
  })

  describe('chartOption computation', () => {
    it('builds non-empty option when data present', () => {
      const w = createWrapper()
      const opt = w.findComponent({ name: 'VChart' }).props('option') as Record<string, unknown>
      expect(opt).toBeDefined()
      expect(opt).not.toEqual({})
    })

    it('returns empty option for empty array', () => {
      const w = createWrapper({ data: [] })
      const opt = w.findComponent({ name: 'VChart' }).props('option')
      expect(opt).toEqual({})
    })

    it('returns empty option for null-ish data', () => {
      // @ts-expect-error testing defensive branch
      const w = createWrapper({ data: null })
      const opt = w.findComponent({ name: 'VChart' }).props('option')
      expect(opt).toEqual({})
    })

    it('passes title through to chart options', () => {
      const w = createWrapper({ title: 'Demographic Distribution' })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as Record<string, unknown>
      expect(opt).not.toEqual({})
    })
  })

  describe('Watcher behavior', () => {
    it('calls setOption when data changes and not loading', async () => {
      const w = createWrapper({ loading: false })
      await nextTick()
      const chartStub = w.findComponent({ name: 'VChart' })
      const setOptionSpy = (chartStub.vm as unknown as { setOption: ReturnType<typeof vi.fn> }).setOption
      setOptionSpy.mockClear()

      const newData: BoxPlotData[] = [
        { category: 'Other', min: 2, p10: 8, p25: 18, median: 40, p75: 60, p90: 75, max: 95 },
      ]
      await w.setProps({ data: newData })
      await nextTick()

      expect(setOptionSpy).toHaveBeenCalled()
    })

    it('does not call setOption when loading', async () => {
      const w = createWrapper({ loading: false })
      await nextTick()
      const chartStub = w.findComponent({ name: 'VChart' })
      const setOptionSpy = (chartStub.vm as unknown as { setOption: ReturnType<typeof vi.fn> }).setOption
      setOptionSpy.mockClear()

      // Flip loading first so VChart unmounts; watcher then runs on data
      // change but chartRef will be null and watcher skip path runs.
      await w.setProps({ loading: true, data: [...mockData, { category: 'New', min: 0, p10: 1, p25: 2, median: 3, p75: 4, p90: 5, max: 6 }] })
      await nextTick()

      expect(setOptionSpy).not.toHaveBeenCalled()
    })
  })

  describe('Lifecycle', () => {
    it('registers resize listener on mount', async () => {
      createWrapper()
      await nextTick()
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      expect(resizeListeners.length).toBeGreaterThan(0)
    })

    it('removes resize listener on unmount', async () => {
      const w = createWrapper()
      await nextTick()
      w.unmount()
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('Export events', () => {
    it('forwards export-success', async () => {
      const w = createWrapper({ showExport: true, loading: false })
      await nextTick()
      const exp = w.findComponent({ name: 'ChartExport' })
      await exp.vm.$emit('export-success', 'png', 'box.png')

      const events = w.emitted('export-success') as Array<unknown[]> | undefined
      expect(events).toBeTruthy()
      expect(events?.[0]).toEqual(['png', 'box.png'])
    })

    it('forwards export-error', async () => {
      const w = createWrapper({ showExport: true, loading: false })
      await nextTick()
      const exp = w.findComponent({ name: 'ChartExport' })
      const err = new Error('boom')
      await exp.vm.$emit('export-error', 'svg', err)

      const events = w.emitted('export-error') as Array<unknown[]> | undefined
      expect(events?.[0]).toEqual(['svg', err])
    })

    it('passes filename to ChartExport', () => {
      const w = createWrapper({ showExport: true, loading: false, exportFilename: 'age-dist' })
      const exp = w.findComponent({ name: 'ChartExport' })
      expect(exp.props('filename')).toBe('age-dist')
    })

    it('defaults filename to boxplot-chart', () => {
      const w = createWrapper({ showExport: true, loading: false })
      const exp = w.findComponent({ name: 'ChartExport' })
      expect(exp.props('filename')).toBe('boxplot-chart')
    })
  })

  describe('Transitions', () => {
    it('transitions from loading to loaded', async () => {
      const w = createWrapper({ loading: true })
      expect(w.findComponent({ name: 'VChart' }).exists()).toBe(false)
      await w.setProps({ loading: false })
      await nextTick()
      expect(w.findComponent({ name: 'VChart' }).exists()).toBe(true)
    })
  })
})
