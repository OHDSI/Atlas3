<template>
  <div class="atlas-line-chart">
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
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { AtlasSkeleton } from '@/components/ui'
import type { LineChartData, ChartXAxisType } from '@/ui/chart-types'
import { multiLineChartOptions, createResizeHandler } from '@/ui/chart-config'

interface Props {
  data: LineChartData
  loading?: boolean
  height?: number
  xAxisType?: ChartXAxisType
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: 350,
  xAxisType: 'category',
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartRef = ref<any>(null)

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
</script>

<style scoped>
.atlas-line-chart { width: 100%; }
</style>
