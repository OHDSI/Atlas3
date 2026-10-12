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
      v-on="chartEvents"
    />
    <div class="inclusion-treemap__legend">
      <span
        v-for="item in legend"
        :key="item.label"
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
    {{ t('components.inclusionRuleReport.noBreakdown', 'No population breakdown available.').value }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { InclusionTreemapNode } from '@/models/report.types'
import { leafMatchesSelection, type IntersectSelection } from '@/utils/inclusion-attrition'
import { escapeHtml } from '@/utils/html'
import { useI18n } from '@/composables/useI18n'
import { prevalenceRamp, trackChartTheme } from '@/ui/chart-config'

const { t, tv } = useI18n()

const props = withDefaults(
  defineProps<{
    treemap: InclusionTreemapNode | null
    /** Total number of inclusion rules — used to count failures from leaf bit-strings */
    ruleCount: number
    /** Inclusion-rule names indexed by rule number (rule 1 first). Used in the tooltip. */
    ruleNames?: string[]
    /** Initial population, for the share shown in the tooltip */
    baseCount?: number
    height?: number
    /** Intersect view: leaves that don't match the selection are grayed out. */
    selection?: IntersectSelection | null
    /** Tooltip label for a leaf's size: "Persons" in By Person mode, "Events" in By Event mode. */
    unitLabel?: string
  }>(),
  { height: 400, ruleNames: () => [], baseCount: 0, selection: null, unitLabel: 'Persons' }
)

/** Hovered leaf (bit-string, rule 0 first, '1' = passed) or null when the pointer leaves it. */
const emit = defineEmits<{ 'leaf-hover': [leaf: { bits: string; size: number } | null] }>()

const hasData = computed(() => !!props.treemap?.children?.length)

function failuresFromName(name: string, ruleCount: number): number {
  // Each leaf is a bit-string of length ruleCount: '1' = rule passed, '0' = failed.
  if (!name || ruleCount <= 0) return 0
  let zeros = 0
  for (const ch of name) if (ch === '0') zeros++
  return Math.min(zeros, ruleCount)
}

// As in Atlas 2, a leaf is coloured by how many rules it failed, on the
// theme's blue ramp: darkest when every rule passed, lighter as failures add up.
type Band = { key: string; step: number; label: () => string }
const BANDS: Record<string, Band> = {
  all: { key: 'all', step: 4, label: () => tv('components.inclusionRuleReport.bandAllPassed', 'All rules passed') },
  one: { key: 'one', step: 3, label: () => tv('components.inclusionRuleReport.bandOneFailed', '1 rule failed') },
  two: { key: 'two', step: 2, label: () => tv('components.inclusionRuleReport.bandTwoFailed', '2 rules failed') },
  few: { key: 'few', step: 1, label: () => tv('components.inclusionRuleReport.bandFewFailed', '3–4 rules failed') },
  many: { key: 'many', step: 0, label: () => tv('components.inclusionRuleReport.bandManyFailed', '5 or more / all rules failed') },
}
function bandColor(band: Band): string {
  return prevalenceRamp()[band.step]!
}
const BAND_ORDER = ['all', 'one', 'two', 'few', 'many']

function bandFor(bits: string): Band {
  const failed = failuresFromName(bits, props.ruleCount)
  if (failed === 0) return BANDS.all!
  if (failed === props.ruleCount) return BANDS.many!
  if (failed === 1) return BANDS.one!
  if (failed === 2) return BANDS.two!
  if (failed < 5) return BANDS.few!
  return BANDS.many!
}

// Leaves outside the intersect selection are grayed out, as in Atlas 2.
function notSelectedColor(): string {
  trackChartTheme()
  if (typeof window === 'undefined') return '#CCCCCC'
  const triplet = getComputedStyle(document.documentElement).getPropertyValue('--v-theme-on-surface').trim()
  return triplet ? `rgba(${triplet}, 0.26)` : '#BDBDBD'
}

function colorForLeaf(bits: string): string {
  if (props.selection && !leafMatchesSelection(bits, props.selection)) return notSelectedColor()
  return bandColor(bandFor(bits))
}

function decorate(node: InclusionTreemapNode): Record<string, unknown> {
  const isLeaf = !node.children || node.children.length === 0
  // Only emit `value` for leaves; interior `Group N` nodes have no size and
  // echarts sums their children (a `value: 0` drew zero-area rectangles).
  const out: Record<string, unknown> = { name: node.name }
  if (isLeaf) {
    out.value = node.size ?? 0
    out.itemStyle = { color: colorForLeaf(node.name) }
    out._bitString = node.name
  } else {
    out.children = node.children!.map(decorate)
  }
  return out
}

function percentOfBase(size: number): string {
  return props.baseCount > 0 ? `${((size / props.baseCount) * 100).toFixed(2)}%` : '—'
}

function buildTooltip(info: { name: string; value: number; data?: { _bitString?: string } }): string {
  const bits = info.data?._bitString ?? info.name
  if (!bits || !/^[01]+$/.test(bits)) return escapeHtml(info.name || '')
  const failed = failuresFromName(bits, props.ruleCount)
  const rules = [...bits]
    .map((bit, i) => {
      const name = escapeHtml(props.ruleNames[i] || `Rule ${i + 1}`)
      return bit === '1'
        ? `<strong>✓</strong> ${name}`
        : `<span style="opacity:0.6">✗ ${name}</span>`
    })
    .join('<br/>')
  const counts = tv('components.inclusionRuleReport.leafCounts', '{passed} passed, {failed} failed', {
    passed: props.ruleCount - failed,
    failed,
  })
  return `<strong>${escapeHtml(props.unitLabel)}: ${new Intl.NumberFormat().format(info.value)} (${percentOfBase(info.value)})</strong><br/>${escapeHtml(counts)}<br/>${rules}`
}

function onHover(params: { data?: { _bitString?: string; value?: number } }) {
  const bits = params.data?._bitString
  if (bits && /^[01]+$/.test(bits)) emit('leaf-hover', { bits, size: params.data?.value ?? 0 })
}

// ECharts events (not DOM events), bound as an object; the same detail is in
// the tooltip, and the rule table stays usable without a pointer.
const chartEvents = {
  mouseover: onHover,
  mouseout: () => emit('leaf-hover', null),
  globalout: () => emit('leaf-hover', null),
}

const chartOption = computed(() => {
  const root = props.treemap
  if (!root) return {}
  return {
    tooltip: { formatter: buildTooltip },
    series: [
      {
        type: 'treemap',
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        // Draw every leaf, however small (echarts hides < 10px² by default; Atlas 2 doesn't).
        visibleMin: 0,
        // Colour carries the meaning (as in Atlas 2); per-rule detail lives in the tooltip.
        label: { show: false },
        upperLabel: { show: false },
        itemStyle: { borderColor: 'transparent', gapWidth: 1 },
        emphasis: { itemStyle: { borderColor: '#555', borderWidth: 2 } },
        data: root.children?.map(decorate) ?? [],
      },
    ],
  }
})

defineExpose({ buildTooltip })

function collectLeaves(node: InclusionTreemapNode, out: string[]): string[] {
  if (!node.children?.length) out.push(node.name)
  else node.children.forEach(c => collectLeaves(c, out))
  return out
}

// Only the bands that actually occur in this breakdown.
const legend = computed(() => {
  if (props.ruleCount === 0) {
    return [{ color: bandColor(BANDS.all!), label: t('components.expressionCartoonBindings.noInclusionRules', 'No inclusion rules').value }]
  }
  const present = new Set(props.treemap ? collectLeaves(props.treemap, []).map(b => bandFor(b).key) : [])
  const items = BAND_ORDER.filter(k => present.has(k)).map(k => ({ color: bandColor(BANDS[k]!), label: BANDS[k]!.label() }))
  if (props.selection) {
    items.push({ color: notSelectedColor(), label: t('components.inclusionRuleReport.notInSelection', 'Not in selection').value })
  }
  return items
})
</script>

<style scoped>
.inclusion-treemap__legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--atlas-color-on-surface-variant);
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
  /* Keeps the faint "not in selection" swatch visible against the surface. */
  box-shadow: inset 0 0 0 1px var(--atlas-color-outline-variant);
}
</style>
