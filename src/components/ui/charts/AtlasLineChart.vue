<template>
  <div class="atlas-line-chart">
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
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import type { EChartsType } from 'echarts/core'
import { AtlasSkeleton } from '@/components/ui'
import type { LineChartData, ChartXAxisType } from '@/ui/chart-types'
import { multiLineChartOptions, createResizeHandler } from '@/ui/chart-config'
import ChartExport from '@/components/ui/charts/AtlasChartExport.vue'

interface Props {
  data: LineChartData
  loading?: boolean
  height?: number
  xAxisType?: ChartXAxisType
  showExport?: boolean
  exportFilename?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: 400,
  xAxisType: 'category',
  showExport: true,
  exportFilename: 'line-chart',
})

/**
 * Emits
 */
const emit = defineEmits<{
  'export-success': [format: 'png' | 'svg', filename: string]
  'export-error': [format: 'png' | 'svg', error: Error]
}>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartRef = ref<any>(null)

/**
 * Chart instance for export
 */
const chartInstance = computed<EChartsType | null>(() => {
  return chartRef.value?.chart as EChartsType | null
})

const chartOption = computed(() => {
  if (!props.data || props.data.series.length === 0) return {}
  return multiLineChartOptions({ ...props.data, xAxisType: props.xAxisType })
})

let resizeHandler: (() => void) | null = null
onMounted(() => {
  if (chartRef.value) {
    resizeHandler = createResizeHandler(chartRef.value)
    window.addEventListener('resize', resizeHandler)
  }
})
onUnmounted(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})

/**
 * Watch for data changes and update chart.
 * Watching props.data deep; xAxisType is effectively static per usage and
 * already reflected via chartOption computed re-evaluation.
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
.atlas-line-chart {
  width: 100%;
  position: relative;
}

.chart-export-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
</style>
