import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import ChartExport from '@/components/ui/charts/AtlasChartExport.vue'
import AtlasButton from '@/components/ui/AtlasButton.vue'
import { setChartTheme } from '@/ui/chart-config'

// The app registers these globally in main.ts; the off-screen SVG exporter
// reuses that registration, so the spec has to mirror it to get real output.
echarts.use([BarChart, GridComponent])

const vuetify = createVuetify({ components, directives })

const CHART_OPTION = {
  xAxis: { type: 'category', data: ['a', 'b'] },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [1, 2] }],
}

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(ChartExport, {
    props,
    global: {
      plugins: [vuetify],
      stubs: {
        'v-btn': {
          template: '<button :disabled="disabled" :loading="loading" @click="$emit(\'click\')"><slot /></button>',
          props: ['disabled', 'loading', 'size', 'prependIcon']
        },
        'v-btn-group': {
          template: '<div class="v-btn-group"><slot /></div>'
        }
      }
    }
  })
}

// Mock ECharts instance
function createMockChartInstance(options: {
  getDataURL?: () => string
  renderToSVGString?: () => string | undefined
  getOption?: () => unknown
  getWidth?: () => number
  getHeight?: () => number
} = {}) {
  return {
    getDataURL: options.getDataURL || vi.fn(() => 'data:image/png;base64,mockData'),
    renderToSVGString: options.renderToSVGString,
    getOption: options.getOption || vi.fn(() => CHART_OPTION),
    getWidth: options.getWidth || vi.fn(() => 600),
    getHeight: options.getHeight || vi.fn(() => 400)
  }
}

