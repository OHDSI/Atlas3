<template>
  <div class="ir-treemap">
    <TreemapChart
      :data="treemapNodes"
      :height="400"
      :show-export="false"
      :enable-zoom="true"
      :title="tv('components.incidenceRate.stratifiedIncidence', 'Stratified Incidence')"
    />
    <div class="ir-treemap__legend">
      <span class="ir-treemap__legend-label">{{ t('components.incidenceRate.lowerRate', 'Lower rate').value }}</span>
      <div class="ir-treemap__legend-bar" />
      <span class="ir-treemap__legend-label">{{ t('components.incidenceRate.higherRate', 'Higher rate').value }}</span>
      <span class="ir-treemap__legend-hint">{{ t('components.incidenceRate.treemapLegendHint', '(color = incidence rate per person-year; area = persons at risk)').value }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import TreemapChart from '@/components/ui/charts/AtlasTreemapChart.vue'
import type { TreemapNode } from '@/models/report.types'

const { t, tv } = useI18n()

const props = defineProps<{
  treemapJson: string
  strataNames?: string[]
}>()

interface RawNode {
  name: string
  children?: RawNode[]
  size?: number
  cases?: number
  timeAtRisk?: number
}

function decodeBitmask(mask: string, names: string[]): string {
  const bits = mask.split('')
  const matched: string[] = []
  const unmatched: string[] = []
  for (let i = 0; i < bits.length && i < names.length; i++) {
    if (bits[i] === '1') matched.push(names[i]!)
    else unmatched.push(names[i]!)
  }
  if (matched.length === 0) return 'None matched'
  if (unmatched.length === 0) return matched.join(', ')
  return matched.join(', ')
}

function collectLeaves(node: RawNode, out: TreemapNode[], names: string[]): void {
  if (node.children && node.children.length > 0) {
    for (const child of node.children) collectLeaves(child, out, names)
    return
  }
  const cases = node.cases ?? 0
  const tar = node.timeAtRisk ?? 0
  const persons = node.size ?? 0
  const py = tar / 365.25
  const rate = py > 0 ? cases / py : 0

  const label = names.length > 0 && /^[01]+$/.test(node.name)
    ? decodeBitmask(node.name, names)
    : node.name

  const ratePer1000 = (rate * 1000).toFixed(1)
  out.push({
    name: `${label}`,
    value: persons || 1,
    colorValue: rate,
    conceptPath: `${persons.toLocaleString()} persons || ${cases.toLocaleString()} cases || Rate: ${ratePer1000} per 1,000 PY`,
  })
}

const treemapNodes = computed<TreemapNode[]>(() => {
  let root: RawNode
  try {
    root = JSON.parse(props.treemapJson || '{}') as RawNode
  } catch {
    return []
  }
  if (!root.children || root.children.length === 0) return []
  const leaves: TreemapNode[] = []
  collectLeaves(root, leaves, props.strataNames ?? [])
  return leaves
})
</script>

<style scoped>
.ir-treemap__legend {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  padding: 8px 0 4px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.ir-treemap__legend-bar {
  width: 80px;
  height: 10px;
  border-radius: 3px;
  background: linear-gradient(to right, #7e9bbf, #4e79a7, #1f425a);
}

/* Mirrors chart-config.ts's DARK_TREEMAP_GRADIENT: the light ramp's navy
   end sits at 1.71:1 on the dark surface (near-invisible), so dark runs
   mid-blue to pale blue instead, matching the treemap's own dark colours. */
.v-theme--dark .ir-treemap__legend-bar {
  background: linear-gradient(to right, #4e79a7, #7fb3e0, #a8cdea);
}
.ir-treemap__legend-label {
  font-weight: 600;
  font-size: 10px;
}
.ir-treemap__legend-hint {
  font-style: italic;
  font-size: 10px;
  margin-left: 4px;
}
</style>
