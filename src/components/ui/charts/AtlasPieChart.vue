<template>
  <div class="atlas-pie-chart">
    <AtlasSkeleton v-if="loading" type="image" :height="height" />
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
import type { PieChartData } from '@/ui/chart-types'
import { defaultPieChartOptions, createResizeHandler } from '@/ui/chart-config'

interface Props {
  data: PieChartData[]
  title?: string
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
  if (!props.data || props.data.length === 0) return {}
  return defaultPieChartOptions(props.data, props.title)
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
.atlas-pie-chart { width: 100%; }
</style>
