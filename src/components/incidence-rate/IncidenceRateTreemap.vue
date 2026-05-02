<template>
  <svg
    ref="svgRef"
    :width="width"
    :height="height"
    class="treemap"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as d3 from 'd3'

const props = defineProps<{
  treemapJson: string
  width?: number
  height?: number
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const width = props.width ?? 600
const height = props.height ?? 400

interface Node {
  name: string
  children?: Node[]
  size?: number
  rate?: number
  cases?: number
  tar?: number
  persons?: number
}

defineExpose({ svgRef })

function render() {
  if (!svgRef.value) return
  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  let root: Node
  try {
    root = JSON.parse(props.treemapJson || '{}') as Node
  } catch {
    root = { name: 'root' }
  }

  if (!root.children || root.children.length === 0) return

  const hierarchy = d3
    .hierarchy<Node>(root)
    .sum(d => d.size ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  d3.treemap<Node>().size([width, height]).padding(1)(hierarchy)

  // Build a non-zero-rate domain for the color scale.
  const rates = hierarchy
    .leaves()
    .map(l => l.data.rate ?? 0)
    .filter(r => r > 0)
  const maxRate = rates.length ? Math.max(...rates) : 1

  const color = d3
    .scaleSequential(d3.interpolateRgbBasis(['#3b82f6', '#facc15', '#ef4444']))
    .domain([0, maxRate])

  const cell = svg
    .selectAll('g')
    .data(hierarchy.leaves())
    .join('g')
    .attr(
      'transform',
      d =>
        `translate(${(d as d3.HierarchyRectangularNode<Node>).x0},${(d as d3.HierarchyRectangularNode<Node>).y0})`
    )

  cell
    .append('rect')
    .attr(
      'width',
      d => (d as d3.HierarchyRectangularNode<Node>).x1 - (d as d3.HierarchyRectangularNode<Node>).x0
    )
    .attr(
      'height',
      d => (d as d3.HierarchyRectangularNode<Node>).y1 - (d as d3.HierarchyRectangularNode<Node>).y0
    )
    .attr('fill', d => {
      const r = d.data.rate ?? 0
      const tar = d.data.tar ?? 0
      const cases = d.data.cases ?? 0
      if (tar === 0) return '#bbb'
      if (cases === 0) return '#000'
      return color(r)
    })
    .attr('stroke', '#fff')

  cell.append('title').text(d => {
    const v = d.data
    return [
      v.name,
      `Persons: ${v.persons ?? '—'}`,
      `Cases: ${v.cases ?? 0}`,
      `TAR: ${v.tar ?? 0}`,
      `Rate: ${(v.rate ?? 0).toFixed(4)}`,
    ].join('\n')
  })
}

watch(() => props.treemapJson, render)
onMounted(render)
</script>

<style scoped>
.treemap {
  display: block;
}
</style>
