import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ChartExport from '@/components/ui/charts/AtlasChartExport.vue'

const vuetify = createVuetify({ components, directives })

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
} = {}) {
  return {
    getDataURL: options.getDataURL || vi.fn(() => 'data:image/png;base64,mockData'),
    renderToSVGString: options.renderToSVGString
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
  })

  describe('Rendering', () => {
    it('should render export buttons', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toBe('PNG')
      expect(buttons[1].text()).toBe('SVG')
    })

    it('should disable buttons when no chart instance', () => {
      const wrapper = mountComponent({ chartInstance: null })
      const buttons = wrapper.findAll('button')
      expect(buttons[0].attributes('disabled')).toBeDefined()
      expect(buttons[1].attributes('disabled')).toBeDefined()
    })

    it('should enable buttons when chart instance is provided', () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance })
      const buttons = wrapper.findAll('button')
      expect(buttons[0].attributes('disabled')).toBeUndefined()
      expect(buttons[1].attributes('disabled')).toBeUndefined()
    })
  })

  describe('PNG Export', () => {
    it('should export PNG when button is clicked', async () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance, filename: 'test-chart' })

      const pngButton = wrapper.findAll('button')[0]
      await pngButton.trigger('click')

      expect(chartInstance.getDataURL).toHaveBeenCalledWith({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      })
      expect(mockLink.download).toBe('test-chart.png')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should emit export-start and export-success events', async () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance, filename: 'test' })

      const pngButton = wrapper.findAll('button')[0]
      await pngButton.trigger('click')

      expect(wrapper.emitted('export-start')).toBeTruthy()
      expect(wrapper.emitted('export-start')![0]).toEqual(['png'])
      expect(wrapper.emitted('export-success')).toBeTruthy()
      expect(wrapper.emitted('export-success')![0]).toEqual(['png', 'test.png'])
    })

    it('should use default filename with timestamp when not provided', async () => {
      const chartInstance = createMockChartInstance()
      const wrapper = mountComponent({ chartInstance })

      const pngButton = wrapper.findAll('button')[0]
      await pngButton.trigger('click')

      expect(mockLink.download).toMatch(/^chart-\d+\.png$/)
    })

    it('should emit export-error on failure', async () => {
      const chartInstance = createMockChartInstance({
        getDataURL: vi.fn(() => { throw new Error('Export failed') })
      })
      const wrapper = mountComponent({ chartInstance })

      const pngButton = wrapper.findAll('button')[0]
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

      const svgButton = wrapper.findAll('button')[1]
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

      const svgButton = wrapper.findAll('button')[1]
      await svgButton.trigger('click')

      expect(wrapper.emitted('export-start')).toBeTruthy()
      expect(wrapper.emitted('export-start')![0]).toEqual(['svg'])
      expect(wrapper.emitted('export-success')).toBeTruthy()
      expect(wrapper.emitted('export-success')![0]).toEqual(['svg', 'svg-test.svg'])
    })

    it('should fallback to PNG when SVG renderer not available', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: undefined
      })
      const wrapper = mountComponent({ chartInstance, filename: 'fallback-test' })

      const svgButton = wrapper.findAll('button')[1]
      await svgButton.trigger('click')

      // Should fall back to PNG export
      expect(chartInstance.getDataURL).toHaveBeenCalled()
      expect(mockLink.download).toBe('fallback-test.png')
    })

    it('should fallback to PNG when renderToSVGString returns empty', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => '')
      })
      const wrapper = mountComponent({ chartInstance, filename: 'empty-svg' })

      const svgButton = wrapper.findAll('button')[1]
      await svgButton.trigger('click')

      // Empty string is falsy, so should fallback to PNG
      expect(chartInstance.getDataURL).toHaveBeenCalled()
    })

    it('should emit export-error on SVG failure', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => { throw new Error('SVG failed') })
      })
      const wrapper = mountComponent({ chartInstance })

      const svgButton = wrapper.findAll('button')[1]
      await svgButton.trigger('click')

      expect(wrapper.emitted('export-error')).toBeTruthy()
      expect(wrapper.emitted('export-error')![0][0]).toBe('svg')
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

      const pngButton = wrapper.findAll('button')[0]
      await pngButton.trigger('click')

      // After export completes, state should be reset
      expect(wrapper.vm.exporting).toBeNull()
    })

    it('should set exporting state during SVG export', async () => {
      const chartInstance = createMockChartInstance({
        renderToSVGString: vi.fn(() => '<svg></svg>')
      })
      const wrapper = mountComponent({ chartInstance })

      const svgButton = wrapper.findAll('button')[1]
      await svgButton.trigger('click')

      expect(wrapper.vm.exporting).toBeNull()
    })

    it('should reset exporting state even on error', async () => {
      const chartInstance = createMockChartInstance({
        getDataURL: vi.fn(() => { throw new Error('fail') })
      })
      const wrapper = mountComponent({ chartInstance })

      const pngButton = wrapper.findAll('button')[0]
      await pngButton.trigger('click')

      expect(wrapper.vm.exporting).toBeNull()
    })
  })
})
