<!--
  TrellisChart Component

  ECharts small multiple line charts for stratified demographic analysis
-->
<template>
  <div class="trellis-chart-container">
    <!-- Export controls -->
    <div
      v-if="!loading && showExport"
      class="chart-export-toolbar"
    >
      <ChartExport
        :chart-instance="chartInstance"
        :filename="exportFilename"
        @export-success="handleExportSuccess"
        @export-error="handleExportError"
      />
    </div>

    <AtlasSkeleton
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
import { AtlasSkeleton } from '@/components/ui'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import type { TrellisChartData } from '@/models/report.types'
import type { EChartsType } from 'echarts/core'
import { trellisChartOptions, createResizeHandler } from '@/utils/chart-config'
import ChartExport from './ChartExport.vue'

/**
 * Props
 */
const props = withDefaults(
  defineProps<{
    data: TrellisChartData
    title?: string
    loading?: boolean
    height?: number
    showExport?: boolean
    exportFilename?: string
  }>(),
  {
    title: undefined,
    loading: false,
    height: 600,
    showExport: true,
    exportFilename: 'trellis-chart',
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartRef = ref<any>(null)

/**
 * Chart instance for export
 */
const chartInstance = computed<EChartsType | null>(() => {
  return chartRef.value?.chart as EChartsType | null
})

/**
 * Computed chart option
 */
const chartOption = computed(() => {
  if (!props.data || !props.data.series || props.data.series.length === 0) {
    return {}
  }

  return trellisChartOptions(props.data, props.title)
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
 * Handle export success
 */
function handleExportSuccess(format: 'png' | 'svg', filename: string) {
  emit('export-success', format, filename)
}

/**
 * Handle export error
 */
function handleExportError(format: 'png' | 'svg', error: Error) {
  emit('export-error', format, error)
}
</script>

<style scoped>
.trellis-chart-container {
  width: 100%;
  position: relative;
}

.chart-export-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
</style>
