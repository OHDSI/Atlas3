<template>
  <AtlasCard
    padding="none"
    class="distribution-table"
    :data-testid="`char-results-distribution-${analysisId}`"
  >
    <div class="distribution-table__header">
      <div class="distribution-table__eyebrow-row">
        <span class="text-eyebrow">{{ analysisName }}</span>
        <span class="distribution-table__accent-rule" />
      </div>
      <h3 class="distribution-table__title">
        {{ tv('characterizations.results.table.distribution', 'Distribution') }}
        <span class="distribution-table__count">({{ rows.length }})</span>
      </h3>
    </div>

    <div
      v-for="partition in partitions"
      :key="partition.key"
      class="distribution-table__wrap"
      :data-testid="`char-results-distribution-table-${analysisId}-${partition.key}`"
    >
      <h4
        v-if="partitions.length > 1"
        class="distribution-table__partition-title"
      >
        {{ partition.label }}
      </h4>
      <table class="distribution-table__table">
        <thead>
          <tr>
            <th rowspan="2">
              {{ tv('columns.covariate', 'Covariate') }}
            </th>
            <th rowspan="2">
              {{ tv('columns.conceptId', 'Concept ID') }}
            </th>
            <th
              v-for="cohort in cohorts"
              :key="cohort.id"
              :colspan="statistics.length"
            >
              {{ cohort.name }}
            </th>
          </tr>
          <tr>
            <template
              v-for="cohort in cohorts"
              :key="cohort.id"
            >
              <th
                v-for="statistic in statistics"
                :key="statistic.key"
                class="distribution-table__numeric"
              >
                {{ statistic.label }}
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.covariateId"
          >
            <td>{{ row.covariateName }}</td>
            <td>{{ row.conceptId || '—' }}</td>
            <template
              v-for="cohort in cohorts"
              :key="cohort.id"
            >
              <td
                v-for="statistic in statistics"
                :key="statistic.key"
                class="distribution-table__numeric"
              >
                {{ statistic.format(row, partition.key, cohort.id) }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { DistributionStat, LinkedCohort } from '@/models/characterization.types'
import { AtlasCard } from '@/components/ui'

interface Props {
  analysisId: number
  analysisName: string
  rows: DistributionStat[]
  cohorts: LinkedCohort[]
}

interface Partition {
  key: string
  label: string
}

interface Statistic {
  key: string
  label: string
  format: (row: DistributionStat, partitionKey: string, cohortId: number) => string
}

const props = defineProps<Props>()
const { tv } = useI18n()

function isOverall(key: string): boolean {
  return key === DEFAULT_STRATA_KEY || key === '0'
}

function value(
  values: Record<string, Record<string, number>>,
  partitionKey: string,
  cohortId: number,
): number | undefined {
  return values[partitionKey]?.[String(cohortId)]
}

function formatValue(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—'
}

function formatAvgSd(row: DistributionStat, partitionKey: string, cohortId: number): string {
  const average = value(row.avg, partitionKey, cohortId)
  const standardDeviation = value(row.stdDev, partitionKey, cohortId)
  if (average === undefined && standardDeviation === undefined) return '—'
  return `${formatValue(average)} (${formatValue(standardDeviation)})`
}

function formatStatistic(
  values: Record<string, Record<string, number>>,
  partitionKey: string,
  cohortId: number,
): string {
  return formatValue(value(values, partitionKey, cohortId))
}

const statistics = computed<Statistic[]>(() => [
  { key: 'avgSd', label: 'Avg (SD)', format: formatAvgSd },
  { key: 'min', label: tv('characterizations.results.table.min', 'Min'), format: (row, key, cohortId) => formatStatistic(row.min, key, cohortId) },
  { key: 'p25', label: tv('columns.p25', 'P25'), format: (row, key, cohortId) => formatStatistic(row.p25, key, cohortId) },
  { key: 'median', label: tv('columns.median', 'Median'), format: (row, key, cohortId) => formatStatistic(row.median, key, cohortId) },
  { key: 'p75', label: tv('columns.p75', 'P75'), format: (row, key, cohortId) => formatStatistic(row.p75, key, cohortId) },
  { key: 'max', label: tv('columns.max', 'Max'), format: (row, key, cohortId) => formatStatistic(row.max, key, cohortId) },
])

const partitions = computed<Partition[]>(() => {
  const names = new Map<string, string>()
  for (const row of props.rows) {
    for (const values of [row.avg, row.stdDev, row.min, row.p25, row.median, row.p75, row.max]) {
      for (const key of Object.keys(values)) {
        names.set(key, isOverall(key)
          ? tv('components.characterizationTable1.overall', 'Overall')
          : (row.strataNames[key] ?? key))
      }
    }
  }
  return Array.from(names, ([key, label]) => ({ key, label }))
    .sort((a, b) => Number(isOverall(b.key)) - Number(isOverall(a.key)))
})
</script>

<style scoped>
.distribution-table { margin-bottom: 16px; }
.distribution-table__header { padding: 20px 20px 12px; }
.distribution-table__eyebrow-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.distribution-table__accent-rule { width: 28px; height: 2px; background-color: rgb(var(--v-theme-orange)); }
.distribution-table__title { display: flex; align-items: baseline; gap: 8px; font-size: 18px; font-weight: 500; margin: 0; color: rgb(var(--v-theme-primary)); }
.distribution-table__count { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.6); font-weight: 400; }
.distribution-table__wrap { overflow-x: auto; padding: 0 20px 20px; }
.distribution-table__partition-title { font-size: 13px; margin: 0 0 8px; }
.distribution-table__table { border-collapse: collapse; font-size: 12px; min-width: 100%; }
.distribution-table__table th, .distribution-table__table td { border: 1px solid rgba(var(--v-theme-on-surface), 0.12); padding: 6px 8px; text-align: right; white-space: nowrap; }
.distribution-table__table th:first-child, .distribution-table__table td:first-child { text-align: left; }
.distribution-table__table thead th { background: rgba(var(--v-theme-on-surface), 0.03); font-weight: 600; }
.distribution-table__table thead .distribution-table__numeric { text-align: right; }
</style>