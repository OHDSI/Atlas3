<script setup lang="ts">
import Chart from './AtlasTreemapChart.vue'
const data = [
  { name: 'Conditions', value: 500, children: [
    { name: 'Diabetes', value: 200 }, { name: 'Hypertension', value: 300 },
  ]},
]
</script>

<template>
  <Story
    title="Charts/AtlasTreemapChart"
    group="charts"
  >
    <Variant title="default">
      <Chart :data="data" />
    </Variant>
  </Story>
</template>
