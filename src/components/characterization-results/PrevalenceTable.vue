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
          <table
            class="prevalence-table__table prevalence-table__table--fixed"
            :class="{ 'prevalence-table__table--comparison': comparisonMode }"
          >
            <colgroup>
              <col class="prevalence-table__covariate-col">
              <col class="prevalence-table__concept-col">
              <template
                v-if="comparisonMode"
              >
                <template
                  v-for="cohort in effectiveCohorts"
                  :key="cohort.id"
                >
                  <col class="prevalence-table__metric-col">
                  <col class="prevalence-table__metric-col">
                </template>
                <col class="prevalence-table__std-diff-col">
              </template>
              <template v-else>
                <template
                  v-for="partition in partitions"
                  :key="partition.key"
                >
                  <col class="prevalence-table__metric-col">
                  <col class="prevalence-table__metric-col">
                </template>
              </template>
              <col class="prevalence-table__action-col">
            </colgroup>
            <thead>
              <tr>
                <th
                  rowspan="2"
                  :aria-sort="ariaSort('covariate')"
                >
                  <SortHeaderButton
                    :label="tv('columns.covariate', 'Covariate')"
                    :direction="sortDirection('covariate')"
                    @sort="toggleSort('covariate')"
                  />
                </th>
                <th
                  rowspan="2"
                  class="prevalence-table__concept"
                  :aria-sort="ariaSort('concept')"
                >
                  <SortHeaderButton
                    :label="tv('columns.conceptId', 'Concept ID')"
                    :direction="sortDirection('concept')"
                    @sort="toggleSort('concept', true)"
                  />
                </th>
                <template v-if="comparisonMode">
                  <th
                    v-for="cohort in effectiveCohorts"
                    :key="cohort.id"
                    colspan="2"
                    class="prevalence-table__cohort-header"
                  >
                    {{ cohort.name }}
                  </th>
                  <th
                    rowspan="2"
                    :aria-sort="ariaSort(sortKey('stdDiff', table.partitionKey))"
                  >
                    <SortHeaderButton
                      :label="tv('characterizations.results.table.stdDiff', 'Std Diff')"
                      :direction="sortDirection(sortKey('stdDiff', table.partitionKey))"
                      @sort="toggleSort(sortKey('stdDiff', table.partitionKey), true)"
                    />
                  </th>
                </template>
                <template v-else>
                  <th
                    v-for="partition in partitions"
                    :key="partition.key"
                    colspan="2"
                  >
                    {{ partition.label }}
                  </th>
                </template>
                <th
                  rowspan="2"
                  class="prevalence-table__action"
                />
              </tr>
              <tr>
                <template v-if="comparisonMode">
                  <template
                    v-for="cohort in effectiveCohorts"
                    :key="cohort.id"
                  >
                    <th
                      class="prevalence-table__numeric prevalence-table__metric"
                      :aria-sort="ariaSort(sortKey('count', table.partitionKey, cohort.id))"
                    >
                      <SortHeaderButton
                        :label="tv('columns.count', 'Count')"
                        :direction="sortDirection(sortKey('count', table.partitionKey, cohort.id))"
                        :data-testid="`char-results-sort-count-${analysisId}-${table.partitionKey}-${cohort.id}`"
                        @sort="toggleSort(sortKey('count', table.partitionKey, cohort.id), true)"
                      />
                    </th>
                    <th
                      class="prevalence-table__numeric prevalence-table__metric"
                      :aria-sort="ariaSort(sortKey('pct', table.partitionKey, cohort.id))"
                    >
                      <SortHeaderButton
                        :label="tv('columns.pct', 'Pct')"
                        :direction="sortDirection(sortKey('pct', table.partitionKey, cohort.id))"
                        :data-testid="`char-results-sort-pct-${analysisId}-${table.partitionKey}-${cohort.id}`"
                        @sort="toggleSort(sortKey('pct', table.partitionKey, cohort.id), true)"
                      />
                    </th>
                  </template>
                </template>
                <template v-else>
                  <template
                    v-for="partition in partitions"
                    :key="partition.key"
                  >
                    <th
                      class="prevalence-table__numeric prevalence-table__metric"
                      :aria-sort="ariaSort(sortKey('count', partition.key, table.cohort.id))"
                    >
                      <SortHeaderButton
                        :label="tv('columns.count', 'Count')"
                        :direction="sortDirection(sortKey('count', partition.key, table.cohort.id))"
                        :data-testid="`char-results-sort-count-${analysisId}-${partition.key}-${table.cohort.id}`"
                        @sort="toggleSort(sortKey('count', partition.key, table.cohort.id), true)"
                      />
                    </th>
                    <th
                      class="prevalence-table__numeric prevalence-table__metric"
                      :aria-sort="ariaSort(sortKey('pct', partition.key, table.cohort.id))"
                    >
                      <SortHeaderButton
                        :label="tv('columns.pct', 'Pct')"
                        :direction="sortDirection(sortKey('pct', partition.key, table.cohort.id))"
                        :data-testid="`char-results-sort-pct-${analysisId}-${partition.key}-${table.cohort.id}`"
                        @sort="toggleSort(sortKey('pct', partition.key, table.cohort.id), true)"
                      />
                    </th>
                  </template>
                </template>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in pageRows"
                :key="row.covariateId"
              >
                <td>
                  <span
                    class="prevalence-table__covariate"
                    :title="row.covariateName"
                  >
                    {{ row.covariateName }}
                  </span>
                </td>
                <td class="prevalence-table__concept">
                  {{ row.conceptId || '—' }}
                </td>
                <template v-if="comparisonMode">
                  <template
                    v-for="cohort in effectiveCohorts"
                    :key="cohort.id"
                  >
                    <td class="prevalence-table__numeric prevalence-table__metric">
                      {{ formatCount(value(row.count, table.partitionKey, cohort.id)) }}
                    </td>
                    <td class="prevalence-table__numeric prevalence-table__metric">
                      {{ formatPercent(value(row.pct, table.partitionKey, cohort.id)) }}
                    </td>
                  </template>
                  <td :data-testid="`char-results-stddiff-${row.covariateId}-${table.partitionKey}`">
                    {{ formatStdDiff(row, table.partitionKey) }}
                  </td>
                </template>
                <template v-else>
                  <template
                    v-for="partition in partitions"
                    :key="partition.key"
                  >
                    <td class="prevalence-table__numeric prevalence-table__metric">
                      {{ formatCount(value(row.count, partition.key, table.cohort.id)) }}
                    </td>
                    <td class="prevalence-table__numeric prevalence-table__metric">
                      {{ formatPercent(value(row.pct, partition.key, table.cohort.id)) }}
                    </td>
                  </template>
                </template>
                <td class="prevalence-table__action">
                  <AtlasIconButton
                    icon="mdi-magnify"
                    size="sm"
                    variant="text"
                    v-bind="{ ariaLabel: tv('columns.explore', 'Explore') }"
                    class="prevalence-table__explore-button"
                    :data-testid="`char-results-explore-${row.covariateId}`"
                    @click="emit('explore', row)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <ResultsTablePagination
            v-if="totalPages > 1"
            :page="page"
            :page-size="itemsPerPage"
            :total-items="totalItems"
            @update:page="setPage"
            @update:page-size="setItemsPerPage"
          />
        </div>
      </div>
    </template>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { useSortedPage, type SortValue } from '@/composables/useSortedPage'
