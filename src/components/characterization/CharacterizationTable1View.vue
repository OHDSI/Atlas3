<template>
  <SurfaceCard
    padding="none"
    class="char-t1"
    data-testid="char-t1"
  >
    <header class="char-t1__header">
      <span class="text-eyebrow">{{ t('cc.viewEdit.workbench.table1.eyebrow', 'Run summary').value }}</span>
      <h3 class="char-t1__title">
        {{ t('cc.viewEdit.workbench.table1.title', 'Table 1 — Baseline Characteristics').value }}
      </h3>
    </header>

    <div
      v-if="rows.length === 0"
      class="char-t1__empty"
      data-testid="char-t1-empty"
    >
      {{ t('common.noData', 'No rows match the current filter.').value }}
    </div>

    <div
      v-else
      class="char-t1__table-wrap"
    >
      <table class="char-t1__table">
        <thead>
          <tr>
            <th class="char-t1__col-label">{{ t('columns.covariate', 'Covariate').value }}</th>
            <th
              v-for="c in cohortGroupHeaders"
              :key="c.key"
              :colspan="c.span"
              class="char-t1__col-cohort"
              data-testid="char-t1-cohort-header"
            >
              {{ c.label }}
            </th>
            <th
              v-if="includeStdDiff"
              class="char-t1__col-num"
              rowspan="2"
              data-testid="char-t1-stddiff-header"
            >
              {{ t('characterizations.results.table.stdDiff', 'Std Diff').value }}
            </th>
            <th
              class="char-t1__col-num"
              rowspan="2"
            >
              {{ t('columns.explore', 'Explore').value }}
            </th>
          </tr>
          <tr>
            <th></th>
            <template
              v-for="col in columns"
              :key="col.cohortKey"
            >
              <th
                v-if="config.showCounts"
                class="char-t1__col-num"
              >
                {{ t('columns.count', 'N').value }}
              </th>
              <th
                v-if="config.showPercent"
                class="char-t1__col-num"
              >
                {{ t('columns.pct', '%').value }}
              </th>
            </template>
          </tr>
        </thead>
        <tbody>
          <template
            v-for="row in rows"
            :key="rowKey(row)"
          >
            <tr
              v-if="row.kind === 'group'"
              class="char-t1__group"
            >
              <td :colspan="totalColumnCount">{{ row.label }}</td>
            </tr>
            <tr
              v-else
              class="char-t1__row"
            >
              <td class="char-t1__cell-label">{{ row.label }}</td>
              <template
                v-for="col in columns"
                :key="col.cohortKey"
              >
                <td
                  v-if="config.showCounts"
                  class="char-t1__cell-num"
                >
                  {{ formatCount(row, col.cohortKey) }}
                </td>
                <td
                  v-if="config.showPercent"
                  class="char-t1__cell-num"
                >
                  {{ formatPct(row, col.cohortKey) }}
                </td>
              </template>
              <td
                v-if="includeStdDiff"
                class="char-t1__cell-num"
                :class="{ 'char-t1__cell-stddiff--high': isHighStdDiff(row) }"
              >
                {{ formatStdDiff(row) }}
              </td>
              <td class="char-t1__cell-num">
                <v-btn
                  v-if="row.kind === 'binary'"
                  size="x-small"
                  variant="text"
                  density="compact"
                  data-testid="char-t1-explore"
                  @click="$emit('explore', row._source)"
                >🔍</v-btn>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </SurfaceCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import SurfaceCard from '@/components/shared/SurfaceCard.vue'
import { buildTable1 } from '@/utils/characterization-table1'
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
}>()

defineEmits<{ explore: [row: PrevalenceStat] }>()

const { t } = useI18n()

const built = computed(() =>
  buildTable1({
    prevalence: props.prevalence,
    distribution: props.distribution,
    cohorts: props.cohorts,
    config: props.config,
    filters: props.filters,
  })
)

const rows = computed<Table1Row[]>(() => built.value.rows)
const columns = computed(() => built.value.columns)
const includeStdDiff = computed<boolean>(() => built.value.includeStdDiff)

const cohortGroupHeaders = computed(() => {
  const numericCellsPerCohort =
    (props.config.showCounts ? 1 : 0) + (props.config.showPercent ? 1 : 0)
  if (!props.config.strataAsCols) {
    return props.cohorts.map(c => ({
      key: String(c.id),
      label: c.name,
      span: numericCellsPerCohort,
    }))
  }
  const grouped = new Map<number, { label: string; span: number }>()
  for (const col of columns.value) {
    const g = grouped.get(col.cohortId) ?? { label: col.cohortName, span: 0 }
    g.span += numericCellsPerCohort
    grouped.set(col.cohortId, g)
  }
  return Array.from(grouped.entries()).map(([id, g]) => ({
    key: String(id),
    label: g.label,
    span: g.span,
  }))
})

const totalColumnCount = computed(() => {
  const numericCellsPerCohort =
    (props.config.showCounts ? 1 : 0) + (props.config.showPercent ? 1 : 0)
  return (
    1 + columns.value.length * numericCellsPerCohort + (includeStdDiff.value ? 1 : 0) + 1
  )
})

function rowKey(row: Table1Row): string {
  if (row.kind === 'group') return `g-${row.analysisId}`
  return `${row.kind}-${row.analysisId}-${row.covariateId}`
}

function formatCount(row: Table1Row, key: string): string {
  if (row.kind === 'binary') {
    const c = row.cells[key]
    return c ? c.count.toLocaleString() : '—'
  }
  if (row.kind === 'continuous') {
    const c = row.cells[key]
    return c ? c.primary.toFixed(1) : '—'
  }
  return ''
}

function formatPct(row: Table1Row, key: string): string {
  if (row.kind === 'binary') {
    const c = row.cells[key]
    return c ? `${c.pct.toFixed(2)}%` : '—'
  }
  if (row.kind === 'continuous') {
    const c = row.cells[key]
    return c ? `(${c.secondary.toFixed(1)})` : ''
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
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.10);
  text-align: left;
  font-weight: 700;
}
.char-t1__col-num {
  text-align: right;
}
.char-t1__col-cohort {
  text-align: center;
  color: rgb(var(--v-theme-primary));
}
.char-t1__group td {
  background: rgba(var(--v-theme-orange), 0.06);
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgb(var(--v-theme-orange));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}
.char-t1__cell-num {
  text-align: right;
}
.char-t1__cell-stddiff--high {
  color: rgb(192, 57, 43);
  font-weight: 600;
}
.char-t1__row:hover td {
  background: rgba(var(--v-theme-orange), 0.03);
}
.char-t1__cell-label {
  color: rgb(var(--v-theme-on-surface));
  padding-left: 26px !important;
}
</style>
