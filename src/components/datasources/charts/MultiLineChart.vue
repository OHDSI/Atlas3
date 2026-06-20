<template>
  <div class="multi-line-chart">
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
import type { MultiLineChartData } from '@/models/datasource.types'
import { multiLineChartOptions, createResizeHandler } from '@/utils/chart-config'

interface Props {
  data: MultiLineChartData
  loading?: boolean
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: 350,
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartRef = ref<any>(null)

const chartOption = computed(() => {
  if (!props.data || !props.data.series || props.data.series.length === 0) return {}
  return multiLineChartOptions(props.data)
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
.multi-line-chart {
  width: 100%;
}
</style>
