<template>
  <SunburstChart
    :data="hierarchy"
    :colors="colors"
    :min-height="500"
    @arc-click="handleArcClick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SunburstChart from '@/components/reports/charts/SunburstChart.vue'
import { buildPathwayHierarchy } from '@/utils/pathway-hierarchy'
import type { SunburstNode } from '@/components/reports/charts/SunburstChart.vue'
import type { Pathway, PathwayResults } from '@/models/pathway.types'

const PALETTE_20 = [
  '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f',
  '#bcbd22','#17becf','#aec7e8','#ffbb78','#98df8a','#ff9896','#c5b0d5','#c49c94',
  '#f7b6d2','#c7c7c7','#dbdb8d','#9edae5',
]

const props = defineProps<{
  design: Pathway
  results: PathwayResults
  targetCohortId: number
}>()

const emit = defineEmits<{
  'pathway:select': [info: { code: number; nodeName: string; value: number }]
}>()

const colorMap = computed(() => {
  const map = new Map<string, string>()
  props.design.eventCohorts.forEach((_cohort, i) => {
    const bit = 1 << i
    map.set(String(bit), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
  })
  return map
})

const colors = (key: string): string => colorMap.value.get(key) ?? '#cccccc'

const targetGroup = computed(() =>
  props.results.pathwayGroups.find(g => g.targetCohortId === props.targetCohortId)
)

const hierarchy = computed(() => {
  if (!targetGroup.value) return { name: 'root', value: 0, children: [] }
  return buildPathwayHierarchy(
    targetGroup.value,
    props.results.eventCodes,
    props.design.maxDepth,
    colors
  )
})

function handleArcClick(node: SunburstNode) {
  const code = Number(node.name)
  emit('pathway:select', {
    code: Number.isNaN(code) ? -1 : code,
    nodeName: node.name,
    value: node.value ?? 0,
  })
}

defineExpose({ handleArcClick })
</script>
