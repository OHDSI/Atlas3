<!--
  ChartExport Component

  Provides export functionality for ECharts visualizations
  Supports PNG and SVG export formats
-->
<template>
  <div class="chart-export-controls">
    <v-btn-group
      variant="outlined"
      density="compact"
    >
      <AtlasButton
        size="sm"
        variant="secondary"
        icon="mdi-image"
        :loading="exporting === 'png'"
        :disabled="!chartInstance || exporting !== null"
        @click="handleExportPNG"
      >
        PNG
      </AtlasButton>
      <AtlasButton
        size="sm"
        variant="secondary"
        icon="mdi-vector-polyline"
        :loading="exporting === 'svg'"
        :disabled="!chartInstance || exporting !== null"
        @click="handleExportSVG"
      >
        SVG
      </AtlasButton>
    </v-btn-group>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { EChartsType } from 'echarts/core'
import { logger } from '@/utils/logger'
import { AtlasButton } from '@/components/ui'

/**
 * Props
 */
const props = defineProps<{
  chartInstance: EChartsType | null
  filename?: string
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  'export-start': [format: 'png' | 'svg']
  'export-success': [format: 'png' | 'svg', filename: string]
  'export-error': [format: 'png' | 'svg', error: Error]
}>()

/**
 * Export state
 */
const exporting = ref<'png' | 'svg' | null>(null)

/**
 * Export chart as PNG
 * Uses ECharts getDataURL to generate PNG data URL
 */
async function handleExportPNG() {
  if (!props.chartInstance) return

  exporting.value = 'png'
  emit('export-start', 'png')

  try {
    // Get PNG data URL from ECharts
    const dataURL = props.chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2, // Higher resolution for better quality
      backgroundColor: '#ffffff',
    })

    // Trigger download
    const filename = props.filename || `chart-${Date.now()}`
    downloadDataURL(dataURL, `${filename}.png`)

    emit('export-success', 'png', `${filename}.png`)
  } catch (error) {
    logger.error('ChartExport', 'PNG export failed', error)
    emit('export-error', 'png', error as Error)
  } finally {
    exporting.value = null
  }
}

/**
 * Export chart as SVG
 * Uses ECharts SVG renderer to generate SVG string
 */
async function handleExportSVG() {
  if (!props.chartInstance) return

  exporting.value = 'svg'
  emit('export-start', 'svg')

  try {
    // Get SVG string from ECharts
    // Note: ECharts must be initialized with SVG renderer for this to work.
    // With the (default) canvas renderer, renderToSVGString() itself exists
    // on the prototype but throws when it delegates to the canvas painter,
    // which has no renderToString - so `?.()` alone doesn't catch this, it
    // has to be caught explicitly and treated the same as "not available".
    let svgString: string | undefined
    try {
      svgString = props.chartInstance.renderToSVGString?.()
    } catch (renderErr) {
      logger.warn('ChartExport', 'renderToSVGString threw, falling back to PNG', renderErr)
      svgString = undefined
    }

    if (svgString) {
      // Direct SVG export (if SVG renderer is used)
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const filename = props.filename || `chart-${Date.now()}`
      downloadURL(url, `${filename}.svg`)

      URL.revokeObjectURL(url)
      emit('export-success', 'svg', `${filename}.svg`)
    } else {
      // Fallback: export as PNG if SVG renderer not available
      logger.warn('ChartExport', 'SVG renderer not available, using PNG fallback')
      await handleExportPNG()
    }
  } catch (error) {
    logger.error('ChartExport', 'SVG export failed', error)
    emit('export-error', 'svg', error as Error)
  } finally {
    exporting.value = null
  }
}

/**
 * Download data URL as file
 * Creates temporary anchor element to trigger download
 */
function downloadDataURL(dataURL: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Download URL as file
 * Creates temporary anchor element to trigger download
 */
function downloadURL(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.chart-export-controls {
  display: inline-flex;
  align-items: center;
}
</style>
