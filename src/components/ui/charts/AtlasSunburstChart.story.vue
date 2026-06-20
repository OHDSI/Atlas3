<script setup lang="ts">
import Chart from './AtlasSunburstChart.vue'
const data = { name: 'root', children: [{ name: 'A', value: 3 }, { name: 'B', value: 5 }] }
const colors = () => '#1f425a'
</script>

<template>
  <Story
    title="Charts/AtlasSunburstChart"
    group="charts"
  >
    <Variant title="default">
      <Chart
        :data="data"
        :colors="colors"
      />
    </Variant>
  </Story>
</template>
