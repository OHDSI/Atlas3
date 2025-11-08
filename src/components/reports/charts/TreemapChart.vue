<!--
  TreemapChart Component
  Feature: 005-cohort-reports
  Tasks: T028, T120

  ECharts treemap wrapper with zoom interaction, loading states, and export functionality
-->
<template>
  <div class="treemap-chart-container">
    <!-- Export controls -->
    <div v-if="!loading && showExport" class="chart-export-toolbar">
      <ChartExport
        :chart-instance="chartInstance"
        :filename="exportFilename"
        @export-success="handleExportSuccess"
        @export-error="handleExportError"
      />
    </div>

    <v-skeleton-loader
      v-if="loading"
      type="image"
      :height="height"
    />
    <v-chart
      v-else
      ref="chartRef"
      :option="chartOption"
      :style="{ height: `${height}px`, width: '100%' }"
      autoresize
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import type { TreemapNode } from '@/models/report.types'
import type { EChartsType } from 'echarts/core'
import { defaultTreemapOptions, createResizeHandler } from '@/utils/chart-config'
import ChartExport from './ChartExport.vue'

/**
 * Props
 */
const props = withDefaults(
  defineProps<{
    data: TreemapNode[]
    title?: string
    loading?: boolean
    height?: number
    enableZoom?: boolean
    showExport?: boolean
    exportFilename?: string
  }>(),
  {
    title: undefined,
    loading: false,
    height: 500,
    enableZoom: true,
    showExport: true,
    exportFilename: 'treemap-chart'
  }
)

/**
 * Emits
 */
const emit = defineEmits<{
  'export-success': [format: 'png' | 'svg', filename: string]
  'export-error': [format: 'png' | 'svg', error: Error]
}>()

/**
 * Chart ref
 */
const chartRef = ref<any>(null)

/**
 * Chart instance for export
 */
const chartInstance = computed<EChartsType | null>(() => {
  return chartRef.value?.chart || null
})

/**
 * Computed chart option
 */
const chartOption = computed(() => {
  if (!props.data || props.data.length === 0) {
    return {}
  }

  const baseOption = defaultTreemapOptions(props.data, props.title)

  // Override roam setting if zoom is disabled
  if (!props.enableZoom && baseOption.series && baseOption.series[0]) {
    baseOption.series[0].roam = false
  }

  return baseOption
})

/**
 * Resize handling
 */
let resizeHandler: (() => void) | null = null

onMounted(() => {
  if (chartRef.value) {
    const chartInstance = chartRef.value
    resizeHandler = createResizeHandler(chartInstance)
    window.addEventListener('resize', resizeHandler)
  }
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
})

/**
 * Watch for data changes and update chart
 */
watch(
  () => props.data,
  () => {
    if (chartRef.value && !props.loading) {
      chartRef.value.setOption(chartOption.value, true)
    }
  },
  { deep: true }
)

/**
 * T120: Handle export success
 */
function handleExportSuccess(format: 'png' | 'svg', filename: string) {
  emit('export-success', format, filename)
}

/**
 * T120: Handle export error
 */
function handleExportError(format: 'png' | 'svg', error: Error) {
  emit('export-error', format, error)
}
</script>

<style scoped>
.treemap-chart-container {
  width: 100%;
  position: relative;
}

.chart-export-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
</style>
