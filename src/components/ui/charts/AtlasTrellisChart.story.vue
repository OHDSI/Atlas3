<script setup lang="ts">
import Chart from './AtlasTrellisChart.vue'
const data = { categories: ['2018', '2019', '2020'], series: [{ name: 'M', category: 'M', data: [{ x: 2018, y: 3 }, { x: 2019, y: 5 }, { x: 2020, y: 4 }] }] }
</script>

<template>
  <Story title="Charts/AtlasTrellisChart" group="charts">
    <Variant title="default"><Chart :data="data" /></Variant>
  </Story>
</template>
