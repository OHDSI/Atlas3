<script setup lang="ts">
import Chart from './AtlasBoxPlotChart.vue'
const data = [{ category: 'Age', min: 0, p10: 5, p25: 20, median: 40, p75: 60, p90: 80, max: 95 }]
</script>

<template>
  <Story
    title="Charts/AtlasBoxPlotChart"
    group="charts"
  >
    <Variant title="default">
      <Chart :data="data" />
    </Variant>
  </Story>
</template>
