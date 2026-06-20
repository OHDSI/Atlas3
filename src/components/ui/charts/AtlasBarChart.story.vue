<script setup lang="ts">
import AtlasBarChart from './AtlasBarChart.vue'
const data = { categories: ['0-9', '10-19', '20-29'], values: [120, 340, 210], unit: 'persons' }
</script>

<template>
  <Story
    title="Charts/AtlasBarChart"
    group="charts"
  >
    <Variant title="default">
      <AtlasBarChart :data="data" />
    </Variant>
    <Variant title="with export toolbar">
      <AtlasBarChart
        :data="data"
        :show-export="true"
        export-filename="age-distribution"
      />
    </Variant>
    <Variant title="export hidden">
      <AtlasBarChart
        :data="data"
        :show-export="false"
      />
    </Variant>
  </Story>
</template>
