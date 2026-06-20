<template>
  <div class="dashboard-cumulative-chart">
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
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { LineChartData } from '@/models/datasource.types'
import { dashboardCumulativeLineOptions, createResizeHandler } from '@/ui/chart-config'

interface Props {
  data: LineChartData
  loading?: boolean
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: 300,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartRef = ref<any>(null)

const chartOption = computed(() => {
  if (!props.data || props.data.categories.length === 0) return {}
  return dashboardCumulativeLineOptions(props.data)
})

let resizeHandler: (() => void) | null = null

onMounted(() => {
  if (chartRef.value) {
    resizeHandler = createResizeHandler(chartRef.value)
    window.addEventListener('resize', resizeHandler)
  }
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
})
</script>

<style scoped>
.dashboard-cumulative-chart {
  width: 100%;
}
</style>
