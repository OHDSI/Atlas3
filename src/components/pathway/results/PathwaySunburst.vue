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

const props = defineProps<{
  design: Pathway
  results: PathwayResults
  targetCohortId: number
  colors: (key: string) => string
}>()

const emit = defineEmits<{
  'pathway:select': [info: { code: number; nodeName: string; value: number }]
}>()

const colors = (key: string): string => props.colors(key)

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
  emit('pathway:select', {
    code: node.code ?? -1,
    nodeName: node.codePath ?? String(node.code ?? node.name),
    value: node.value ?? 0,
  })
}

defineExpose({ handleArcClick })
</script>
