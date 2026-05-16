<template>
  <AtlasCard padding="md">
    <div class="section-header">
      <div class="section-header__title-row">
        <span class="text-eyebrow">TIMELINE</span>
        <span class="section-header__rule" />
        <h2 class="section-title">
          Event timeline
        </h2>
      </div>
    </div>
    <div class="section-body">
      <div class="profile-timeline__filters">
        <ProfileFilterChips />
        <AtlasChip
          v-if="store.dateRange"
          closable
          tone="primary"
          size="sm"
          data-test="profile-daterange-chip"
          @close="store.setDateRange(null)"
        >
          Day {{ store.dateRange[0] }} → {{ store.dateRange[1] }}
        </AtlasChip>
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
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineFilters } from '@/composables/useTimelineFilters'
import { useProfileStore } from '@/stores/profile'
import { DEFAULT_HIGHLIGHT_COLOR, OMOP_DOMAINS } from '@/models/profile.types'
import { AtlasCard, AtlasChip } from '@/components/ui'
import ProfileFilterChips from '@/components/profile/ProfileFilterChips.vue'

const store = useProfileStore()
const { chartSeries, axisExtent } = useTimelineFilters()

// Minimum pixel width for point-style records so they remain
// clickable / visible. Mirrors `minBoxPix` in Atlas's profileChart.js.
const MIN_BOX_PX = 5
const BAR_HEIGHT_PX = 8

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface SeriesDatum {
  name: string
  value: [number, number | null, string]
  isRange: boolean
}

const option = computed(() => {
  const { min, max } = axisExtent.value
  return {
    grid: { left: 120, right: 24, top: 16, bottom: 60 },
    xAxis: {
      type: 'value',
      name: 'Day (0 = cohort entry)',
      nameGap: 24,
      nameLocation: 'middle',
      min,
      max,
    },
    yAxis: { type: 'category', data: [...OMOP_DOMAINS] },
    tooltip: {
      trigger: 'item',
      formatter: (p: { data?: SeriesDatum }) => {
        const d = p.data
        if (!d) return ''
        const [start, end] = d.value
        const range =
          d.isRange && typeof end === 'number'
            ? `Day ${start} → Day ${end} (${end - start}d)`
            : `Day ${start}`
        return `${escapeHtml(d.name)}<br/>${range}`
      },
    },
    brush: { toolbox: ['lineX', 'clear'], xAxisIndex: 0 },
    series: chartSeries.value.map((d, i) => ({
      name: d.domain,
      type: 'custom' as const,
      encode: { x: [0, 1], y: 2, tooltip: [0, 1] },
      renderItem: (
        _params: unknown,
        api: {
          value: (i: number) => number | string
          coord: (pt: [number, number | string]) => [number, number]
          size: (data: [number, number]) => [number, number]
          style: (extra?: Record<string, unknown>) => Record<string, unknown>
        },
      ) => {
        const startDay = api.value(0) as number
        const endRaw = api.value(1)
        const yCat = api.value(2) as string
        const [xStart, yPix] = api.coord([startDay, yCat])
        const hasRange = typeof endRaw === 'number' && endRaw > startDay
        const xEnd = hasRange ? api.coord([endRaw as number, yCat])[0] : xStart
        const width = Math.max(MIN_BOX_PX, xEnd - xStart)
        return {
          type: 'rect',
          shape: {
            x: hasRange ? xStart : xStart - MIN_BOX_PX / 2,
            y: yPix - BAR_HEIGHT_PX / 2,
            width,
            height: BAR_HEIGHT_PX,
          },
          style: api.style(),
        }
      },
      data: d.points.map<SeriesDatum>(pt => ({
        name: pt.conceptName,
        value: [pt.startDay, pt.endDay, d.domain],
        isRange: pt.isRange,
        itemStyle: {
          color: pt.color === DEFAULT_HIGHLIGHT_COLOR ? pt.domainColor : pt.color,
        },
      })),
      markLine:
        i === 0
          ? {
              symbol: 'none',
              silent: true,
              lineStyle: { color: '#888', type: 'dashed', width: 1 },
              label: { formatter: 'Cohort entry', position: 'insideEndTop', color: '#666' },
              data: [{ xAxis: 0 }],
            }
          : undefined,
    })),
  }
})

function onBrush(e: { areas?: Array<{ coordRange?: [number, number] }> }) {
  const range = e.areas?.[0]?.coordRange
  if (range && range.length === 2) store.setDateRange([range[0], range[1]])
  else store.setDateRange(null)
}

defineExpose({ onBrush })
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.section-header__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-header__rule {
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0;
}
.section-header__actions {
  margin-left: auto;
}

.profile-timeline__filters {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.profile-timeline {
  height: 320px;
  width: 100%;
}
.chart {
  height: 100%;
  width: 100%;
}
</style>
