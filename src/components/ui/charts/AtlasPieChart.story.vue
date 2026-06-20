<script setup lang="ts">
import AtlasPieChart from './AtlasPieChart.vue'
const data = [
  { name: 'Female', value: 5200 },
  { name: 'Male', value: 4800 },
]
</script>

<template>
  <Story
    title="Charts/AtlasPieChart"
    group="charts"
  >
    <Variant title="default">
      <AtlasPieChart
        :data="data"
        title="Gender"
      />
    </Variant>
  </Story>
</template>
