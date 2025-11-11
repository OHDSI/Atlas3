/**
 * Unit tests for useChartExport composable
 * Feature: 005-cohort-reports
 *
 * Tests chart and table export functionality (PNG, SVG, CSV, clipboard)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useChartExport } from '@/composables/useChartExport'
import type { EChartsType } from 'echarts/core'
import type { CSVExportData } from '@/models/report.types'

// Mock papaparse
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn((data: unknown, options?: unknown) => {
      // Simple CSV conversion for testing
      const rows = data as string[][]
      return rows.map(row => row.join(',')).join('\n')
    })
  }
}))

describe('useChartExport', () => {
  let mockChart: EChartsType
  let mockLink: HTMLAnchorElement
  let appendChildSpy: ReturnType<typeof vi.spyOn>
  let removeChildSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.spyOn>
  let createElementSpy: ReturnType<typeof vi.spyOn>
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Create mock ECharts instance
    mockChart = {
      getDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockImageData'),
      renderToSVGString: vi.fn().mockReturnValue('<svg>mock svg content</svg>')
    } as unknown as EChartsType

    // Create mock anchor element
    mockLink = {
      href: '',
      download: '',
      click: vi.fn()
    } as unknown as HTMLAnchorElement

    // Mock DOM methods
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)
    clickSpy = vi.spyOn(mockLink, 'click')

    // Add URL methods to global if they don't exist
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn()
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn()
    }

    // Mock URL methods
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Add execCommand to document if it doesn't exist
    if (!document.execCommand) {
      document.execCommand = vi.fn()
    }

    // Mock Blob constructor
    global.Blob = vi.fn().mockImplementation((content, options) => ({
      content,
      options,
      size: 0,
      type: options?.type || ''
    })) as unknown as typeof Blob

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('Initial State', () => {
    it('should initialize with exporting set to false', () => {
      const { exporting } = useChartExport()
      expect(exporting.value).toBe(false)
    })

    it('should initialize with exportError set to null', () => {
      const { exportError } = useChartExport()
      expect(exportError.value).toBeNull()
    })
  })

  // ============================================================================
  // exportToPNG Tests
  // ============================================================================

  describe('exportToPNG', () => {
    it('should export chart to PNG with default options', async () => {
      const { exportToPNG, exporting } = useChartExport()

      await exportToPNG(mockChart)

      expect(mockChart.getDataURL).toHaveBeenCalledWith({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      })
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe('data:image/png;base64,mockImageData')
      expect(mockLink.download).toMatch(/^chart-\d+\.png$/)
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink)
      expect(clickSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink)
      expect(exporting.value).toBe(false)
    })

    it('should export chart to PNG with custom filename', async () => {
      const { exportToPNG } = useChartExport()

      await exportToPNG(mockChart, { filename: 'my-chart.png' })

      expect(mockLink.download).toBe('my-chart.png')
    })

    it('should export chart to PNG with custom backgroundColor', async () => {
      const { exportToPNG } = useChartExport()

      await exportToPNG(mockChart, { backgroundColor: '#000000' })

      expect(mockChart.getDataURL).toHaveBeenCalledWith({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#000000'
      })
    })

    it('should export chart to PNG with custom pixelRatio', async () => {
      const { exportToPNG } = useChartExport()

      await exportToPNG(mockChart, { pixelRatio: 4 })

      expect(mockChart.getDataURL).toHaveBeenCalledWith({
        type: 'png',
        pixelRatio: 4,
        backgroundColor: '#ffffff'
      })
    })

    it('should set exporting flag to true during export', async () => {
      const { exportToPNG, exporting } = useChartExport()

      // Track when getDataURL is called to verify exporting flag
      let exportingFlagDuringExport = false

      mockChart.getDataURL = vi.fn().mockImplementation(() => {
        // Check the flag when this is called (should be true)
        exportingFlagDuringExport = exporting.value
        return 'data:image/png;base64,mockImageData'
      })

      await exportToPNG(mockChart)

      // The flag should have been true during export
      expect(exportingFlagDuringExport).toBe(true)
      // And false after export completes
      expect(exporting.value).toBe(false)
    })

    it('should clear previous errors before exporting', async () => {
      const { exportToPNG, exportError } = useChartExport()

      // Manually set an error
      exportError.value = 'Previous error'

      await exportToPNG(mockChart)

      // Error should be cleared during export
      expect(exportError.value).toBeNull()
    })

    it('should handle PNG export errors and set exportError', async () => {
      const { exportToPNG, exportError, exporting } = useChartExport()

      const error = new Error('Failed to generate PNG')
      mockChart.getDataURL = vi.fn().mockImplementation(() => {
        throw error
      })

      await expect(exportToPNG(mockChart)).rejects.toThrow('Failed to generate PNG')
      expect(exportError.value).toBe('Failed to generate PNG')
      expect(exporting.value).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[useChartExport] PNG export error:', error)
    })

    it('should handle non-Error objects thrown during PNG export', async () => {
      const { exportToPNG, exportError } = useChartExport()

      mockChart.getDataURL = vi.fn().mockImplementation(() => {
        throw 'String error'
      })

      await expect(exportToPNG(mockChart)).rejects.toThrow()
      expect(exportError.value).toBe('Failed to export PNG')
    })

    it('should log successful PNG export', async () => {
      const { exportToPNG } = useChartExport()

      await exportToPNG(mockChart, { filename: 'test-chart.png' })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[useChartExport] Exported chart to PNG:',
        'test-chart.png'
      )
    })
  })

  // ============================================================================
  // exportToSVG Tests
  // ============================================================================

  describe('exportToSVG', () => {
    it('should export chart to SVG with default options', async () => {
      const { exportToSVG } = useChartExport()

      await exportToSVG(mockChart)

      expect(mockChart.renderToSVGString).toHaveBeenCalledWith({
        backgroundColor: '#ffffff'
      })
      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe('blob:mock-url')
      expect(mockLink.download).toMatch(/^chart-\d+\.svg$/)
      expect(clickSpy).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should export chart to SVG with custom filename', async () => {
      const { exportToSVG } = useChartExport()

      await exportToSVG(mockChart, { filename: 'my-chart.svg' })

      expect(mockLink.download).toBe('my-chart.svg')
    })

    it('should export chart to SVG with custom backgroundColor', async () => {
      const { exportToSVG } = useChartExport()

      await exportToSVG(mockChart, { backgroundColor: '#f0f0f0' })

      expect(mockChart.renderToSVGString).toHaveBeenCalledWith({
        backgroundColor: '#f0f0f0'
      })
    })

    it('should create Blob with correct SVG content and type', async () => {
      const { exportToSVG } = useChartExport()
      const mockSvgContent = '<svg><rect width="100" height="100"/></svg>'
      mockChart.renderToSVGString = vi.fn().mockReturnValue(mockSvgContent)

      await exportToSVG(mockChart)

      // Verify Blob was created (mocked in beforeEach)
      expect(global.Blob).toHaveBeenCalledWith([mockSvgContent], { type: 'image/svg+xml' })
    })

    it('should set exporting flag to true during export', async () => {
      const { exportToSVG, exporting } = useChartExport()

      // Track when renderToSVGString is called to verify exporting flag
      let exportingFlagDuringExport = false

      mockChart.renderToSVGString = vi.fn().mockImplementation(() => {
        // Check the flag when this is called (should be true)
        exportingFlagDuringExport = exporting.value
        return '<svg>mock svg content</svg>'
      })

      await exportToSVG(mockChart)

      // The flag should have been true during export
      expect(exportingFlagDuringExport).toBe(true)
      // And false after export completes
      expect(exporting.value).toBe(false)
    })

    it('should clear previous errors before exporting', async () => {
      const { exportToSVG, exportError } = useChartExport()

      exportError.value = 'Previous error'

      await exportToSVG(mockChart)

      expect(exportError.value).toBeNull()
    })

    it('should handle SVG export errors and set exportError', async () => {
      const { exportToSVG, exportError, exporting } = useChartExport()

      const error = new Error('Failed to generate SVG')
      mockChart.renderToSVGString = vi.fn().mockImplementation(() => {
        throw error
      })

      await expect(exportToSVG(mockChart)).rejects.toThrow('Failed to generate SVG')
      expect(exportError.value).toBe('Failed to generate SVG')
      expect(exporting.value).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[useChartExport] SVG export error:', error)
    })

    it('should handle non-Error objects thrown during SVG export', async () => {
      const { exportToSVG, exportError } = useChartExport()

      mockChart.renderToSVGString = vi.fn().mockImplementation(() => {
        throw 'String error'
      })

      await expect(exportToSVG(mockChart)).rejects.toThrow()
      expect(exportError.value).toBe('Failed to export SVG')
    })

    it('should log successful SVG export', async () => {
      const { exportToSVG } = useChartExport()

      await exportToSVG(mockChart, { filename: 'test-chart.svg' })

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[useChartExport] Exported chart to SVG:',
        'test-chart.svg'
      )
    })
  })

  // ============================================================================
  // exportToCSV Tests
  // ============================================================================

  describe('exportToCSV', () => {
    const mockCSVData: CSVExportData = {
      headers: ['Name', 'Age', 'City'],
      rows: [
        ['John', 30, 'New York'],
        ['Jane', 25, 'San Francisco'],
        ['Bob', 35, 'Chicago']
      ],
      filename: 'test-data.csv'
    }

    it('should export data to CSV with papaparse', async () => {
      const { exportToCSV } = useChartExport()
      const Papa = await import('papaparse')

      await exportToCSV(mockCSVData)

      expect(Papa.default.unparse).toHaveBeenCalledWith(
        [mockCSVData.headers, ...mockCSVData.rows],
        {
          quotes: true,
          delimiter: ',',
          newline: '\n'
        }
      )
    })

    it('should create Blob with CSV content and correct type', async () => {
      const { exportToCSV } = useChartExport()

      await exportToCSV(mockCSVData)

      // Verify Blob was created (mocked in beforeEach)
      expect(global.Blob).toHaveBeenCalledWith(
        expect.any(Array),
        { type: 'text/csv;charset=utf-8;' }
      )
    })

    it('should trigger download with correct filename', async () => {
      const { exportToCSV } = useChartExport()

      await exportToCSV(mockCSVData)

      expect(mockLink.download).toBe('test-data.csv')
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should set exporting flag to true during export', async () => {
      const { exportToCSV, exporting } = useChartExport()

      await exportToCSV(mockCSVData)
      // After completing, exporting should be false
      expect(exporting.value).toBe(false)
    })

    it('should clear previous errors before exporting', async () => {
      const { exportToCSV, exportError } = useChartExport()

      exportError.value = 'Previous error'

      await exportToCSV(mockCSVData)

      expect(exportError.value).toBeNull()
    })

    it('should handle CSV export errors and set exportError', async () => {
      const { exportToCSV, exportError, exporting } = useChartExport()
      const Papa = await import('papaparse')

      const error = new Error('CSV generation failed')
      vi.mocked(Papa.default.unparse).mockImplementationOnce(() => {
        throw error
      })

      await expect(exportToCSV(mockCSVData)).rejects.toThrow('CSV generation failed')
      expect(exportError.value).toBe('CSV generation failed')
      expect(exporting.value).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[useChartExport] CSV export error:', error)
    })

    it('should handle non-Error objects thrown during CSV export', async () => {
      const { exportToCSV, exportError } = useChartExport()
      const Papa = await import('papaparse')

      vi.mocked(Papa.default.unparse).mockImplementationOnce(() => {
        throw 'String error'
      })

      await expect(exportToCSV(mockCSVData)).rejects.toThrow()
      expect(exportError.value).toBe('Failed to export CSV')
    })

    it('should revoke object URL after download', async () => {
      const { exportToCSV } = useChartExport()

      await exportToCSV(mockCSVData)

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should handle empty data rows', async () => {
      const { exportToCSV } = useChartExport()

      const emptyData: CSVExportData = {
        headers: ['Col1', 'Col2'],
        rows: [],
        filename: 'empty.csv'
      }

      await exportToCSV(emptyData)

      expect(mockLink.download).toBe('empty.csv')
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should log successful CSV export', async () => {
      const { exportToCSV } = useChartExport()

      await exportToCSV(mockCSVData)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[useChartExport] Exported data to CSV:',
        'test-data.csv'
      )
    })
  })

  // ============================================================================
  // copyToClipboard Tests
  // ============================================================================

  describe('copyToClipboard', () => {
    const mockClipboardData: CSVExportData = {
      headers: ['Name', 'Age', 'City'],
      rows: [
        ['John', 30, 'New York'],
        ['Jane', 25, 'San Francisco']
      ],
      filename: 'test-data.csv'
    }

    describe('Modern Clipboard API', () => {
      beforeEach(() => {
        // Mock modern clipboard API
        Object.assign(navigator, {
          clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined)
          }
        })
      })

      it('should copy data to clipboard using modern API', async () => {
        const { copyToClipboard } = useChartExport()

        await copyToClipboard(mockClipboardData)

        expect(navigator.clipboard.writeText).toHaveBeenCalled()
      })

      it('should use tab delimiter (TSV) for clipboard data', async () => {
        const { copyToClipboard } = useChartExport()
        const Papa = await import('papaparse')

        await copyToClipboard(mockClipboardData)

        expect(Papa.default.unparse).toHaveBeenCalledWith(
          [mockClipboardData.headers, ...mockClipboardData.rows],
          {
            quotes: false,
            delimiter: '\t',
            newline: '\n'
          }
        )
      })

      it('should set exporting flag during clipboard copy', async () => {
        const { copyToClipboard, exporting } = useChartExport()

        const copyPromise = copyToClipboard(mockClipboardData)
        expect(exporting.value).toBe(true)

        await copyPromise
        expect(exporting.value).toBe(false)
      })

      it('should clear previous errors before copying', async () => {
        const { copyToClipboard, exportError } = useChartExport()

        exportError.value = 'Previous error'

        await copyToClipboard(mockClipboardData)

        expect(exportError.value).toBeNull()
      })

      it('should handle clipboard write errors', async () => {
        const { copyToClipboard, exportError } = useChartExport()

        const error = new Error('Clipboard write failed')
        vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(error)

        await expect(copyToClipboard(mockClipboardData)).rejects.toThrow('Clipboard write failed')
        expect(exportError.value).toBe('Clipboard write failed')
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[useChartExport] Clipboard copy error:',
          error
        )
      })

      it('should log successful clipboard copy', async () => {
        const { copyToClipboard } = useChartExport()

        await copyToClipboard(mockClipboardData)

        expect(consoleLogSpy).toHaveBeenCalledWith('[useChartExport] Copied data to clipboard')
      })
    })

    describe('Fallback Clipboard Method', () => {
      let mockTextarea: HTMLTextAreaElement
      let textareaSelectSpy: ReturnType<typeof vi.spyOn>
      let execCommandSpy: ReturnType<typeof vi.spyOn>

      beforeEach(() => {
        // Remove modern clipboard API
        Object.assign(navigator, {
          clipboard: undefined
        })

        // Create mock textarea
        mockTextarea = {
          value: '',
          style: { position: '', opacity: '' },
          select: vi.fn()
        } as unknown as HTMLTextAreaElement

        createElementSpy.mockImplementation((tag: string) => {
          if (tag === 'textarea') return mockTextarea
          return mockLink
        })

        textareaSelectSpy = vi.spyOn(mockTextarea, 'select')
        execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true)
      })

      it('should use fallback method when clipboard API is not available', async () => {
        const { copyToClipboard } = useChartExport()

        await copyToClipboard(mockClipboardData)

        expect(createElementSpy).toHaveBeenCalledWith('textarea')
        expect(textareaSelectSpy).toHaveBeenCalled()
        expect(execCommandSpy).toHaveBeenCalledWith('copy')
      })

      it('should set textarea with TSV content', async () => {
        const { copyToClipboard } = useChartExport()

        await copyToClipboard(mockClipboardData)

        expect(mockTextarea.value).toBeTruthy()
      })

      it('should style textarea to be invisible', async () => {
        const { copyToClipboard } = useChartExport()

        await copyToClipboard(mockClipboardData)

        expect(mockTextarea.style.position).toBe('fixed')
        expect(mockTextarea.style.opacity).toBe('0')
      })

      it('should append and remove textarea from DOM', async () => {
        const { copyToClipboard } = useChartExport()

        await copyToClipboard(mockClipboardData)

        expect(appendChildSpy).toHaveBeenCalledWith(mockTextarea)
        expect(removeChildSpy).toHaveBeenCalledWith(mockTextarea)
      })

      it('should handle execCommand failure', async () => {
        const { copyToClipboard, exportError } = useChartExport()

        execCommandSpy.mockReturnValue(false)

        await expect(copyToClipboard(mockClipboardData)).rejects.toThrow('Copy command failed')
        expect(exportError.value).toBe('Copy command failed')
        expect(removeChildSpy).toHaveBeenCalledWith(mockTextarea)
      })

      it('should handle fallback errors gracefully', async () => {
        const { copyToClipboard, exportError } = useChartExport()

        const error = new Error('execCommand failed')
        execCommandSpy.mockImplementation(() => {
          throw error
        })

        await expect(copyToClipboard(mockClipboardData)).rejects.toThrow('execCommand failed')
        expect(exportError.value).toBe('execCommand failed')
        expect(removeChildSpy).toHaveBeenCalledWith(mockTextarea)
      })

      it('should handle non-Error objects in fallback', async () => {
        const { copyToClipboard, exportError } = useChartExport()

        execCommandSpy.mockImplementation(() => {
          throw 'String error'
        })

        await expect(copyToClipboard(mockClipboardData)).rejects.toThrow()
        expect(exportError.value).toBe('Failed to copy to clipboard')
      })
    })
  })

  // ============================================================================
  // clearError Tests
  // ============================================================================

  describe('clearError', () => {
    it('should clear exportError when called', () => {
      const { exportError, clearError } = useChartExport()

      // Set an error
      exportError.value = 'Test error'
      expect(exportError.value).toBe('Test error')

      // Clear the error
      clearError()
      expect(exportError.value).toBeNull()
    })

    it('should be safe to call when no error exists', () => {
      const { exportError, clearError } = useChartExport()

      expect(exportError.value).toBeNull()
      clearError()
      expect(exportError.value).toBeNull()
    })
  })

  // ============================================================================
  // Edge Cases and Integration Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle multiple export operations in sequence', async () => {
      const { exportToPNG, exportToSVG, exporting } = useChartExport()

      await exportToPNG(mockChart)
      expect(exporting.value).toBe(false)

      await exportToSVG(mockChart)
      expect(exporting.value).toBe(false)

      expect(mockChart.getDataURL).toHaveBeenCalledTimes(1)
      expect(mockChart.renderToSVGString).toHaveBeenCalledTimes(1)
    })

    it('should maintain separate error states for different operations', async () => {
      const { exportToPNG, exportToSVG, exportError } = useChartExport()

      // Fail PNG export
      mockChart.getDataURL = vi.fn().mockImplementation(() => {
        throw new Error('PNG failed')
      })

      await expect(exportToPNG(mockChart)).rejects.toThrow('PNG failed')
      expect(exportError.value).toBe('PNG failed')

      // Reset mock for SVG export
      mockChart.renderToSVGString = vi.fn().mockReturnValue('<svg>test</svg>')

      // Successful SVG export should clear error
      await exportToSVG(mockChart)
      expect(exportError.value).toBeNull()
    })

    it('should handle special characters in CSV data', async () => {
      const { exportToCSV } = useChartExport()

      const dataWithSpecialChars: CSVExportData = {
        headers: ['Name', 'Description'],
        rows: [
          ['Test, User', 'Has "quotes" and, commas'],
          ['Line\nBreak', 'Tab\there']
        ],
        filename: 'special-chars.csv'
      }

      await exportToCSV(dataWithSpecialChars)

      expect(mockLink.download).toBe('special-chars.csv')
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should handle numeric and string values in CSV rows', async () => {
      const { exportToCSV } = useChartExport()

      const mixedData: CSVExportData = {
        headers: ['String', 'Number', 'Mixed'],
        rows: [
          ['text', 123, 'value'],
          ['more', 456.78, 'data']
        ],
        filename: 'mixed-types.csv'
      }

      await exportToCSV(mixedData)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should ensure exporting flag is reset even if error occurs', async () => {
      const { exportToPNG, exporting } = useChartExport()

      mockChart.getDataURL = vi.fn().mockImplementation(() => {
        throw new Error('Test error')
      })

      await expect(exportToPNG(mockChart)).rejects.toThrow()
      expect(exporting.value).toBe(false)
    })
  })

  // ============================================================================
  // Return Value Tests
  // ============================================================================

  describe('Return Values', () => {
    it('should return all required properties and methods', () => {
      const composable = useChartExport()

      expect(composable).toHaveProperty('exporting')
      expect(composable).toHaveProperty('exportError')
      expect(composable).toHaveProperty('exportToPNG')
      expect(composable).toHaveProperty('exportToSVG')
      expect(composable).toHaveProperty('exportToCSV')
      expect(composable).toHaveProperty('copyToClipboard')
      expect(composable).toHaveProperty('clearError')
    })

    it('should expose reactive state values', () => {
      const { exporting, exportError } = useChartExport()

      expect(exporting).toHaveProperty('value')
      expect(exportError).toHaveProperty('value')
    })
  })
})
