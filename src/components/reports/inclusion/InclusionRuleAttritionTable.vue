<template>
  <div
    v-if="rules.length > 0"
    class="attrition-table"
    data-testid="inclusion-attrition-table"
  >
    <table class="attrition-table__grid">
      <thead>
        <tr>
          <th class="attrition-table__col-idx">#</th>
          <th class="attrition-table__col-name">{{ t('cohortDefinitions.cohort.modals.cohortReport.includedIn', 'Inclusion rule').value }}</th>
          <th class="attrition-table__col-num">{{ t('cohortDefinitions.cohort.modals.cohortReport.satisfying', 'Persons satisfying').value }}</th>
          <th class="attrition-table__col-num">% remaining</th>
          <th class="attrition-table__col-num">% excluded</th>
          <th class="attrition-table__col-bar" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(rule, idx) in rules"
          :key="rule.id"
          data-testid="inclusion-attrition-row"
        >
          <td class="attrition-table__col-idx">{{ idx + 1 }}</td>
          <td class="attrition-table__col-name">{{ rule.name }}</td>
          <td class="attrition-table__col-num">{{ formatCount(rule.countSatisfying) }}</td>
          <td class="attrition-table__col-num">{{ formatPercent(rule.percentSatisfying) }}</td>
          <td class="attrition-table__col-num">{{ formatPercent(rule.percentExcluded) }}</td>
          <td class="attrition-table__col-bar">
            <div class="attrition-table__bar-track">
              <div
                class="attrition-table__bar-fill"
                :style="barStyle(rule.percentSatisfying)"
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
    {{ t('cohortDefinitions.cohort.modals.cohortReport.noRules', 'This cohort has no inclusion rules to report.').value }}
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { InclusionRuleStatistic } from '@/models/report.types'

const { t } = useI18n()

defineProps<{ rules: InclusionRuleStatistic[] }>()

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

// Color scale matches Atlas 2.15: red (low) → orange → yellow → green (high)
function barStyle(percentSatisfying: string): Record<string, string> {
  const n = Math.max(0, Math.min(100, Number.parseFloat(percentSatisfying) || 0))
  const color =
    n < 10 ? '#FF3D19' :
    n < 25 ? '#E77F13' :
    n < 50 ? '#C9C40D' :
    n < 75 ? '#95B90A' :
    '#7BB209'
  return { width: `${n}%`, background: color }
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
.attrition-table__col-idx { width: 36px; text-align: right; color: rgba(0, 0, 0, 0.54); }
.attrition-table__col-num { width: 130px; text-align: right; font-variant-numeric: tabular-nums; }
.attrition-table__col-bar { width: 200px; }

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
  transition: width 0.3s ease, background 0.3s ease;
}
</style>
