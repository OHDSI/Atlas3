<template>
  <AtlasCard
    padding="none"
    class="char-t1"
    data-testid="char-t1"
  >
    <header class="char-t1__header">
      <span class="text-eyebrow">{{ tv('cc.viewEdit.workbench.table1.eyebrow', 'Run summary') }}</span>
      <h3 class="char-t1__title">
        {{ tv('cc.viewEdit.workbench.table1.title', 'Baseline Characteristics') }}
      </h3>
    </header>

    <div
      v-if="rows.length === 0"
      class="char-t1__empty"
      data-testid="char-t1-empty"
    >
      {{ tv('common.noData', 'No rows match the current filter.') }}
    </div>

    <div
      v-else
      class="char-t1__table-wrap"
    >
      <table class="char-t1__table">
        <thead>
          <tr>
            <th class="char-t1__col-label">
              {{ tv('columns.covariate', 'Covariate') }}
            </th>
            <th
              v-if="showOverall"
              class="char-t1__col-value"
            >
              {{ tv('components.characterizationTable1.overall', 'Overall') }}
              <div class="char-t1__col-hint">
                {{ tv('components.characterizationTable1.colHint', 'N (%) / Mean (SD)') }}
              </div>
            </th>
            <th
              v-for="col in columns"
              :key="col.cohortKey"
              class="char-t1__col-value"
              data-testid="char-t1-cohort-header"
            >
              {{ col.cohortName }}
              <div class="char-t1__col-hint">
                {{ tv('components.characterizationTable1.colHint', 'N (%) / Mean (SD)') }}
              </div>
            </th>
            <th
              v-if="includeStdDiff"
              class="char-t1__col-value"
              data-testid="char-t1-stddiff-header"
            >
              {{ tv('characterizations.results.table.stdDiff', 'Std Diff') }}
            </th>
            <th class="char-t1__col-action" />
          </tr>
        </thead>
        <tbody>
          <tr class="char-t1__row char-t1__row--total">
            <td class="char-t1__cell-label">
              <strong>{{ tv('components.characterizationTable1.n', 'N') }}</strong>
            </td>
            <td
              v-if="showOverall"
              class="char-t1__cell-value"
            >
              <strong>{{ overallN.toLocaleString() }}</strong>
            </td>
            <td
              v-for="col in columns"
              :key="'n-' + col.cohortKey"
              class="char-t1__cell-value"
            >
              <strong>{{ cohortN(col.cohortKey) }}</strong>
            </td>
            <td
              v-if="includeStdDiff"
              class="char-t1__cell-value"
            />
            <td class="char-t1__cell-action" />
          </tr>

          <template
            v-for="row in rows"
            :key="rowKey(row)"
          >
            <tr
              v-if="row.kind === 'group'"
              class="char-t1__group"
            >
              <td :colspan="totalColumnCount">
                {{ row.label }}
              </td>
            </tr>
            <tr
              v-else
              class="char-t1__row"
            >
              <td class="char-t1__cell-label">
                {{ row.label }}
              </td>
              <td
                v-if="showOverall"
                class="char-t1__cell-value"
              >
                {{ formatOverall(row) }}
              </td>
              <td
                v-for="col in columns"
                :key="col.cohortKey"
                class="char-t1__cell-value"
              >
                {{ formatCell(row, col.cohortKey) }}
              </td>
              <td
                v-if="includeStdDiff"
                class="char-t1__cell-value"
                :class="{ 'char-t1__cell-stddiff--high': isHighStdDiff(row) }"
              >
                {{ formatStdDiff(row) }}
              </td>
              <td class="char-t1__cell-action">
                <AtlasIconButton
                  v-if="row.kind === 'binary'"
                  icon="mdi-magnify"
                  size="sm"
                  variant="text"
                  v-bind="{ ariaLabel: tv('columns.explore', 'Explore') }"
                  data-testid="char-t1-explore"
                  @click="$emit('explore', row._source)"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { AtlasCard, AtlasIconButton } from '@/components/ui'
import { buildTable1, deriveCohortSizes } from '@/utils/characterization-table1'
import type {
  DistributionStat,
  LinkedCohort,
  PrevalenceStat,
  Table1Config,
  Table1Filters,
  Table1Row,
} from '@/models/characterization.types'

const props = defineProps<{
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
  cohorts: LinkedCohort[]
  config: Table1Config
  filters: Table1Filters
  cohortSizes?: Record<string, number>
}>()

defineEmits<{ explore: [row: PrevalenceStat] }>()

const { tv } = useI18n()

const built = computed(() =>
  buildTable1({
    prevalence: props.prevalence,
    distribution: props.distribution,
    cohorts: props.cohorts,
    config: props.config,
    filters: props.filters,
    cohortSizes: props.cohortSizes,
  })
)

