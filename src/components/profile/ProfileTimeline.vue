<template>
  <SurfaceCard padding="md">
    <div class="section-header">
      <div class="section-header__title-row">
        <span class="text-eyebrow">TIMELINE</span>
        <span class="section-header__rule" />
        <h2 class="section-title">Event timeline</h2>
      </div>
    </div>
    <div class="section-body">
      <div class="profile-timeline__filters">
        <ProfileFilterChips />
        <v-chip
          v-if="store.dateRange"
          closable
          variant="tonal"
          color="primary"
          size="small"
          data-test="profile-daterange-chip"
          @click:close="store.setDateRange(null)"
        >
          Day {{ store.dateRange[0] }} → {{ store.dateRange[1] }}
        </v-chip>
      </div>
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
    </div>
  </SurfaceCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineFilters } from '@/composables/useTimelineFilters'
import { useProfileStore } from '@/stores/profile'
import { DEFAULT_HIGHLIGHT_COLOR, OMOP_DOMAINS } from '@/models/profile.types'
import SurfaceCard from '@/components/shared/SurfaceCard.vue'
import ProfileFilterChips from '@/components/profile/ProfileFilterChips.vue'

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
      itemStyle: {
        color: pt.color === DEFAULT_HIGHLIGHT_COLOR ? pt.domainColor : pt.color,
      },
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
.section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
.section-header__title-row { display: flex; align-items: center; gap: 10px; }
.section-header__rule { width: 28px; height: 2px; background-color: rgb(var(--v-theme-orange)); border-radius: 2px; }
.section-title { font-size: 16px; font-weight: 600; line-height: 1.2; margin: 0; }
.section-header__actions { margin-left: auto; }

.profile-timeline__filters {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.profile-timeline { height: 320px; width: 100%; }
.chart { height: 100%; width: 100%; }
</style>
