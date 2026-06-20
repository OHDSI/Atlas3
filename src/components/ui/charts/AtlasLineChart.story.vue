<script setup lang="ts">
import AtlasLineChart from './AtlasLineChart.vue'

const category = {
  categories: ['A', 'B', 'C', 'D'],
  series: [{ name: 'Count', data: [4, 9, 2, 7] }],
}
const time = {
  xAxisType: 'time' as const,
  monthCodes: [200301, 200302, 200303, 200304],
  series: [{ name: 'Observations', data: [10, 40, 25, 60] }],
}
const value = {
  xAxisType: 'value' as const,
  xValues: [0, 1, 5, 10],
  series: [{ name: 'Percent', data: [100, 80, 40, 15] }],
}
</script>

<template>
  <Story
    title="Charts/AtlasLineChart"
    group="charts"
  >
    <Variant title="category axis">
      <AtlasLineChart :data="category" />
    </Variant>
    <Variant title="time axis">
      <AtlasLineChart
        :data="time"
        x-axis-type="time"
      />
    </Variant>
    <Variant title="value axis">
      <AtlasLineChart
        :data="value"
        x-axis-type="value"
      />
    </Variant>
  </Story>
</template>
