<template>
  <div
    class="profile-timeline"
    data-test="profile-timeline"
  >
    <v-chart
      class="chart"
      :option="option"
      autoresize
      @brushend="onBrush"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineFilters } from '@/composables/useTimelineFilters'
import { useProfileStore } from '@/stores/profile'
import { OMOP_DOMAINS } from '@/models/profile.types'

const store = useProfileStore()
const { chartSeries } = useTimelineFilters()

const option = computed(() => ({
  grid: { left: 120, right: 24, top: 16, bottom: 60 },
  xAxis: { type: 'value', name: 'Day', nameGap: 24, nameLocation: 'middle' },
  yAxis: { type: 'category', data: [...OMOP_DOMAINS] },
  tooltip: {
    trigger: 'item',
    formatter: (p: { data?: { name?: string; value?: number[] } }) =>
      `${p.data?.name ?? ''}<br/>Day ${p.data?.value?.[0] ?? ''}`,
  },
  brush: { toolbox: ['lineX', 'clear'], xAxisIndex: 0 },
  series: chartSeries.value.map(d => ({
    name: d.domain,
    type: 'scatter',
    symbolSize: 8,
    data: d.points.map(pt => ({
      name: pt.conceptName,
      value: [pt.startDay, d.domain],
      itemStyle: { color: pt.color },
    })),
  })),
}))

function onBrush(e: { areas?: Array<{ coordRange?: [number, number] }> }) {
  const range = e.areas?.[0]?.coordRange
  if (range && range.length === 2) store.setDateRange([range[0], range[1]])
  else store.setDateRange(null)
}

defineExpose({ onBrush })
</script>

<style scoped>
.profile-timeline { height: 320px; width: 100%; }
.chart { height: 100%; width: 100%; }
</style>
