<template>
  <div
    class="attrition-funnel"
    data-testid="inclusion-attrition-funnel"
  >
    <div class="attrition-funnel__header">
      <span class="attrition-funnel__title">{{ t('components.inclusionRuleReport.attrition', 'Attrition').value }}</span>
      <AtlasButton
        v-if="steps.length > 0"
        variant="tonal"
        size="sm"
        data-testid="inclusion-attrition-funnel-csv"
        @click="exportCsv"
      >
        {{ t('components.inclusionRuleReport.downloadCsv', 'Download CSV').value }}
      </AtlasButton>
    </div>

    <div
      v-if="steps.length === 0"
      class="attrition-funnel__empty"
      data-testid="inclusion-attrition-funnel-empty"
    >
      <span class="attrition-funnel__empty-title">{{ t('components.inclusionRuleReport.noAttritionData', 'No attrition data available').value }}</span>
      <span class="attrition-funnel__empty-hint">
        {{ t('components.inclusionRuleReport.noAttritionHint', 'Generate a cohort with inclusion rules to see attrition').value }}
      </span>
    </div>

    <template v-else>
      <v-chart
        :option="chartOption"
        :style="{ height: `${chartHeight}px`, width: '100%' }"
        autoresize
        data-testid="inclusion-attrition-funnel-chart"
      />

      <div
        v-if="steps.length > 1"
        class="attrition-funnel__footer"
        data-testid="inclusion-attrition-funnel-footer"
      >
        <span>{{ t('components.inclusionRuleReport.initial', 'Initial').value }}:</span>
        <span class="attrition-funnel__count">{{ formatCount(initial.remaining) }} {{ t('components.inclusionRuleReport.patients', 'patients').value }}</span>
        <span class="attrition-funnel__arrow">→</span>
        <span>{{ t('components.inclusionRuleReport.final', 'Final').value }}:</span>
        <span class="attrition-funnel__count">{{ formatCount(final.remaining) }} {{ t('components.inclusionRuleReport.patients', 'patients').value }}</span>
        <span
          class="attrition-funnel__retained"
          :style="{ color: finalColor }"
        >
          ({{ final.percentOfInitial.toFixed(1) }}% {{ t('components.inclusionRuleReport.retained', 'retained').value }})
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AtlasButton from '@/components/ui/AtlasButton.vue'
import { computeAttritionSteps, type AttritionStep } from '@/utils/inclusion-attrition'
import type { InclusionRuleReport } from '@/models/report.types'
import { useI18n } from '@/composables/useI18n'

const { t, tv } = useI18n()

const props = defineProps<{ report: InclusionRuleReport }>()

const steps = computed<AttritionStep[]>(() => computeAttritionSteps(props.report))
const chartHeight = computed(() => Math.max(260, steps.value.length * 52))
const initial = computed(() => steps.value[0]!)
const final = computed(() => steps.value[steps.value.length - 1]!)
const finalColor = computed(() => retentionColor(final.value.percentOfInitial))

// Match the inclusion-rule rail tones: same thresholds, same Vuetify theme
// vars so the report and the live-preview rail share one visual language.
// Reads the runtime CSS variable so it picks up the active theme — falls
// back to sensible defaults if the var isn't set yet.
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

// Rule-tone thresholds match InclusionRuleRail.toneForIndex:
// retention >= 80% → success, >= 40% → warning, else danger.
function toneForRetention(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 80) return 'success'
  if (pct >= 40) return 'warning'
  return 'error'
}

function retentionColor(pct: number): string {
  return themeColor(toneForRetention(pct), 0.85)
}
function retentionFill(pct: number): string {
  // Same alpha as the rail's `.rule-fill` (0.25) so the report bars and
  // the live-preview bars read as the same visual language.
  return themeColor(toneForRetention(pct), 0.25)
}

