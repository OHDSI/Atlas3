/**
 * useChartExport Composable
 * Feature: 005-cohort-reports
 * Task: T023
 *
 * Provides chart and table export functionality (PNG, SVG, CSV)
 */

import { ref } from 'vue'
import type { EChartsType } from 'echarts/core'
import Papa from 'papaparse'
import type { ChartExportOptions, CSVExportData } from '@/models/report.types'

export function useChartExport() {
  const exporting = ref(false)
  const exportError = ref<string | null>(null)

  /**
   * Export ECharts instance to PNG
   */
  async function exportToPNG(
    chart: EChartsType,
    options: Partial<ChartExportOptions> = {}
  ): Promise<void> {
    exporting.value = true
    exportError.value = null

    try {
      const {
        filename = `chart-${Date.now()}.png`,
        backgroundColor = '#ffffff',
        pixelRatio = 2
      } = options

      // Get data URL from chart
      const dataURL = chart.getDataURL({
        type: 'png',
        pixelRatio,
        backgroundColor
      })

      // Trigger download
      downloadDataURL(dataURL, filename)

      console.log('[useChartExport] Exported chart to PNG:', filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export PNG'
      exportError.value = message
      console.error('[useChartExport] PNG export error:', error)
      throw error
    } finally {
      exporting.value = false
    }
  }

  /**
   * Export ECharts instance to SVG
   */
  async function exportToSVG(
    chart: EChartsType,
    options: Partial<ChartExportOptions> = {}
  ): Promise<void> {
    exporting.value = true
    exportError.value = null

    try {
      const {
        filename = `chart-${Date.now()}.svg`,
        backgroundColor = '#ffffff'
      } = options

      // Get SVG string from chart
      const svg = chart.renderToSVGString({
        backgroundColor
      } as any)

      // Create blob and download
      const blob = new Blob([svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      downloadURL(url, filename)
      URL.revokeObjectURL(url)

      console.log('[useChartExport] Exported chart to SVG:', filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export SVG'
      exportError.value = message
      console.error('[useChartExport] SVG export error:', error)
      throw error
    } finally {
      exporting.value = false
    }
  }

  /**
   * Export table data to CSV
   */
  async function exportToCSV(data: CSVExportData): Promise<void> {
    exporting.value = true
    exportError.value = null

    try {
      const { headers, rows, filename } = data

      // Combine headers and rows
      const csvData = [headers, ...rows]

      // Convert to CSV string using papaparse
      const csv = Papa.unparse(csvData, {
        quotes: true,
        delimiter: ',',
        newline: '\n'
      })

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      downloadURL(url, filename)
      URL.revokeObjectURL(url)

      console.log('[useChartExport] Exported data to CSV:', filename)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export CSV'
      exportError.value = message
      console.error('[useChartExport] CSV export error:', error)
      throw error
    } finally {
      exporting.value = false
    }
  }

  /**
   * Copy table data to clipboard
   */
  async function copyToClipboard(data: CSVExportData): Promise<void> {
    exporting.value = true
    exportError.value = null

    try {
      const { headers, rows } = data

      // Combine headers and rows
      const csvData = [headers, ...rows]

      // Convert to TSV (tab-separated) for better clipboard paste into Excel
      const tsv = Papa.unparse(csvData, {
        quotes: false,
        delimiter: '\t',
        newline: '\n'
      })

      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsv)
      } else {
        // Fallback for older browsers
        await fallbackCopyToClipboard(tsv)
      }

      console.log('[useChartExport] Copied data to clipboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy to clipboard'
      exportError.value = message
      console.error('[useChartExport] Clipboard copy error:', error)
      throw error
    } finally {
      exporting.value = false
    }
  }

  /**
   * Download data URL (for PNG images)
   */
  function downloadDataURL(dataURL: string, filename: string): void {
    const link = document.createElement('a')
    link.href = dataURL
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Download URL (for blobs)
   */
  function downloadURL(url: string, filename: string): void {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Fallback clipboard copy for older browsers
   */
  async function fallbackCopyToClipboard(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)

      try {
        textarea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (success) {
          resolve()
        } else {
          reject(new Error('Copy command failed'))
        }
      } catch (error) {
        document.body.removeChild(textarea)
        reject(error)
      }
    })
  }

  /**
   * Clear export error
   */
  function clearError(): void {
    exportError.value = null
  }

  return {
    // State
    exporting,
    exportError,

    // Actions
    exportToPNG,
    exportToSVG,
    exportToCSV,
    copyToClipboard,
    clearError
  }
}
