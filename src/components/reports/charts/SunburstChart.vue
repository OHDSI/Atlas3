<!--
  SunburstChart

  Custom ECharts series + d3-partition layout. Renders concentric color bands
  for combination nodes (bit-mask names like "5" = bits 1+4 → two bands at the
  same radial depth, one color per bit). Single-event nodes render as one
  uniform sector. Mirrors the Atlas 2.15 atlascharts.sunburst behavior on top
  of an ECharts canvas so we keep autoresize, animations, and event hooks.
-->
<template>
  <div
    class="sunburst-chart-container"
    :style="{ minHeight: `${minHeight}px` }"
  >
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
import { hierarchy, partition, type HierarchyRectangularNode } from 'd3'

export interface SunburstNode {
  name: string
  value?: number
  itemColor?: string
  children?: SunburstNode[]
  splitChildren?: SunburstNode[]
}

const props = withDefaults(
  defineProps<{
    data: SunburstNode
    colors: (key: string) => string
    minHeight?: number
  }>(),
  {
    minHeight: 500,
  }
)

const emit = defineEmits<{
  'arc-click': [node: SunburstNode]
}>()

type LaidOutNode = HierarchyRectangularNode<SunburstNode>

interface Band {
  r0: number
  r1: number
  color: string
}

// Decompose a bit-mask combo name into the bit positions it contains. "5" → [0,2].
function combinationBits(name: string): number[] | null {
  const num = Number(name)
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) return null
  const bits = num
    .toString(2)
    .split('')
    .reverse()
    .map((b, i) => (b === '1' ? i : -1))
    .filter(i => i >= 0)
  return bits.length > 1 ? bits : null
}

function bandsForNode(d: LaidOutNode, colors: (key: string) => string): Band[] {
  const bits = combinationBits(d.data.name)
  if (!bits) {
    return [{ r0: d.y0, r1: d.y1, color: d.data.itemColor || colors(d.data.name) }]
  }
  const bw = (d.y1 - d.y0) / bits.length
  return bits.map((bit, i) => ({
    r0: d.y0 + i * bw,
    r1: d.y0 + (i + 1) * bw,
    color: colors(String(1 << bit)),
  }))
}

const partitioned = computed<LaidOutNode[]>(() => {
  const root = hierarchy<SunburstNode>(props.data)
    .sum(n => {
      // d3 hierarchy sums nominal value for leaves only; intermediates are
      // computed. The pathway hierarchy already attaches `value` everywhere
      // — pass through for leaves, return 0 for nodes whose children sum.
      const hasChildren =
        (n.children && n.children.length > 0) || (n.splitChildren && n.splitChildren.length > 0)
      return hasChildren ? 0 : (n.value ?? 0)
    })
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  // Layout in unit angle/radius; renderItem rescales to pixels.
  return partition<SunburstNode>()
    .size([2 * Math.PI, 1])(root)
    .descendants()
})

// Skip the root node — it would render as a full disc covering everything.
const renderable = computed<LaidOutNode[]>(() => partitioned.value.filter(d => d.depth > 0))

function buildBreadcrumb(d: LaidOutNode | undefined): string {
  if (!d) return ''
  const chain: LaidOutNode[] = []
  let cur: LaidOutNode | null = d
  while (cur && cur.depth > 0) {
    chain.unshift(cur)
    cur = cur.parent as LaidOutNode | null
  }
  const rows = chain.map(node => {
    const bits = combinationBits(node.data.name)
    const segs = bits
      ? bits.map(b => ({ name: String(1 << b), color: props.colors(String(1 << b)) }))
      : [{ name: node.data.name, color: node.data.itemColor || props.colors(node.data.name) }]
    return segs
      .map(
        s =>
          `<span style="display:inline-block;padding:1px 6px;margin-right:2px;border-radius:3px;background:${s.color};color:#fff;font-size:11px;">${escapeHtml(s.name)}</span>`
      )
      .join('')
  })
  return `<div style="font-size:12px;line-height:1.6;">${rows.join('<br/>')}<div style="margin-top:4px;color:#666;">count: ${d.value ?? 0}</div></div>`
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]!
  )
}

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'item' as const,
    enterable: false,
    formatter: (p: { dataIndex: number }) => buildBreadcrumb(renderable.value[p.dataIndex]),
  },
  series: [
    {
      type: 'custom' as const,
      coordinateSystem: undefined,
      animation: false,
      data: renderable.value.map(d => ({ value: d.value ?? 0, name: d.data.name })),
      renderItem: (
        params: { dataIndex: number },
        api: {
          getWidth(): number
          getHeight(): number
        }
      ) => {
        const d = renderable.value[params.dataIndex]
        if (!d) return null
        const w = api.getWidth()
        const h = api.getHeight()
        const cx = w / 2
        const cy = h / 2
        const R = Math.min(cx, cy) * 0.9

        // Drop near-zero slices to keep the canvas readable.
        if (d.x1 - d.x0 < 0.005) return null

        // ECharts angle convention: 0 at 3 o'clock, counter-clockwise positive.
        // d3 partition gives 0 at 12 o'clock running clockwise. Convert.
        const startAngle = Math.PI / 2 - d.x1
        const endAngle = Math.PI / 2 - d.x0

        const bands = bandsForNode(d, props.colors)
        const children = bands.map(b => ({
          type: 'sector',
          shape: {
            cx,
            cy,
            r0: b.r0 * R,
            r: b.r1 * R,
            startAngle,
            endAngle,
            clockwise: true,
          },
          style: { fill: b.color, stroke: '#fff', lineWidth: 0.5 },
          emphasis: { style: { stroke: '#000', lineWidth: 1 } },
        }))

        return { type: 'group', children }
      },
    },
  ],
}))

function handleChartClick(e: { dataIndex?: number }): void {
  const idx = e?.dataIndex
  if (typeof idx !== 'number') return
  const d = renderable.value[idx]
  if (d) emit('arc-click', d.data)
}

defineExpose({ handleChartClick })
</script>

<style scoped>
.sunburst-chart-container {
  width: 100%;
}
</style>
