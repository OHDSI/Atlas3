<template>
  <AtlasCard
    padding="none"
    class="distribution-table"
    :data-testid="`char-results-distribution-${analysisId}`"
  >
    <div class="distribution-table__header">
      <button
        class="distribution-table__eyebrow-row distribution-table__toggle"
        type="button"
        :aria-expanded="expanded"
        :aria-controls="`char-results-distribution-content-${analysisId}`"
        @click="emit('update:expanded', !expanded)"
      >
        <AtlasIcon
          icon="mdi-chevron-down"
          size="18"
          class="distribution-table__chevron"
          :class="{ 'distribution-table__chevron--collapsed': !expanded }"
        />
        <span class="text-eyebrow">{{ analysisName }}</span>
        <span class="distribution-table__accent-rule" />
      </button>
      <h3
        v-if="expanded"
        class="distribution-table__title"
      >
        {{ tv('characterizations.results.table.distribution') }}
        <span class="distribution-table__count">({{ rows.length }})</span>
      </h3>
    </div>

    <template v-if="expanded">
      <div
        :id="`char-results-distribution-content-${analysisId}`"
      >
        <div
          v-for="table in tables"
          :key="table.key"
          class="distribution-table__wrap"
          :data-testid="`char-results-distribution-table-${analysisId}-${table.key}`"
        >
          <h4
            v-if="tables.length > 1"
            class="distribution-table__partition-title"
          >
            {{ table.label }}
          </h4>
          <ResultsDataTable
            v-model:page="page"
            v-model:page-size="pageSize"
            v-model:sort-by="sortBy"
            :headers="table.headers"
            :items="rows"
            item-value="covariateId"
          >
            <template #item.conceptId="{ item }">
              {{ item.conceptId || '—' }}
            </template>
            <template
              v-for="cell in table.cells"
              #[`item.${cell.key}`]="{ item }"
            >
              {{ cell.format(item) }}
            </template>
          </ResultsDataTable>
        </div>
      </div>
    </template>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { DEFAULT_STRATA_KEY, strataCount } from '@/utils/characterization-result-mapper'
import type { DistributionStat, LinkedCohort, StrataCounts } from '@/models/characterization.types'
import { AtlasCard, AtlasIcon } from '@/components/ui'
import ResultsDataTable, { type ResultsHeader, type ResultsSortItem } from './ResultsDataTable.vue'

interface Props {
  analysisId: number
  analysisName: string
  rows: DistributionStat[]
  cohorts: LinkedCohort[]
  /** Person count per cohort and subgroup, shown as "(N=…)" in the column headers. */
  strataCounts?: StrataCounts
  expanded?: boolean
}

interface Partition {
  key: string
  label: string
}

type StatisticField = 'count' | 'avg' | 'min' | 'p25' | 'median' | 'p75' | 'max'

interface Statistic {
  /** The row field this column sorts by. */
  field: StatisticField
  label: string
  format: (row: DistributionStat, partitionKey: string, cohortId: number) => string
}

const props = withDefaults(defineProps<Props>(), { strataCounts: () => ({}), expanded: true })
const emit = defineEmits<{ 'update:expanded': [value: boolean] }>()
const { tv } = useI18n()

// Shared by every partition table in the card so their rows stay aligned.
const page = ref(1)
const pageSize = ref(15)
const sortBy = ref<ResultsSortItem[]>([])

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

function formatCount(row: DistributionStat, partitionKey: string, cohortId: number): string {
  const persons = row.count ? value(row.count, partitionKey, cohortId) : undefined
  return typeof persons === 'number' && Number.isFinite(persons) ? persons.toLocaleString() : '—'
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
  { field: 'count', label: tv('columns.personsCount'), format: formatCount },
  { field: 'avg', label: tv('characterizations.results.table.avgSd'), format: formatAvgSd },
  { field: 'min', label: tv('characterizations.results.table.min'), format: (row, key, cohortId) => formatStatistic(row.min, key, cohortId) },
  { field: 'p25', label: tv('columns.p25'), format: (row, key, cohortId) => formatStatistic(row.p25, key, cohortId) },
  { field: 'median', label: tv('columns.median'), format: (row, key, cohortId) => formatStatistic(row.median, key, cohortId) },
  { field: 'p75', label: tv('columns.p75'), format: (row, key, cohortId) => formatStatistic(row.p75, key, cohortId) },
  { field: 'max', label: tv('columns.max'), format: (row, key, cohortId) => formatStatistic(row.max, key, cohortId) },
])

const partitions = computed<Partition[]>(() => {
  const names = new Map<string, string>()
  for (const row of props.rows) {
    for (const values of [row.count ?? {}, row.avg, row.stdDev, row.min, row.p25, row.median, row.p75, row.max]) {
      for (const key of Object.keys(values)) {
        names.set(key, isOverall(key)
          ? tv('components.characterizationTable1.overall')
          : (row.strataNames[key] ?? key))
      }
    }
  }
  return Array.from(names, ([key, label]) => ({ key, label }))
    .sort((a, b) => Number(isOverall(b.key)) - Number(isOverall(a.key)))
})

/**
 * One column per statistic for a partition and cohort. The key is the path
 * to the value in the row (`median.<partition>.<cohort>`; strata ids are
 * numeric), so v-data-table sorts by it directly, in every table that shares
 * `sortBy`.
 */
function statisticCells(partitionKey: string, cohortId: number) {
  return statistics.value.map(statistic => ({
    key: `${statistic.field}.${partitionKey}.${cohortId}`,
    title: statistic.label,
    align: 'end',
    format: (row: DistributionStat) => statistic.format(row, partitionKey, cohortId),
  }))
}

function withN(label: string, cohortId: number, partitionKey: string): string {
  const n = strataCount(props.strataCounts, cohortId, partitionKey)
  return n === undefined
    ? label
    : tv('components.characterizationResults.columnWithN', { label, n: n.toLocaleString() })
}

const tables = computed(() => partitions.value.map(partition => {
  const groups = props.cohorts.map(cohort => ({
    key: `cohort-${cohort.id}`,
    title: withN(cohort.name, cohort.id, partition.key),
    align: 'center',
    children: statisticCells(partition.key, cohort.id),
  }))
  const headers: ResultsHeader[] = [
    { key: 'covariateName', title: tv('columns.covariate'), sortable: false },
    { key: 'conceptId', title: tv('columns.conceptId'), sortable: false },
    ...groups,
  ]
  return { ...partition, headers, cells: groups.flatMap(group => group.children) }
}))
</script>

<style scoped>
.distribution-table { margin-bottom: 16px; }
.distribution-table__header { padding: 20px 20px 12px; }
.distribution-table__eyebrow-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.distribution-table__toggle { background: transparent; border: 0; cursor: pointer; padding: 0; }
.distribution-table__toggle:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.distribution-table__chevron { color: rgba(var(--v-theme-on-surface), 0.62); transition: transform 0.15s ease; }
.distribution-table__chevron--collapsed { transform: rotate(-90deg); }
.distribution-table__accent-rule { width: 28px; height: 2px; background-color: rgb(var(--v-theme-orange)); }
.distribution-table__title { display: flex; align-items: baseline; gap: 8px; font-size: 18px; font-weight: 500; margin: 0; color: rgb(var(--v-theme-primary)); }
.distribution-table__count { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.6); font-weight: 400; }
.distribution-table__wrap { overflow-x: auto; padding: 0 20px 20px; }
.distribution-table__partition-title { font-size: 13px; margin: 0 0 8px; }
</style>