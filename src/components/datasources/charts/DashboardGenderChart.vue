<template>
  <div class="dashboard-gender-chart">
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
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { PieChartData } from '@/models/datasource.types'
import { dashboardGenderPieOptions, createResizeHandler } from '@/utils/chart-config'

interface Props {
  data: PieChartData[]
  loading?: boolean
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: 300
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartRef = ref<any>(null)

const chartOption = computed(() => {
  if (!props.data || props.data.length === 0) return {}
  return dashboardGenderPieOptions(props.data)
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
.dashboard-gender-chart {
  width: 100%;
}
</style>
