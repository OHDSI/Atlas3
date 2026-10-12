<template>
  <AtlasCard
    padding="none"
    class="prevalence-table"
    :data-testid="`char-results-prevalence-${analysisId}`"
  >
    <div class="prevalence-table__header">
      <button
        class="prevalence-table__eyebrow-row prevalence-table__toggle"
        type="button"
        :aria-expanded="expanded"
        :aria-controls="`char-results-prevalence-content-${analysisId}`"
        :data-testid="`char-results-prevalence-toggle-${analysisId}`"
        @click="emit('update:expanded', !expanded)"
      >
        <AtlasIcon
          icon="mdi-chevron-down"
          size="18"
          class="prevalence-table__chevron"
          :class="{ 'prevalence-table__chevron--collapsed': !expanded }"
        />
        <span class="text-eyebrow">{{ analysisName }}</span>
        <span class="prevalence-table__accent-rule" />
      </button>
      <h3
        v-if="expanded"
        class="prevalence-table__title"
      >
        {{ tv('characterizations.results.table.prevalence', 'Prevalence') }}
        <span class="prevalence-table__count">({{ rows.length }})</span>
      </h3>
    </div>

    <template v-if="expanded">
      <div
        :id="`char-results-prevalence-content-${analysisId}`"
      >
        <div
          v-for="table in tables"
          :key="table.key"
          class="prevalence-table__wrap"
          :data-testid="`char-results-prevalence-table-${analysisId}-${table.key}`"
        >
          <h4
            v-if="table.label"
            class="prevalence-table__partition-title"
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
            class="prevalence-table__table"
          >
            <template #item.covariateName="{ item }">
              <span
                class="prevalence-table__covariate"
                :title="item.covariateName"
              >
                {{ item.covariateName }}
              </span>
            </template>
            <template #item.conceptId="{ item }">
              {{ item.conceptId || '—' }}
            </template>
            <template
              v-for="cell in table.cells"
              #[`item.${cell.key}`]="{ item }"
            >
              {{ cell.format(item) }}
            </template>
            <template #item.stdDiff="{ item }">
              <span :data-testid="`char-results-stddiff-${item.covariateId}-${table.partitionKey}`">
                {{ formatStdDiff(item, table.partitionKey) }}
              </span>
            </template>
            <template #item.actions="{ item }">
              <AtlasIconButton
                icon="mdi-magnify"
                size="sm"
                variant="text"
                v-bind="{ ariaLabel: tv('columns.explore', 'Explore') }"
                class="prevalence-table__explore-button"
                :data-testid="`char-results-explore-${item.covariateId}`"
                @click="emit('explore', item)"
              />
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
import { computeBinaryStdDiff, DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { LinkedCohort, PrevalenceStat } from '@/models/characterization.types'
import { AtlasCard, AtlasIcon, AtlasIconButton } from '@/components/ui'
import ResultsDataTable, { type ResultsHeader, type ResultsSortItem } from './ResultsDataTable.vue'

interface Props {
  analysisId: number
  analysisName: string
  rows: PrevalenceStat[]
  cohorts: LinkedCohort[]
  selectedCohortIds?: number[]
  expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectedCohortIds: () => [],
  expanded: true,
})
const emit = defineEmits<{
  (e: 'explore', row: PrevalenceStat): void
  (e: 'update:expanded', value: boolean): void
}>()
const { tv } = useI18n()

// Shared by every table in the card so their rows stay aligned.
const page = ref(1)
const pageSize = ref(15)
const sortBy = ref<ResultsSortItem[]>([])

interface Partition { key: string; label: string }
interface Cell { key: string; format: (row: PrevalenceStat) => string }
interface RenderTable {
  key: string
  label?: string
  partitionKey: string
  headers: ResultsHeader[]
  cells: Cell[]
}

const effectiveCohorts = computed(() => {
  if (!props.selectedCohortIds?.length) return props.cohorts
  return props.cohorts.filter(cohort => props.selectedCohortIds?.includes(cohort.id))
})

const comparisonMode = computed(() => effectiveCohorts.value.length === 2)

function isOverall(key: string): boolean {
  return key === DEFAULT_STRATA_KEY || key === '0'
}

const partitions = computed<Partition[]>(() => {
  const names = new Map<string, string>()
  for (const row of props.rows) {
    for (const key of new Set([...Object.keys(row.count), ...Object.keys(row.pct)])) {
      names.set(key, isOverall(key)
        ? tv('components.characterizationTable1.overall', 'Overall')
        : (row.strataNames?.[key] ?? key))
    }
  }
  return Array.from(names, ([key, label]) => ({ key, label }))
    .sort((a, b) => Number(isOverall(b.key)) - Number(isOverall(a.key)))
})

/**
 * Count and Pct columns for one partition and cohort. The key is the path to
 * the value in the row (`count.<partition>.<cohort>`; strata ids are numeric),
 * so v-data-table sorts by it directly, in every table that shares `sortBy`.
 */
