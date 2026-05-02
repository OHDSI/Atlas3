<template>
  <v-table
    density="compact"
    class="ir-rates"
  >
    <thead>
      <tr>
        <th>{{ t('ir.results.stratifyRule', 'Stratum').value }}</th>
        <th class="num">
          {{ t('ir.results.persons', 'Persons').value }}
        </th>
        <th class="num">
          {{ t('ir.results.cases', 'Cases').value }}
        </th>
        <th class="num">
          {{ t('ir.results.timeAtRiskYears', 'TAR (years)').value }}
        </th>
        <th class="num">
          {{ t('ir.results.rate', 'Rate').value }} / {{ multiplier.toLocaleString() }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        data-testid="ir-rate-row"
        class="ir-rates__sum"
      >
        <td><strong>{{ t('ir.results.summaryStatistics', 'Summary').value }}</strong></td>
        <td class="num">
          {{ format(report.summary.totalPersons) }}
        </td>
        <td class="num">
          {{ format(report.summary.cases) }}
        </td>
        <td class="num">
          {{ formatYears(report.summary.timeAtRisk) }}
        </td>
        <td class="num">
          {{ rate(report.summary.rate) }}
        </td>
      </tr>
      <tr
        v-for="row in report.stratifyStats"
        :key="row.id"
        data-testid="ir-rate-row"
      >
        <td>{{ row.name }}</td>
        <td class="num">
          {{ format(row.totalPersons) }}
        </td>
        <td class="num">
          {{ format(row.cases) }}
        </td>
        <td class="num">
          {{ formatYears(row.timeAtRisk) }}
        </td>
        <td class="num">
          {{ rate(row.cases / Math.max(row.timeAtRisk / 365.25, 1)) }}
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { IncidenceRateReport } from '@/models/incidence-rate.types'

const props = defineProps<{ report: IncidenceRateReport; multiplier: number }>()
const { t } = useI18n()

function format(n: number | null | undefined) {
  return n == null ? '—' : Math.round(n).toLocaleString()
}
function formatYears(days: number | null | undefined) {
  return days == null ? '—' : (days / 365.25).toLocaleString(undefined, { maximumFractionDigits: 0 })
}
function rate(r: number) {
  return (r * props.multiplier).toFixed(2)
}
</script>

<style scoped>
.ir-rates :deep(th), .ir-rates :deep(td) { font-size: 11px; }
.ir-rates :deep(.num) { text-align: right; font-variant-numeric: tabular-nums; }
.ir-rates__sum :deep(td) { background: rgba(var(--v-theme-on-surface), 0.04); }
</style>
