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
    <Variant title="with export toolbar">
      <AtlasPieChart
        :data="data"
        title="Gender"
        :show-export="true"
        export-filename="gender-pie"
      />
    </Variant>
    <Variant title="export hidden">
      <AtlasPieChart
        :data="data"
        title="Gender"
        :show-export="false"
      />
    </Variant>
  </Story>
</template>
