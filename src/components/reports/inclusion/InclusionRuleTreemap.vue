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
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    treemap: InclusionTreemapNode | null
    /** Total number of inclusion rules — used to count failures from leaf bit-strings */
    ruleCount: number
    /** Inclusion-rule names indexed by rule number (rule 1 first). Used for friendly leaf labels. */
    ruleNames?: string[]
    height?: number
  }>(),
  { height: 420, ruleNames: () => [] }
)

const hasData = computed(() => {
  if (!props.treemap) return false
  const root = props.treemap
  return !!root.children && root.children.length > 0
})

// Tone palette matches the cohort-builder rail and the attrition funnel:
// success (green) when most/all rules pass, warning (amber) for partial,
// error (red) when most/all rules fail. Reads the runtime CSS variable
// so it tracks the active Vuetify theme.
function themeColor(token: 'success' | 'warning' | 'error', alpha: number): string {
  if (typeof window === 'undefined') return '#7BB209'
  const root = getComputedStyle(document.documentElement)
  const triplet = root.getPropertyValue(`--v-theme-${token}`).trim()
  if (!triplet) {
    const fallback = { success: '52, 199, 89', warning: '255, 149, 0', error: '255, 59, 48' }[token]
    return `rgba(${fallback}, ${alpha})`
  }
  return `rgba(${triplet}, ${alpha})`
}

function failuresFromName(name: string, ruleCount: number): number {
  // The server encodes each leaf as a bit-string of length ruleCount where
  // '1' = inclusion rule satisfied, '0' = not satisfied.
  if (!name || ruleCount <= 0) return 0
  let zeros = 0
  for (const ch of name) if (ch === '0') zeros++
  return Math.min(zeros, ruleCount)
}

// In-tile label sits on a 60%-alpha status tint over the chart's own
// background — reads the live on-surface var the same way themeColor()
// does so the label stays legible against a dark surface.
function themeOnSurfaceColor(alpha: number): string {
  if (typeof window === 'undefined') return `rgba(0, 0, 0, ${alpha})`
  const root = getComputedStyle(document.documentElement)
  const triplet = root.getPropertyValue('--v-theme-on-surface').trim()
  if (!triplet) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${triplet}, ${alpha})`
}

function colorForLeaf(name: string): string {
  if (props.ruleCount === 0) return themeColor('success', 0.6)
  const passing = props.ruleCount - failuresFromName(name, props.ruleCount)
  const retention = passing / props.ruleCount
  // Same thresholds as InclusionRuleRail.toneForIndex.
  if (retention >= 0.8) return themeColor('success', 0.6)
  if (retention >= 0.4) return themeColor('warning', 0.6)
  return themeColor('error', 0.6)
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

// Build a human-readable label for a leaf bit-string. Rule i in the
// bit-string maps to ruleNames[i]; '1' means satisfied, '0' means not.
// Falls back to numeric "Rule N" when names aren't passed.
function friendlyName(bitString: string): string {
  if (!bitString || !/^[01]+$/.test(bitString)) return bitString
  const lines: string[] = []
  for (let i = 0; i < bitString.length; i++) {
    const passed = bitString[i] === '1'
    const name = props.ruleNames[i] || `Rule ${i + 1}`
    lines.push(`${passed ? '✓' : '✗'} ${truncate(name, 28)}`)
  }
  return lines.join('\n')
}

function decorate(node: InclusionTreemapNode): Record<string, unknown> {
  const isLeaf = !node.children || node.children.length === 0
  // Only emit `value` for leaves. The server's tree has interior `Group N`
  // nodes with no `size` field — emitting `value: 0` for them made echarts
  // draw zero-area rectangles for the entire subtree, leaving the chart
  // an empty white box. Without `value`, echarts sums the children.
  const out: Record<string, unknown> = { name: node.name }
  if (isLeaf) {
    out.value = node.size ?? 0
    out.itemStyle = { color: colorForLeaf(node.name) }
    // Stash the friendly label and the original bit-string separately so
    // the formatter can pick the right one without losing the
    // algorithmic identifier (failuresFromName / tooltip rely on it).
    out._friendly = friendlyName(node.name)
    out._bitString = node.name
  } else {
    out.children = node.children!.map(decorate)
  }
  return out
}

function buildTooltip(
  info: { name: string; value: number; data?: { _friendly?: string; _bitString?: string } },
  ruleCount: number
): string {
  const bitString = info.data?._bitString || info.name
  const failures = failuresFromName(bitString, ruleCount)
  const passing = ruleCount - failures
  const heading = info.data?._friendly
    ? info.data._friendly.replace(/\n/g, '<br/>')
    : (bitString || '(root)')
  return `<strong>${heading}</strong><br/>Persons: ${info.value}<br/>Rules satisfied: ${passing} of ${ruleCount}`
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
        label: {
          show: true,
          // Show the friendly per-rule list ("✓ Age >= 18 / ✗ New rule")
          // for leaves; interior group nodes keep their group label.
          formatter: (info: { name: string; data?: { _friendly?: string } }) =>
            info.data?._friendly || info.name,
          fontSize: 11,
          lineHeight: 14,
          color: themeOnSurfaceColor(0.82),
        },
        data: root.children?.map(decorate) ?? [],
      },
    ],
  }
})

defineExpose({ buildTooltip })

const legend = computed(() => {
  if (props.ruleCount === 0) {
    return [{ color: themeColor('success', 0.6), label: t('components.expressionCartoonBindings.noInclusionRules', 'No inclusion rules').value }]
  }
  return [
    { color: themeColor('success', 0.6), label: t('components.inclusionRuleReport.rulesSatisfiedHigh', '≥ 80% rules satisfied').value },
    { color: themeColor('warning', 0.6), label: `40–80%` },
    { color: themeColor('error', 0.6), label: t('components.inclusionRuleReport.rulesSatisfiedLow', '< 40% rules satisfied').value },
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
:global(.v-theme--dark) .inclusion-treemap__legend {
  color: var(--atlas-color-on-surface-variant);
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
