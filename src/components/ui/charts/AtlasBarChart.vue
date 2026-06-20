<template>
  <div class="atlas-bar-chart">
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
import { AtlasSkeleton } from '@/components/ui'
import type { BarChartData } from '@/models/report.types'
import type { EChartsType } from 'echarts/core'
import { defaultBarChartOptions, createResizeHandler } from '@/ui/chart-config'
import ChartExport from '@/components/ui/charts/AtlasChartExport.vue'

const props = withDefaults(
  defineProps<{
    data: BarChartData
    loading?: boolean
    height?: number
    showExport?: boolean
    exportFilename?: string
  }>(),
  {
    loading: false,
    height: 400,
    showExport: true,
    exportFilename: 'bar-chart',
  }
)

const emit = defineEmits<{
  'export-success': [format: 'png' | 'svg', filename: string]
  'export-error': [format: 'png' | 'svg', error: Error]
}>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartRef = ref<any>(null)

const chartInstance = computed<EChartsType | null>(() => {
  return chartRef.value?.chart as EChartsType | null
})

const chartOption = computed(() => {
  if (!props.data || props.data.categories.length === 0) return {}
  return defaultBarChartOptions(props.data)
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

watch(
  () => props.data,
  () => {
    if (chartRef.value && !props.loading) {
      chartRef.value.setOption(chartOption.value, true)
    }
  },
  { deep: true }
)

function handleExportSuccess(format: 'png' | 'svg', filename: string) {
  emit('export-success', format, filename)
}

function handleExportError(format: 'png' | 'svg', error: Error) {
  emit('export-error', format, error)
}
</script>

<style scoped>
.atlas-bar-chart {
  width: 100%;
  position: relative;
}

.chart-export-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
</style>