const rows = computed<Table1Row[]>(() => built.value.rows)
const columns = computed(() => built.value.columns)
const includeStdDiff = computed<boolean>(() => built.value.includeStdDiff)
const showOverall = computed(() => props.cohorts.length > 1)

const sizes = computed(() => {
  if (props.cohortSizes && Object.keys(props.cohortSizes).length > 0) return props.cohortSizes
  return deriveCohortSizes({ prevalence: props.prevalence, cohorts: props.cohorts })
})

const overallN = computed(() =>
  Object.values(sizes.value).reduce((s, n) => s + n, 0)
)

function cohortN(key: string): string {
  const n = sizes.value[key]
  return typeof n === 'number' ? n.toLocaleString() : '—'
}

const totalColumnCount = computed(() =>
  1 + (showOverall.value ? 1 : 0) + columns.value.length + (includeStdDiff.value ? 1 : 0) + 1
)

function rowKey(row: Table1Row): string {
  if (row.kind === 'group') return `g-${row.analysisId}`
  return `${row.kind}-${row.analysisId}-${row.covariateId}`
}

function formatCell(row: Table1Row, key: string): string {
  if (row.kind === 'binary') {
    const c = row.cells[key]
    if (!c) return '—'
    return `${c.count.toLocaleString()} (${c.pct.toFixed(1)}%)`
  }
  if (row.kind === 'continuous') {
    const c = row.cells[key]
    if (!c) return '—'
    if (row.stat === 'median-iqr') return `${c.primary.toFixed(1)} [${c.secondary.toFixed(1)}]`
    return `${c.primary.toFixed(1)} (${c.secondary.toFixed(1)})`
  }
  return ''
}

function formatOverall(row: Table1Row): string {
  if (row.kind === 'binary') {
    let totalCount = 0
    let totalN = 0
    for (const col of columns.value) {
      const c = row.cells[col.cohortKey]
      if (c) totalCount += c.count
      const n = sizes.value[col.cohortKey]
      if (typeof n === 'number') totalN += n
    }
    if (totalN === 0) return '—'
    const pct = (totalCount / totalN) * 100
    return `${totalCount.toLocaleString()} (${pct.toFixed(1)}%)`
  }
  if (row.kind === 'continuous') {
    let sumVal = 0
    let count = 0
    for (const col of columns.value) {
      const c = row.cells[col.cohortKey]
      if (c) {
        sumVal += c.primary
        count++
      }
    }
    if (count === 0) return '—'
    return `${(sumVal / count).toFixed(1)}`
  }
  return ''
}

function formatStdDiff(row: Table1Row): string {
  if (row.kind === 'binary' && typeof row.stdDiff === 'number') return row.stdDiff.toFixed(4)
  return '—'
}

function isHighStdDiff(row: Table1Row): boolean {
  return (
    row.kind === 'binary' && typeof row.stdDiff === 'number' && Math.abs(row.stdDiff) >= 0.1
  )
}
</script>

<style scoped>
.char-t1 {
  margin-bottom: 0;
}
.char-t1__header {
  padding: 16px 20px 8px;
}
.char-t1__title {
  font-size: 16px;
  font-weight: 500;
  margin: 4px 0 0;
  color: rgb(var(--v-theme-primary));
}
.char-t1__empty {
  padding: 32px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 13px;
}
.char-t1__table-wrap {
  overflow-x: auto;
}
.char-t1__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.char-t1__table th,
.char-t1__table td {
  padding: 5px 10px;
  vertical-align: top;
}
.char-t1__table thead th {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), 0.7);
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-bottom: 2px solid rgba(var(--v-theme-on-surface), 0.15);
  text-align: right;
  font-weight: 700;
  white-space: nowrap;
}
.char-t1__table thead th.char-t1__col-label {
  text-align: left;
}
.char-t1__col-hint {
  font-size: 9px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin-top: 2px;
}
.char-t1__col-action {
  width: 40px;
}
.char-t1__group td {
  background: rgba(var(--v-theme-orange), 0.06);
  font-weight: 600;
  font-size: 12px;
  color: rgb(var(--v-theme-orange));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.char-t1__cell-value {
  text-align: right;
  white-space: nowrap;
}
.char-t1__cell-action {
  text-align: center;
  width: 40px;
}
.char-t1__cell-label {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.char-t1__cell-stddiff--high {
  color: rgb(var(--v-theme-error));
  font-weight: 600;
}
.char-t1__row--total td {
  border-bottom: 2px solid rgba(var(--v-theme-on-surface), 0.15);
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.char-t1__row {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
</style>
