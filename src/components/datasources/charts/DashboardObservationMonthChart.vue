<template>
  <div class="dashboard-observation-month-chart">
    <MultiLineChart
      :data="props.data"
      :loading="props.loading"
      :height="props.height"
    />
  </div>
</template>

<script setup lang="ts">
import type { LineChartData } from '@/models/datasource.types'
import MultiLineChart from '@/components/datasources/charts/MultiLineChart.vue'

interface Props {
  data: LineChartData
  loading?: boolean
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  height: 300,
})
</script>

<style scoped>
.dashboard-observation-month-chart {
  width: 100%;
}
</style>