import { computeBinaryStdDiff, DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { LinkedCohort, PrevalenceStat } from '@/models/characterization.types'
import { AtlasCard, AtlasIcon, AtlasIconButton } from '@/components/ui'
import ResultsTablePagination from './ResultsTablePagination.vue'
import SortHeaderButton from './SortHeaderButton.vue'

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
interface Partition { key: string; label: string }
interface RenderTable { key: string; label?: string; partitionKey: string; cohort: LinkedCohort }

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

const tables = computed<RenderTable[]>(() => {
  if (comparisonMode.value) {
    return partitions.value.map(partition => ({
      key: `comparison-${partition.key}`,
      label: partition.label,
      partitionKey: partition.key,
      cohort: effectiveCohorts.value[0] as LinkedCohort,
    }))
  }
  return effectiveCohorts.value.map(cohort => ({
    key: `cohort-${cohort.id}`,
    label: cohort.name,
    partitionKey: DEFAULT_STRATA_KEY,
    cohort,
  }))
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

function stdDiff(row: PrevalenceStat, partitionKey: string): number | undefined {
  const [first, second] = effectiveCohorts.value
  if (!first || !second) return undefined
  return row.stdDiffByStrata?.[partitionKey]
    ?? (isOverall(partitionKey) ? row.stdDiff : undefined)
    ?? computeBinaryStdDiff(
      value(row.pct, partitionKey, first.id),
      value(row.pct, partitionKey, second.id)
    )
}

function formatStdDiff(row: PrevalenceStat, partitionKey: string): string {
  const diff = stdDiff(row, partitionKey)
  return typeof diff === 'number' && Number.isFinite(diff) ? diff.toFixed(4) : '—'
}

// Sort keys are `field|partition|cohort`; partition keys never contain '|'.
function sortKey(field: string, partitionKey: string, cohortId?: number): string {
  return cohortId === undefined ? `${field}|${partitionKey}` : `${field}|${partitionKey}|${cohortId}`
}

function sortValue(row: PrevalenceStat, key: string): SortValue {
  if (key === 'covariate') return row.covariateName
  if (key === 'concept') return row.conceptId || undefined
  const [field, partitionKey = '', cohortId] = key.split('|')
  if (field === 'stdDiff') return stdDiff(row, partitionKey)
  if (field === 'count') return value(row.count, partitionKey, Number(cohortId))
  if (field === 'pct') return value(row.pct, partitionKey, Number(cohortId))
  return undefined
}

const {
  page, itemsPerPage, pageRows, totalItems, totalPages,
  toggleSort, sortDirection, ariaSort, setPage, setItemsPerPage,
} = useSortedPage(() => props.rows, sortValue, { defaultItemsPerPage: 15 })
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
.prevalence-table__table { border-collapse: collapse; font-size: 12px; min-width: 100%; }
.prevalence-table__table--fixed { table-layout: fixed; width: 100%; }
.prevalence-table__concept-col,
.prevalence-table__metric-col { width: 112px; }
.prevalence-table__std-diff-col { width: 72px; }
.prevalence-table__action-col { width: 44px; }
.prevalence-table__table th, .prevalence-table__table td { border: 1px solid rgba(var(--v-theme-on-surface), 0.12); padding: 2px 4px; text-align: right; white-space: nowrap; }
.prevalence-table__table thead th { white-space: normal; overflow-wrap: anywhere; }
.prevalence-table__table .prevalence-table__cohort-header { white-space: normal; overflow-wrap: anywhere; }
.prevalence-table__table th:first-child, .prevalence-table__table td:first-child { text-align: left; }
.prevalence-table__concept,
.prevalence-table__metric { box-sizing: border-box; max-width: 112px; min-width: 112px; width: 112px; }
.prevalence-table__action { box-sizing: border-box; max-width: 44px; min-width: 44px; padding-left: 0 !important; padding-right: 0 !important; text-align: center !important; width: 44px; }
.prevalence-table :deep(.prevalence-table__explore-button) { height: 24px; min-width: 24px; padding: 0; width: 24px; }
.prevalence-table :deep(.prevalence-table__explore-button .v-icon) { font-size: 16px; }
.prevalence-table__covariate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prevalence-table__table thead th { background: rgba(var(--v-theme-on-surface), 0.03); font-weight: 600; }
.prevalence-table__table thead .prevalence-table__numeric { text-align: right; }
</style>
