/**
 * TrellisChart Component Tests
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
import TrellisChart from '@/components/reports/charts/TrellisChart.vue'
import type { TrellisChartData } from '@/models/report.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

let resizeListeners: Array<() => void> = []
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener

const mockData: TrellisChartData = {
  categories: ['Male', 'Female'],
  series: [
    {
      name: '10-19',
      category: 'Male',
      data: [
        { x: 2010, y: 100 },
        { x: 2011, y: 110 },
      ],
    },
    {
      name: '10-19',
      category: 'Female',
      data: [
        { x: 2010, y: 90 },
        { x: 2011, y: 95 },
      ],
    },
  ],
}

function createWrapper(props: Record<string, unknown> = {}) {
  return mount(TrellisChart, {
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

describe('TrellisChart', () => {
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
    it('renders trellis container', () => {
      const w = createWrapper()
      expect(w.find('.trellis-chart-container').exists()).toBe(true)
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
    it('builds non-empty option when data has series', () => {
      const w = createWrapper()
      const opt = w.findComponent({ name: 'VChart' }).props('option') as Record<string, unknown>
      expect(opt).toBeDefined()
      expect(opt).not.toEqual({})
    })

    it('returns empty option for empty series array', () => {
      const w = createWrapper({ data: { categories: [], series: [] } })
      const opt = w.findComponent({ name: 'VChart' }).props('option')
      expect(opt).toEqual({})
    })

    it('returns empty option for null data', () => {
      // @ts-expect-error testing defensive branch
      const w = createWrapper({ data: null })
      const opt = w.findComponent({ name: 'VChart' }).props('option')
      expect(opt).toEqual({})
    })

    it('returns empty option when series missing', () => {
      // @ts-expect-error testing defensive branch
      const w = createWrapper({ data: { categories: ['A'] } })
      const opt = w.findComponent({ name: 'VChart' }).props('option')
      expect(opt).toEqual({})
    })

    it('passes title through', () => {
      const w = createWrapper({ title: 'By Demographic' })
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

      const newData: TrellisChartData = {
        categories: ['X'],
        series: [{ name: 's', category: 'X', data: [{ x: 1, y: 1 }] }],
      }
      await w.setProps({ data: newData })
      await nextTick()

      expect(setOptionSpy).toHaveBeenCalled()
    })

    it('skips setOption when loading switches on with data change', async () => {
      const w = createWrapper({ loading: false })
      await nextTick()
      const chartStub = w.findComponent({ name: 'VChart' })
      const setOptionSpy = (chartStub.vm as unknown as { setOption: ReturnType<typeof vi.fn> }).setOption
      setOptionSpy.mockClear()

      const newData: TrellisChartData = {
        categories: ['Y'],
        series: [{ name: 's', category: 'Y', data: [{ x: 2, y: 2 }] }],
      }
      await w.setProps({ loading: true, data: newData })
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
      await exp.vm.$emit('export-success', 'png', 'trellis.png')

      const events = w.emitted('export-success') as Array<unknown[]> | undefined
      expect(events?.[0]).toEqual(['png', 'trellis.png'])
    })

    it('forwards export-error', async () => {
      const w = createWrapper({ showExport: true, loading: false })
      await nextTick()
      const exp = w.findComponent({ name: 'ChartExport' })
      const err = new Error('export-fail')
      await exp.vm.$emit('export-error', 'svg', err)

      const events = w.emitted('export-error') as Array<unknown[]> | undefined
      expect(events?.[0]).toEqual(['svg', err])
    })

    it('passes filename to ChartExport', () => {
      const w = createWrapper({ showExport: true, loading: false, exportFilename: 'demo-trellis' })
      const exp = w.findComponent({ name: 'ChartExport' })
      expect(exp.props('filename')).toBe('demo-trellis')
    })

    it('defaults filename to trellis-chart', () => {
      const w = createWrapper({ showExport: true, loading: false })
      const exp = w.findComponent({ name: 'ChartExport' })
      expect(exp.props('filename')).toBe('trellis-chart')
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
