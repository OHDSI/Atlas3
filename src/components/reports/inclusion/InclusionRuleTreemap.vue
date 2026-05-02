<template>
  <div
    v-if="hasData"
    class="inclusion-treemap"
    data-testid="inclusion-treemap"
  >
    <v-chart
      :option="chartOption"
      :style="{ height: `${height}px`, width: '100%' }"
      autoresize
    />
    <div class="inclusion-treemap__legend">
      <span
        v-for="(item, idx) in legend"
        :key="idx"
        class="inclusion-treemap__swatch"
      >
        <span
          class="inclusion-treemap__swatch-color"
          :style="{ background: item.color }"
        />
        {{ item.label }}
      </span>
    </div>
  </div>
  <div
    v-else
    class="text-center py-6 text-grey-darken-1"
    data-testid="inclusion-treemap-empty"
  >
    No population breakdown available.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { InclusionTreemapNode } from '@/models/report.types'

const props = withDefaults(
  defineProps<{
    treemap: InclusionTreemapNode | null
    /** Total number of inclusion rules — used to count failures from leaf bit-strings */
    ruleCount: number
    height?: number
  }>(),
  { height: 420 }
)

const hasData = computed(() => {
  if (!props.treemap) return false
  const root = props.treemap
  return !!root.children && root.children.length > 0
})

// Atlas 2.15 colour scheme: green (all pass) → red (all fail)
const palette = ['#7BB209', '#95B90A', '#C9C40D', '#E77F13', '#FF3D19']

function failuresFromName(name: string, ruleCount: number): number {
  // The server encodes each leaf as a bit-string of length ruleCount where
  // '1' = inclusion rule satisfied, '0' = not satisfied.
  if (!name || ruleCount <= 0) return 0
  let zeros = 0
  for (const ch of name) if (ch === '0') zeros++
  return Math.min(zeros, ruleCount)
}

function colorForLeaf(name: string): string {
  const failures = failuresFromName(name, props.ruleCount)
  if (props.ruleCount === 0) return palette[0]!
  // Map failures (0 .. ruleCount) onto palette indices (0 .. palette.length - 1)
  const idx = Math.round((failures / Math.max(1, props.ruleCount)) * (palette.length - 1))
  return palette[Math.max(0, Math.min(palette.length - 1, idx))]!
}

function decorate(node: InclusionTreemapNode): Record<string, unknown> {
  const isLeaf = !node.children || node.children.length === 0
  return {
    name: node.name,
    value: node.size ?? 0,
    itemStyle: isLeaf ? { color: colorForLeaf(node.name) } : undefined,
    children: node.children?.map(decorate) ?? undefined,
  }
}

function buildTooltip(info: { name: string; value: number }, ruleCount: number): string {
  const failures = failuresFromName(info.name, ruleCount)
  const passing = ruleCount - failures
  return `<strong>${info.name || '(root)'}</strong><br/>Persons: ${info.value}<br/>Rules satisfied: ${passing} of ${ruleCount}`
}

const chartOption = computed(() => {
  const root = props.treemap
  if (!root) return {}
  return {
    tooltip: {
      formatter: (info: { name: string; value: number }) => buildTooltip(info, props.ruleCount),
    },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: { show: true, formatter: '{b}' },
        data: root.children?.map(decorate) ?? [],
      },
    ],
  }
})

defineExpose({ buildTooltip })

const legend = computed(() => {
  if (props.ruleCount === 0) {
    return [{ color: palette[0]!, label: 'No inclusion rules' }]
  }
  return [
    { color: palette[0]!, label: `All ${props.ruleCount} rules satisfied` },
    { color: palette[palette.length - 1]!, label: `0 rules satisfied` },
  ]
})
</script>

<style scoped>
.inclusion-treemap__legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.66);
  margin-top: 8px;
  flex-wrap: wrap;
}
.inclusion-treemap__swatch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.inclusion-treemap__swatch-color {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
</style>