describe('ChartExport', () => {
  let originalCreateElement: typeof document.createElement
  let mockLink: {
    href: string
    download: string
    style: { display: string }
    click: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Mock document.createElement for anchor element
    mockLink = {
      href: '',
      download: '',
      style: { display: '' },
      click: vi.fn()
    }
    originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink as unknown as HTMLAnchorElement
      }
      return originalCreateElement(tagName)
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as unknown as HTMLElement)
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as unknown as HTMLElement)

    // Mock URL.createObjectURL and revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    setChartTheme('light')
  })

  describe('Rendering', () => {
    it('should render export buttons', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents(AtlasButton)
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toBe('PNG')
      expect(buttons[1].text()).toBe('SVG')
    })

    it('should disable buttons when no chart instance', () => {
      const wrapper = mountComponent({ chartInstance: null })
      const buttons = wrapper.findAllComponents(AtlasButton)
      expect(buttons[0].props('disabled')).toBe(true)
      expect(buttons[1].props('disabled')).toBe(true)
    })

    it('should enable buttons when chart instance is provided', () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance })
      const buttons = wrapper.findAllComponents(AtlasButton)
      expect(buttons[0].props('disabled')).toBe(false)
      expect(buttons[1].props('disabled')).toBe(false)
    })
  })

  describe('PNG Export', () => {
    it('should export PNG when button is clicked', async () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance, filename: 'test-chart' })

      const pngButton = wrapper.findAllComponents(AtlasButton)[0]
      await pngButton.trigger('click')

      // Background tracks the active chart theme (see CHART_SURFACE); the
      // rest of the export options are fixed and predate the theme work.
      expect(chartInstance.getDataURL).toHaveBeenCalledWith({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      })
      expect(mockLink.download).toBe('test-chart.png')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should export PNG with the dark surface as background when the dark theme is active', async () => {
      setChartTheme('dark')
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance, filename: 'test-chart' })

      const pngButton = wrapper.findAllComponents(AtlasButton)[0]
      await pngButton.trigger('click')

      expect(chartInstance.getDataURL).toHaveBeenCalledWith({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#161618'
      })
    })

    it('should emit export-start and export-success events', async () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance, filename: 'test' })

      const pngButton = wrapper.findAllComponents(AtlasButton)[0]
      await pngButton.trigger('click')

      expect(wrapper.emitted('export-start')).toBeTruthy()
      expect(wrapper.emitted('export-start')![0]).toEqual(['png'])
      expect(wrapper.emitted('export-success')).toBeTruthy()
      expect(wrapper.emitted('export-success')![0]).toEqual(['png', 'test.png'])
    })

    it('should use default filename with timestamp when not provided', async () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance })

      const pngButton = wrapper.findAllComponents(AtlasButton)[0]
      await pngButton.trigger('click')

      expect(mockLink.download).toMatch(/^chart-\d+\.png$/)
    })

    it('should emit export-error on failure', async () => {
      const chartInstance = createMockChartInstance({
        getDataURL: vi.fn(() => { throw new Error('Export failed') })
      })
      const wrapper = mountComponent({ chartInstance })

      const pngButton = wrapper.findAllComponents(AtlasButton)[0]
      await pngButton.trigger('click')

      expect(wrapper.emitted('export-error')).toBeTruthy()
      expect(wrapper.emitted('export-error')![0][0]).toBe('png')
      expect(wrapper.emitted('export-error')![0][1]).toBeInstanceOf(Error)
    })

    it('should not export when no chart instance', async () => {
      const wrapper = mountComponent({ chartInstance: null })

      // Force click even if disabled
      await wrapper.vm.handleExportPNG?.()

      expect(wrapper.emitted('export-start')).toBeFalsy()
    })
  })

  describe('SVG Export', () => {
    it('should export SVG when renderToSVGString is available', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => '<svg>test</svg>')
      })
      const wrapper = mountComponent({ chartInstance, filename: 'test-svg' })

      const svgButton = wrapper.findAllComponents(AtlasButton)[1]
      await svgButton.trigger('click')

      expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
      expect(mockLink.download).toBe('test-svg.svg')
      expect(mockLink.click).toHaveBeenCalled()
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should emit export-start and export-success for SVG', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => '<svg>test</svg>')
      })
      const wrapper = mountComponent({ chartInstance, filename: 'svg-test' })

      const svgButton = wrapper.findAllComponents(AtlasButton)[1]
      await svgButton.trigger('click')

      expect(wrapper.emitted('export-start')).toBeTruthy()
      expect(wrapper.emitted('export-start')![0]).toEqual(['svg'])
      expect(wrapper.emitted('export-success')).toBeTruthy()
      expect(wrapper.emitted('export-success')![0]).toEqual(['svg', 'svg-test.svg'])
    })

    it('should render SVG off-screen when renderToSVGString is unavailable', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: undefined
      })
      const wrapper = mountComponent({ chartInstance, filename: 'offscreen-test' })

      const svgButton = wrapper.findAllComponents(AtlasButton)[1]
      await svgButton.trigger('click')

      expect(chartInstance.getDataURL).not.toHaveBeenCalled()
      expect(mockLink.download).toBe('offscreen-test.svg')
      expect(wrapper.emitted('export-success')![0]).toEqual(['svg', 'offscreen-test.svg'])
    })

    it('should render SVG off-screen when renderToSVGString returns empty', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => '')
      })
      const wrapper = mountComponent({ chartInstance, filename: 'empty-svg' })

      const svgButton = wrapper.findAllComponents(AtlasButton)[1]
      await svgButton.trigger('click')

      expect(chartInstance.getDataURL).not.toHaveBeenCalled()
      expect(mockLink.download).toBe('empty-svg.svg')
    })

    it('should render SVG off-screen when renderToSVGString throws (canvas renderer)', async () => {
      // Regression test for issue #149: with the default ECharts canvas
      // renderer, renderToSVGString exists on the prototype but throws
      // "a.renderToString is not a function" when it delegates to the canvas
      // painter. Clicking SVG must still yield an .svg file, not a PNG.
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => { throw new TypeError('a.renderToString is not a function') })
      })
      const wrapper = mountComponent({ chartInstance, filename: 'canvas-chart' })

      const svgButton = wrapper.findAllComponents(AtlasButton)[1]
      await svgButton.trigger('click')

      expect(chartInstance.getDataURL).not.toHaveBeenCalled()
      expect(mockLink.download).toBe('canvas-chart.svg')
      expect(wrapper.emitted('export-error')).toBeFalsy()
      expect(wrapper.emitted('export-success')![0]).toEqual(['svg', 'canvas-chart.svg'])
    })

    it('should download real SVG markup, not a PNG data URL', async () => {
      const blobTypes: string[] = []
      globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
        blobTypes.push(blob.type)
        return 'blob:mock-url'
      }) as unknown as typeof URL.createObjectURL

      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => { throw new TypeError('a.renderToString is not a function') })
      })
      const wrapper = mountComponent({ chartInstance, filename: 'blob-check' })

      await wrapper.findAllComponents(AtlasButton)[1].trigger('click')

      expect(blobTypes).toContain('image/svg+xml;charset=utf-8')
      expect(blobTypes.some(type => type.includes('png'))).toBe(false)
      expect(mockLink.href).toBe('blob:mock-url')
      expect(mockLink.href).not.toContain('data:image/png')
      expect(mockLink.download).toBe('blob-check.svg')
    })

    it('should emit export-error when the off-screen SVG render also fails', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => { throw new Error('SVG failed') }),
        getOption: vi.fn(() => { throw new Error('cannot read option') })
      })
      const wrapper = mountComponent({ chartInstance })

      const svgButton = wrapper.findAllComponents(AtlasButton)[1]
      await svgButton.trigger('click')

      expect(wrapper.emitted('export-error')).toBeTruthy()
      expect(wrapper.emitted('export-error')![0][0]).toBe('svg')
      expect(wrapper.emitted('export-success')).toBeFalsy()
    })

    it('should not export when no chart instance', async () => {
      const wrapper = mountComponent({ chartInstance: null })

      // Force call even if disabled
      await wrapper.vm.handleExportSVG?.()

      expect(wrapper.emitted('export-start')).toBeFalsy()
    })
  })

  describe('Export State', () => {
    it('should set exporting state during PNG export', async () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance })

      // Check initial state
      expect(wrapper.vm.exporting).toBeNull()

      const pngButton = wrapper.findAllComponents(AtlasButton)[0]
      await pngButton.trigger('click')

      // After export completes, state should be reset
      expect(wrapper.vm.exporting).toBeNull()
    })

    it('should set exporting state during SVG export', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => '<svg></svg>')
      })
      const wrapper = mountComponent({ chartInstance })

      const svgButton = wrapper.findAllComponents(AtlasButton)[1]
      await svgButton.trigger('click')

      expect(wrapper.vm.exporting).toBeNull()
    })

    it('should reset exporting state even on error', async () => {
      const chartInstance = createMockChartInstance({
        getDataURL: vi.fn(() => { throw new Error('fail') })
      })
      const wrapper = mountComponent({ chartInstance })

      const pngButton = wrapper.findAllComponents(AtlasButton)[0]
      await pngButton.trigger('click')

      expect(wrapper.vm.exporting).toBeNull()
    })
  })
})