function metricCells(partitionKey: string, cohortId: number) {
  const metrics = [
    { field: 'count', title: tv('columns.count', 'Count'), format: formatCount },
    { field: 'pct', title: tv('columns.pct', 'Pct'), format: formatPercent },
  ] as const
  return metrics.map(metric => ({
    key: `${metric.field}.${partitionKey}.${cohortId}`,
    title: metric.title,
    align: 'end',
    width: 112,
    headerProps: {
      class: 'prevalence-table__numeric prevalence-table__metric',
      'data-testid': `char-results-sort-${metric.field}-${props.analysisId}-${partitionKey}-${cohortId}`,
    },
    cellProps: { class: 'prevalence-table__metric' },
    format: (row: PrevalenceStat) => metric.format(value(row[metric.field], partitionKey, cohortId)),
  }))
}

function buildTable(key: string, label: string, partitionKey: string, groups: { title: string; cells: ReturnType<typeof metricCells> }[]): RenderTable {
  return {
    key,
    label,
    partitionKey,
    headers: [
      { key: 'covariateName', title: tv('columns.covariate', 'Covariate'), sortable: false },
      {
        key: 'conceptId',
        title: tv('columns.conceptId', 'Concept ID'),
        sortable: false,
        width: 112,
        headerProps: { class: 'prevalence-table__concept' },
        cellProps: { class: 'prevalence-table__concept' },
      },
      ...groups.map((group, index) => ({ key: `group-${index}`, title: group.title, align: 'center', children: group.cells })),
      ...(comparisonMode.value
        ? [{ key: 'stdDiff', title: tv('characterizations.results.table.stdDiff', 'Std Diff'), sortable: false, width: 72 }]
        : []),
      {
        key: 'actions',
        title: '',
        sortable: false,
        width: 44,
        headerProps: { class: 'prevalence-table__action' },
        cellProps: { class: 'prevalence-table__action' },
      },
    ],
    cells: groups.flatMap(group => group.cells),
  }
}

const tables = computed<RenderTable[]>(() => {
  if (comparisonMode.value) {
    return partitions.value.map(partition => buildTable(
      `comparison-${partition.key}`,
      partition.label,
      partition.key,
      effectiveCohorts.value.map(cohort => ({ title: cohort.name, cells: metricCells(partition.key, cohort.id) }))
    ))
  }
  return effectiveCohorts.value.map(cohort => buildTable(
    `cohort-${cohort.id}`,
    cohort.name,
    DEFAULT_STRATA_KEY,
    partitions.value.map(partition => ({ title: partition.label, cells: metricCells(partition.key, cohort.id) }))
  ))
})

function value(
  values: Record<string, Record<string, number>>,
  partitionKey: string,
  cohortId: number
): number | undefined {
  return values[partitionKey]?.[String(cohortId)]
}

function formatCount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—'
}

function formatPercent(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '—'
}

function formatStdDiff(row: PrevalenceStat, partitionKey: string): string {
  const [first, second] = effectiveCohorts.value
  if (!first || !second) return '—'
  const diff = row.stdDiffByStrata?.[partitionKey]
    ?? (isOverall(partitionKey) ? row.stdDiff : undefined)
    ?? computeBinaryStdDiff(
      value(row.pct, partitionKey, first.id),
      value(row.pct, partitionKey, second.id)
    )
  return typeof diff === 'number' && Number.isFinite(diff) ? diff.toFixed(4) : '—'
}
</script>

<style scoped>
.prevalence-table { margin-bottom: 16px; }
.prevalence-table__header { padding: 20px 20px 12px; }
.prevalence-table__eyebrow-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.prevalence-table__toggle { background: transparent; border: 0; cursor: pointer; padding: 0; }
.prevalence-table__toggle:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.prevalence-table__chevron { color: rgba(var(--v-theme-on-surface), 0.62); transition: transform 0.15s ease; }
.prevalence-table__chevron--collapsed { transform: rotate(-90deg); }
.prevalence-table__accent-rule { width: 28px; height: 2px; background-color: rgb(var(--v-theme-orange)); }
.prevalence-table__title { display: flex; align-items: baseline; gap: 8px; font-size: 18px; font-weight: 500; margin: 0; color: rgb(var(--v-theme-primary)); }
.prevalence-table__count { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.6); font-weight: 400; }
.prevalence-table__wrap { overflow-x: auto; padding: 0 20px 20px; }
.prevalence-table__partition-title { font-size: 13px; margin: 0 0 8px; }
.prevalence-table__table :deep(table) { table-layout: fixed; width: 100%; }
.prevalence-table__table :deep(.prevalence-table__action) { padding-left: 0 !important; padding-right: 0 !important; text-align: center !important; }
.prevalence-table :deep(.prevalence-table__explore-button) { height: 24px; min-width: 24px; padding: 0; width: 24px; }
.prevalence-table :deep(.prevalence-table__explore-button .v-icon) { font-size: 16px; }
.prevalence-table__covariate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
