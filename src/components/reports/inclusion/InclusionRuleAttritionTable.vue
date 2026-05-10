<template>
  <div
    v-if="rules.length > 0"
    class="attrition-table"
    data-testid="inclusion-attrition-table"
  >
    <table class="attrition-table__grid">
      <thead>
        <tr>
          <th class="attrition-table__col-idx">
            #
          </th>
          <th class="attrition-table__col-name">
            {{ t('components.feasibilityAttritionReport.inclusionRule', 'Inclusion rule').value }}
          </th>
          <th
            v-if="cumulativeRemaining"
            class="attrition-table__col-num"
            data-testid="inclusion-attrition-cumulative-header"
          >
            <span title="Patients remaining after applying this rule and all preceding rules in order">
              Cumulative remaining
            </span>
          </th>
          <th
            v-if="cumulativeRemaining"
            class="attrition-table__col-num"
          >
            <span title="Cumulative remaining as a percent of the initial entry-event count — same metric the funnel uses">
              % of initial
            </span>
          </th>
          <th class="attrition-table__col-num">
            <span title="Patients who satisfy THIS rule independently, regardless of the other rules">
              Persons satisfying
            </span>
          </th>
          <th class="attrition-table__col-num">
            <span title="Percent of the entry-event population who satisfy this rule on its own (independent of order)">
              % satisfying
            </span>
          </th>
          <th class="attrition-table__col-num">
            <span title="Marginal cost of this rule: percent of patients who satisfy every OTHER rule but fail this one. High = removing this rule would recover that share.">
              % excluded
            </span>
          </th>
          <th class="attrition-table__col-bar" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(rule, idx) in rules"
          :key="rule.id"
          data-testid="inclusion-attrition-row"
        >
          <td class="attrition-table__col-idx">
            {{ idx + 1 }}
          </td>
          <td class="attrition-table__col-name">
            {{ rule.name }}
          </td>
          <td
            v-if="cumulativeRemaining"
            class="attrition-table__col-num"
            data-testid="inclusion-attrition-cumulative-cell"
          >
            {{ formatCount(cumulativeRemaining[idx] ?? 0) }}
          </td>
          <td
            v-if="cumulativeRemaining"
            class="attrition-table__col-num"
          >
            {{ cumulativePercentOfInitial(idx) }}
          </td>
          <td class="attrition-table__col-num">
            {{ formatCount(rule.countSatisfying) }}
          </td>
          <td class="attrition-table__col-num">
            {{ formatPercent(rule.percentSatisfying) }}
          </td>
          <td class="attrition-table__col-num">
            {{ formatPercent(rule.percentExcluded) }}
          </td>
          <td class="attrition-table__col-bar">
            <div class="attrition-table__bar-track">
              <div
                class="attrition-table__bar-fill"
                :style="cumulativeRemaining
                  ? cumulativeBarStyle(idx)
                  : barStyle(rule.percentSatisfying)"
                :data-testid="`inclusion-attrition-bar-${idx}`"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div
    v-else
    class="attrition-table__empty text-center py-6 text-grey-darken-1"
    data-testid="inclusion-attrition-empty"
  >
    {{
      t(
        'components.expressionCartoonBindings.noInclusionRules',
        'This cohort has no inclusion rules to report.'
      ).value
    }}
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { InclusionRuleStatistic } from '@/models/report.types'

const { t } = useI18n()

const props = defineProps<{
  rules: InclusionRuleStatistic[]
  /** Per-rule cumulative remaining counts (one entry per rule, in the same order). When provided, an extra column renders. */
  cumulativeRemaining?: number[]
  /**
   * Initial-population baseline (entry events) used to convert cumulative
   * counts into a "% of initial" matching the funnel chart. Without this
   * the table can only show the WebAPI-provided per-rule independent
   * percentages, which use a different denominator than the funnel.
   */
  baseCount?: number
}>()

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatPercent(s: string): string {
  if (!s) return '—'
  // Server returns e.g. "82.50" — strip trailing zeros, append "%"
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return s
  return `${n.toFixed(2)}%`
}

// Tone palette matches the cohort-builder rail and the attrition funnel:
// success ≥ 80%, warning ≥ 40%, error otherwise. Reads the runtime
// Vuetify theme variable so all three views stay visually consistent.
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

function barStyle(percentSatisfying: string): Record<string, string> {
  const n = Math.max(0, Math.min(100, Number.parseFloat(percentSatisfying) || 0))
  const tone: 'success' | 'warning' | 'error' = n >= 80 ? 'success' : n >= 40 ? 'warning' : 'error'
  return { width: `${n}%`, background: themeColor(tone, 0.85) }
}

// When the funnel data is available, color the bar by step-over-step
// retention (matches the cohort-builder rail and the funnel itself) and
// width by cumulative-of-initial. That makes the table read as a
// horizontal mini-funnel: width = where in the attrition we are, color =
// is THIS rule the one cutting hard?
function cumulativePercentOfInitial(idx: number): string {
  const cum = props.cumulativeRemaining?.[idx]
  if (cum === undefined) return '—'
  const base = props.baseCount ?? props.cumulativeRemaining?.[0] ?? cum
  if (!base) return '—'
  // First row: cumulative % equals the WebAPI's percentSatisfying for
  // rule 1 because there's no prior rule. From row 2 on it diverges.
  return `${((cum / base) * 100).toFixed(2)}%`
}

function cumulativeBarStyle(idx: number): Record<string, string> {
  const cum = props.cumulativeRemaining?.[idx]
  if (cum === undefined) return { width: '0%', background: 'transparent' }
  const base = props.baseCount ?? props.cumulativeRemaining?.[0] ?? cum
  if (!base) return { width: '0%', background: 'transparent' }
  const widthPct = (cum / base) * 100
  // Step-over-step retention: cum_i / cum_{i-1} (or /base for row 0).
  const prev = idx === 0 ? base : (props.cumulativeRemaining?.[idx - 1] ?? base)
  const step = prev > 0 ? (cum / prev) * 100 : 0
  const tone: 'success' | 'warning' | 'error' =
    step >= 80 ? 'success' : step >= 40 ? 'warning' : 'error'
  return { width: `${widthPct}%`, background: themeColor(tone, 0.85) }
}
</script>

<style scoped>
.attrition-table__grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.attrition-table__grid th,
.attrition-table__grid td {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  text-align: left;
}
.attrition-table__grid th {
  background: #f5f7fb;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.74);
}
.attrition-table__col-idx {
  width: 36px;
  text-align: right;
  color: rgba(0, 0, 0, 0.54);
}
.attrition-table__col-num {
  width: 130px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.attrition-table__col-bar {
  width: 200px;
}

.attrition-table__bar-track {
  width: 100%;
  height: 12px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  overflow: hidden;
}
.attrition-table__bar-fill {
  height: 100%;
  border-radius: 6px;
  transition:
    width 0.3s ease,
    background 0.3s ease;
}
</style>
