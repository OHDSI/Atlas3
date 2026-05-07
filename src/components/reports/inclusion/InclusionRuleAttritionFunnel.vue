<template>
  <div
    class="attrition-funnel"
    data-testid="inclusion-attrition-funnel"
  >
    <div class="attrition-funnel__header">
      <span class="attrition-funnel__title">Attrition</span>
      <AtlasButton
        v-if="steps.length > 0"
        variant="tonal"
        size="sm"
        data-testid="inclusion-attrition-funnel-csv"
        @click="exportCsv"
      >
        Download CSV
      </AtlasButton>
    </div>

    <div
      v-if="steps.length === 0"
      class="attrition-funnel__empty"
      data-testid="inclusion-attrition-funnel-empty"
    >
      <span class="attrition-funnel__empty-title">No attrition data available</span>
      <span class="attrition-funnel__empty-hint">
        Generate a cohort with inclusion rules to see attrition
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
        <span>Initial:</span>
        <span class="attrition-funnel__count">{{ formatCount(initial.remaining) }} patients</span>
        <span class="attrition-funnel__arrow">→</span>
        <span>Final:</span>
        <span class="attrition-funnel__count">{{ formatCount(final.remaining) }} patients</span>
        <span
          class="attrition-funnel__retained"
          :style="{ color: finalColor }"
        >
          ({{ final.percentOfInitial.toFixed(1) }}% retained)
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

const props = defineProps<{ report: InclusionRuleReport }>()

const steps = computed<AttritionStep[]>(() => computeAttritionSteps(props.report))
const chartHeight = computed(() => Math.max(260, steps.value.length * 52))
const initial = computed(() => steps.value[0]!)
const final = computed(() => steps.value[steps.value.length - 1]!)
const finalColor = computed(() => retentionColor(final.value.percentOfInitial))

type RGB = [number, number, number]
const GREEN: RGB = [52, 199, 89]
const AMBER: RGB = [255, 149, 0]
const RED: RGB = [255, 59, 48]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}
function rgbToHex([r, g, b]: RGB): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
function retentionColor(pct: number): string {
  if (pct >= 100) return rgbToHex(GREEN)
  if (pct >= 75) {
    const t = (100 - pct) / 25
    return rgbToHex(lerpRGB(GREEN, AMBER, t))
  }
  const t = Math.min(1, (75 - pct) / 75)
  return rgbToHex(lerpRGB(AMBER, RED, t))
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
  const data = steps.value.map(s => ({
    name: s.label,
    value: s.remaining,
    itemStyle: { color: retentionColor(s.percentOfInitial) },
    _excluded: s.excluded,
    _percentOfInitial: s.percentOfInitial,
  }))

  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: { dataIndex: number }) => {
        const s = steps.value[p.dataIndex]
        if (!s) return ''
        const lines = [
          `<strong>${s.label}</strong>`,
          `Remaining: ${formatCount(s.remaining)}`,
          `% of initial: ${s.percentOfInitial.toFixed(1)}%`,
        ]
        if (s.excluded > 0) lines.push(`Excluded at this step: ${formatCount(s.excluded)}`)
        return lines.join('<br/>')
      },
    },
    toolbox: {
      right: 8,
      top: 4,
      feature: {
        saveAsImage: { name: 'attrition_chart', pixelRatio: 2, title: 'Save as PNG' },
      },
    },
    series: [
      {
        type: 'funnel',
        sort: 'descending',
        funnelAlign: 'center',
        gap: 2,
        min: 0,
        minSize: '15%',
        maxSize: '100%',
        top: 8,
        bottom: 8,
        left: 16,
        right: 16,
        label: {
          show: true,
          position: 'inside',
          color: '#FFFFFF',
          fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
          fontSize: 12,
          formatter: (p: { dataIndex: number }) => {
            const s = steps.value[p.dataIndex]
            return s ? buildLabel(s) : ''
          },
        },
        labelLine: { show: false },
        emphasis: { label: { fontSize: 13 } },
        data,
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
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.attrition-funnel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.attrition-funnel__title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.86);
  letter-spacing: -0.2px;
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
.attrition-funnel__empty-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.attrition-funnel__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-wrap: wrap;
}
.attrition-funnel__count {
  color: rgba(0, 0, 0, 0.86);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.attrition-funnel__arrow {
  color: rgba(0, 0, 0, 0.35);
}
.attrition-funnel__retained {
  margin-left: 4px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