// In-segment label sits on a ~25%-alpha status tint over the funnel's own
// background (`.attrition-funnel`, surface-token driven) — reads the live
// on-surface var the same way themeColor() does so the label stays legible
// once that background flips to the dark surface.
function themeOnSurfaceColor(alpha: number): string {
  if (typeof window === 'undefined') return `rgba(0, 0, 0, ${alpha})`
  const root = getComputedStyle(document.documentElement)
  const triplet = root.getPropertyValue('--v-theme-on-surface').trim()
  if (!triplet) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${triplet}, ${alpha})`
}

const numberFormat = new Intl.NumberFormat()
function formatCount(n: number): string {
  return numberFormat.format(n)
}

function buildLabel(step: AttritionStep): string {
  const base = `${formatCount(step.remaining)} (${step.percentOfInitial.toFixed(1)}%)`
  const tail = step.excluded > 0 ? `  ▼${formatCount(step.excluded)}` : ''
  return `${step.label}\n${base}${tail}`
}

const chartOption = computed(() => {
  // Layout target:
  //   - Step 0 (Initial Population): rectangle, top = bottom = initial.
  //   - Step i for i ≥ 1: single trapezoid, top = previous step's value,
  //     bottom = this step's value, labeled with this step's rule name.
  //   - No tail past the last step.
  //
  // ECharts funnel maps each data[i] to segment[i]:
  //   segment[i].top    = data[i].value
  //   segment[i].bottom = data[i+1].value  (for i < N-1)
  //   segment[N-1].bottom = (minSize % of max value)
  //
  // To shift labels so segment i is "Rule i" we make data[i] hold the
  // PREVIOUS step's value as its sizing input but the CURRENT step's
  // label. The last segment lands on the last step's actual value via
  // minSize = (lastValue / maxValue) * 100% — no extra tail point needed.
  type Seg = {
    name: string
    value: number
    _stepIndex: number
    itemStyle: Record<string, unknown>
  }

  const segments: Seg[] = steps.value.map((s, i) => {
    const fill = retentionFill(s.percentOfInitial)
    const stroke = retentionColor(s.percentOfInitial)
    // Sizing value is the PREVIOUS step's count for non-initial rows so
    // segment i's top edge equals the cohort going INTO this rule. For
    // the initial row we use its own count (no prior step exists).
    const sizingValue = i === 0 ? s.remaining : steps.value[i - 1]!.remaining
    return {
      name: s.label,
      value: sizingValue,
      _stepIndex: i,
      itemStyle: { color: fill, borderColor: stroke, borderWidth: 0 },
    }
  })

  // Add an invisible "anchor" entry equal to the initial value AFTER the
  // initial row so segment 0 has top = bottom = initial → pure rectangle.
  // ECharts' first segment otherwise drops to data[1].value, which is
  // step 1's sizing value (initial count) — coincidentally equal here,
  // but if there are no rules at all we still want a flat rectangle.
  if (segments.length === 1) {
    segments.push({
      name: '',
      value: segments[0]!.value,
      _stepIndex: 0,
      itemStyle: { color: 'transparent', borderColor: 'transparent', borderWidth: 0 },
    })
  }

  const initialValue = steps.value[0]?.remaining ?? 0
  const lastValue = steps.value[steps.value.length - 1]?.remaining ?? 0
  // Land the bottom of the last segment exactly on the last step's
  // value. If the last step zeroed the cohort, clamp to a tiny minSize
  // so it still reads as a thin line (echarts' default 0% behaves
  // unpredictably).
  const minSizePct = initialValue > 0
    ? Math.max((lastValue / initialValue) * 100, 0.3)
    : 0.5

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: { dataIndex: number }) => {
        const seg = segments[p.dataIndex]
        if (!seg) return ''
        const s = steps.value[seg._stepIndex]
        if (!s) return ''
        const lines = [
          `<strong>${s.label}</strong>`,
          `${tv('components.inclusionRuleReport.tooltipRemaining', 'Remaining')}: ${formatCount(s.remaining)}`,
          `${tv('components.inclusionRuleReport.colPercentOfInitial', '% of initial')}: ${s.percentOfInitial.toFixed(1)}%`,
        ]
        if (s.excluded > 0)
          lines.push(
            `${tv('components.inclusionRuleReport.tooltipExcludedAtStep', 'Excluded at this step')}: ${formatCount(s.excluded)}`
          )
        return lines.join('<br/>')
      },
    },
    toolbox: {
      right: 8,
      top: 4,
      feature: {
        saveAsImage: { name: 'attrition_chart', pixelRatio: 2, title: tv('components.inclusionRuleReport.saveAsPng', 'Save as PNG') },
      },
    },
    series: [
      {
        type: 'funnel',
        sort: 'none',
        funnelAlign: 'center',
        gap: 0,
        min: 0,
        max: initialValue,
        minSize: `${minSizePct}%`,
        maxSize: '100%',
        top: 8,
        bottom: 8,
        left: 16,
        right: 16,
        label: {
          show: true,
          position: 'inside',
          color: themeOnSurfaceColor(0.86),
          fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
          fontSize: 12,
          formatter: (p: { dataIndex: number }) => {
            const seg = segments[p.dataIndex]
            if (!seg || !seg.name) return ''
            const s = steps.value[seg._stepIndex]
            return s ? buildLabel(s) : ''
          },
        },
        labelLine: { show: false },
        emphasis: { label: { fontSize: 13 } },
        data: segments,
      },
    ],
  }
})

function exportCsv() {
  const lines: string[] = ['Step,Rule,Remaining,Excluded,Percent of Initial']
  steps.value.forEach((s, i) => {
    const escaped = s.label.replace(/"/g, '""')
    lines.push(`${i},"${escaped}",${s.remaining},${s.excluded},${s.percentOfInitial.toFixed(1)}`)
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'attrition.csv'
  a.click()
  URL.revokeObjectURL(url)
}

defineExpose({ steps, chartOption, exportCsv, retentionColor })
</script>

<style scoped>
.attrition-funnel {
  border-radius: 12px;
  background: var(--atlas-color-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  /* Without these, the v-chart's autoresize observer can let the canvas
   * push the container past the parent's width when the report drawer
   * animates open — the rectangle for the initial population then
   * extends past the viewport. */
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.attrition-funnel :deep(.echarts) {
  max-width: 100%;
}
.attrition-funnel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--atlas-color-outline-variant);
}
.attrition-funnel__title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.86);
  letter-spacing: -0.2px;
}
.v-theme--dark .attrition-funnel__title {
  color: var(--atlas-color-on-surface);
}
.attrition-funnel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 6px;
}
.attrition-funnel__empty-title {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
}
.v-theme--dark .attrition-funnel__empty-title {
  color: var(--atlas-color-on-surface-variant);
}
.attrition-funnel__empty-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.v-theme--dark .attrition-funnel__empty-hint {
  color: var(--atlas-color-on-surface-variant);
}
.attrition-funnel__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  border-top: 1px solid var(--atlas-color-outline-variant);
  flex-wrap: wrap;
}
.v-theme--dark .attrition-funnel__footer {
  color: var(--atlas-color-on-surface-variant);
}
.attrition-funnel__count {
  color: rgba(0, 0, 0, 0.86);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.v-theme--dark .attrition-funnel__count {
  color: var(--atlas-color-on-surface);
}
.attrition-funnel__arrow {
  color: rgba(0, 0, 0, 0.35);
}
.v-theme--dark .attrition-funnel__arrow {
  color: var(--atlas-color-on-surface-variant);
}
.attrition-funnel__retained {
  margin-left: 4px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
