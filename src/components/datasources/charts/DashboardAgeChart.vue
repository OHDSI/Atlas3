<template>
  <div class="dashboard-age-chart">
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
import type { HistogramChartData } from '@/models/datasource.types'
import { dashboardAgeBarOptions, createResizeHandler } from '@/ui/chart-config'

interface Props {
  data: HistogramChartData
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
  if (!props.data || props.data.bins.length === 0) return {}
  return dashboardAgeBarOptions(props.data)
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
.dashboard-age-chart {
  width: 100%;
}
</style>
