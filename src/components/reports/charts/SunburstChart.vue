<!--
  SunburstChart Component

  ECharts sunburst wrapper for hierarchical data visualization (e.g. Cohort Pathways)
-->
<template>
  <div class="sunburst-chart-container" :style="{ minHeight: `${minHeight}px` }">
    <v-chart
      :option="chartOption"
      :style="{ height: `${minHeight}px`, width: '100%' }"
      autoresize
      @click="handleChartClick"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface SunburstNode {
  name: string
  value?: number
  itemColor?: string
  children?: SunburstNode[]
  splitChildren?: SunburstNode[]
}

const props = withDefaults(defineProps<{
  data: SunburstNode
  colors: (key: string) => string
  minHeight?: number
}>(), {
  minHeight: 500,
})

const emit = defineEmits<{
  'arc-click': [node: SunburstNode]
}>()

interface EchartsSunburstNode {
  name: string
  value: number | undefined
  itemStyle?: { color: string }
  children?: EchartsSunburstNode[]
}

function flattenForEcharts(n: SunburstNode): EchartsSunburstNode {
  const node: EchartsSunburstNode = {
    name: n.name,
    value: n.value,
  }
  if (n.itemColor) node.itemStyle = { color: n.itemColor }
  if (n.splitChildren && n.splitChildren.length > 0) {
    node.children = n.splitChildren.map(flattenForEcharts)
  } else if (n.children && n.children.length > 0) {
    node.children = n.children.map(flattenForEcharts)
  }
  return node
}

const chartOption = computed(() => ({
  tooltip: { trigger: 'item' as const },
  series: [{
    type: 'sunburst' as const,
    data: (props.data.children || []).map(flattenForEcharts),
    radius: [0, '90%'],
    label: { rotate: 'radial' as const },
    emphasis: { focus: 'ancestor' as const },
  }],
}))

function handleChartClick(e: { data?: SunburstNode }): void {
  if (e?.data) emit('arc-click', e.data)
}

defineExpose({ handleChartClick })
</script>

<style scoped>
.sunburst-chart-container {
  width: 100%;
}
</style>
