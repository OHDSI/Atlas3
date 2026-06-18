<template>
  <div class="dashboard-observation-month-chart">
    <MultiLineChart
      :data="data"
      :loading="loading"
      :height="height"
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

// expose to template
const { data, loading, height } = props
</script>

<style scoped>
.dashboard-observation-month-chart {
  width: 100%;
}
</style>
