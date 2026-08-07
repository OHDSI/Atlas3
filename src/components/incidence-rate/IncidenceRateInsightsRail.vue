<template>
  <aside
    class="ir-insights"
    data-testid="ir-insights-rail"
  >
    <div class="ir-insights__label">
      {{ t('ir.workbench.rateSummary', 'Rate summary').value }}
    </div>

    <div
      class="ir-insights__kpi"
      data-testid="ir-kpi"
      :title="tv('components.incidenceRate.personsAtRiskTooltip', 'Persons at risk in the target cohort during the time-at-risk window')"
    >
      <div class="k-label">
        {{ t('components.incidenceRate.personsAtRisk', 'Persons at risk').value }}
      </div>
      <div class="k-val">
        {{ format(report.summary.totalPersons) }}
      </div>
    </div>
    <div
      class="ir-insights__kpi"
      data-testid="ir-kpi"
      :title="tv('components.incidenceRate.outcomeCasesTooltip', 'Persons who had the outcome during follow-up ({proportion})', { proportion: propPct })"
    >
      <div class="k-label">
        {{ t('components.incidenceRate.outcomeCases', 'Outcome cases').value }}
      </div>
      <div class="k-val">
        {{ format(report.summary.cases) }}
      </div>
      <div class="k-hint">
        {{ propPct }}
      </div>
    </div>
    <div
      class="ir-insights__kpi"
      data-testid="ir-kpi"
      :title="tv('components.incidenceRate.personYearsTooltip', 'Total person-time observed across all persons, measured in person-years')"
    >
      <div class="k-label">
        {{ t('components.incidenceRate.personYearsAtRisk', 'Person-years at risk').value }}
      </div>
      <div class="k-val">
        {{ formatYears(report.summary.timeAtRisk) }}
      </div>
    </div>
    <div
      class="ir-insights__kpi"
      data-testid="ir-kpi"
      :title="tv('components.incidenceRate.incidenceRateTooltip', 'Incidence rate: {cases} cases per {years} person-years, scaled by {multiplier}', { cases: format(report.summary.cases), years: formatYears(report.summary.timeAtRisk), multiplier: multiplier.toLocaleString() })"
    >
      <div class="k-label">
        {{ tv('components.incidenceRate.incidenceRatePerPy', 'Incidence rate per {multiplier} PY', { multiplier: multiplier.toLocaleString() }) }}
      </div>
      <div class="k-val k-val--accent">
        {{ rate(report.summary.rate) }}
      </div>
      <div class="k-hint">
        {{ t('components.incidenceRate.notComparable', 'Not comparable across outcomes').value }}
      </div>
    </div>

    <div
      class="ir-insights__kpi"
      data-testid="ir-kpi-donut"
    >
      <div class="k-label">
        {{ t('ir.results.proportion', 'Cases vs Non-Cases').value }}
      </div>
      <div class="ir-insights__donut-wrap">
        <svg
          viewBox="0 0 80 80"
          class="ir-insights__donut"
        >
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            class="ir-insights__donut-track"
            stroke-width="10"
          />
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            class="ir-insights__donut-value"
            stroke-width="10"
            :stroke-dasharray="`${casesArc} ${188.5 - casesArc}`"
            stroke-dashoffset="47.1"
            stroke-linecap="round"
          />
          <text
            x="40"
            y="42"
            text-anchor="middle"
            dominant-baseline="middle"
            class="ir-insights__donut-label"
          >{{ casePct }}</text>
        </svg>
      </div>
    </div>

    <template v-if="report.stratifyStats.length > 0">
      <div class="ir-insights__label">
        {{ t('ir.results.stratifyRule', 'Stratification').value }}
      </div>
      <table
        class="ir-insights__strata"
        data-testid="ir-insights-strata"
      >
        <thead>
          <tr>
            <th>{{ t('ir.results.stratifyRule', 'Stratum').value }}</th>
            <th class="num">
              {{ t('ir.results.cases', 'Cases').value }}
            </th>
            <th class="num">
              {{ t('ir.results.rate', 'Rate').value }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in sortedStrata"
            :key="r.id"
          >
            <td>{{ r.name }}</td>
            <td class="num">
              {{ format(r.cases) }}
            </td>
            <td class="num">
              {{ rate(r.cases / Math.max(r.timeAtRisk / 365.25, 1)) }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { IncidenceRateReport } from '@/models/incidence-rate.types'

const props = defineProps<{ report: IncidenceRateReport; multiplier: number }>()
const { t, tv } = useI18n()

const sortedStrata = computed(() =>
  [...props.report.stratifyStats].sort((a, b) => {
    const ra = a.cases / Math.max(a.timeAtRisk / 365.25, 1)
    const rb = b.cases / Math.max(b.timeAtRisk / 365.25, 1)
    return rb - ra
  })
)

const propPct = computed(() =>
  tv('components.incidenceRate.percentProportion', '{value}% proportion', {
    value: (props.report.summary.proportion * 100).toFixed(1),
  })
)

const casePct = computed(() => {
  const p = props.report.summary.proportion * 100
  return `${p.toFixed(1)}%`
})
const casesArc = computed(() => {
  const p = Math.min(props.report.summary.proportion, 1)
  return p * 188.5
})

function format(n: number | null | undefined) {
  return n == null ? '—' : Math.round(n).toLocaleString()
}
function formatYears(days: number | null | undefined) {
  return days == null ? '—' : Math.round(days / 365.25).toLocaleString()
}
function rate(r: number) {
  return (r * props.multiplier).toFixed(2)
}
</script>

<style scoped>
.ir-insights {
  padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
  overflow-y: auto;
}
.ir-insights__label {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface));
  margin: 8px 0 4px;
}
.ir-insights__kpi {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 8px;
  padding: 8px 10px;
}
.k-label {
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em;
  color: rgba(var(--v-theme-on-surface), 0.55); font-weight: 700;
}
.k-val { font-size: 18px; font-weight: 600; line-height: 1.1; margin-top: 2px; }
.k-val--accent { color: rgb(var(--v-theme-orange)); }
.k-hint { font-size: 10px; color: rgba(var(--v-theme-on-surface), 0.55); margin-top: 1px; }
.ir-insights__donut-wrap { display: flex; justify-content: center; padding: 4px 0; }
.ir-insights__donut { width: 80px; height: 80px; }
.ir-insights__donut-track { stroke: rgba(var(--v-theme-on-surface), 0.08); }
.ir-insights__donut-value { stroke: rgb(var(--v-theme-orange)); }
.ir-insights__donut-label { font-size: 12px; font-weight: 600; fill: rgb(var(--v-theme-on-surface)); }
.ir-insights__strata { width: 100%; border-collapse: collapse; font-size: 10px; }
.ir-insights__strata th, .ir-insights__strata td {
  text-align: left; padding: 4px 6px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.ir-insights__strata th {
  font-weight: 600; color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em;
}
.ir-insights__strata td.num,
.ir-insights__strata th.num { text-align: right; font-variant-numeric: tabular-nums; }
</style>
