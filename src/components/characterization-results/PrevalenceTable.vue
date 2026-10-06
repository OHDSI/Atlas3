<template>
  <AtlasCard
    padding="none"
    class="prevalence-table"
    :data-testid="`char-results-prevalence-${analysisId}`"
  >
    <div class="prevalence-table__header">
      <div class="prevalence-table__eyebrow-row">
        <span class="text-eyebrow">{{ analysisName }}</span>
        <span class="prevalence-table__accent-rule" />
      </div>
      <h3 class="prevalence-table__title">
        {{ tv('characterizations.results.table.prevalence', 'Prevalence') }}
        <span class="prevalence-table__count">({{ rows.length }})</span>
      </h3>
    </div>

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
        class="prevalence-table__table"
        :class="{ 'prevalence-table__table--comparison': comparisonMode }"
      >
        <colgroup v-if="comparisonMode">
          <col class="prevalence-table__covariate-col">
          <col class="prevalence-table__concept-col">
          <template
            v-for="cohort in effectiveCohorts"
            :key="cohort.id"
          >
            <col class="prevalence-table__metric-col">
            <col class="prevalence-table__metric-col">
          </template>
          <col class="prevalence-table__std-diff-col">
          <col class="prevalence-table__action-col">
        </colgroup>
        <thead>
          <tr>
            <th rowspan="2">
              {{ tv('columns.covariate', 'Covariate') }}
            </th>
            <th rowspan="2">
              {{ tv('columns.conceptId', 'Concept ID') }}
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
              <th rowspan="2">
                {{ tv('characterizations.results.table.stdDiff', 'Std Diff') }}
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
            <th rowspan="2" />
          </tr>
          <tr>
            <template v-if="comparisonMode">
              <template
                v-for="cohort in effectiveCohorts"
                :key="cohort.id"
              >
                <th class="prevalence-table__numeric">
                  {{ tv('columns.count', 'Count') }}
                </th>
                <th class="prevalence-table__numeric">
                  {{ tv('columns.pct', 'Pct') }}
                </th>
              </template>
            </template>
            <template v-else>
              <template
                v-for="partition in partitions"
                :key="partition.key"
              >
                <th class="prevalence-table__numeric">
                  {{ tv('columns.count', 'Count') }}
                </th>
                <th class="prevalence-table__numeric">
                  {{ tv('columns.pct', 'Pct') }}
                </th>
              </template>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
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
            <td>{{ row.conceptId || '—' }}</td>
            <template v-if="comparisonMode">
              <template
                v-for="cohort in effectiveCohorts"
                :key="cohort.id"
              >
                <td class="prevalence-table__numeric">
                  {{ formatCount(value(row.count, table.partitionKey, cohort.id)) }}
                </td>
                <td class="prevalence-table__numeric">
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
                <td class="prevalence-table__numeric">
                  {{ formatCount(value(row.count, partition.key, table.cohort.id)) }}
                </td>
                <td class="prevalence-table__numeric">
                  {{ formatPercent(value(row.pct, partition.key, table.cohort.id)) }}
                </td>
              </template>
            </template>
            <td>
              <AtlasIconButton
                icon="mdi-magnify"
                size="sm"
                variant="text"
                v-bind="{ ariaLabel: tv('columns.explore', 'Explore') }"
                :data-testid="`char-results-explore-${row.covariateId}`"
                @click="emit('explore', row)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { computeBinaryStdDiff, DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { LinkedCohort, PrevalenceStat } from '@/models/characterization.types'
import { AtlasCard, AtlasIconButton } from '@/components/ui'

interface Props {
  analysisId: number
  analysisName: string
  rows: PrevalenceStat[]
  cohorts: LinkedCohort[]
  selectedCohortIds?: number[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'explore', row: PrevalenceStat): void }>()
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
.prevalence-table__accent-rule { width: 28px; height: 2px; background-color: rgb(var(--v-theme-orange)); }
.prevalence-table__title { display: flex; align-items: baseline; gap: 8px; font-size: 18px; font-weight: 500; margin: 0; color: rgb(var(--v-theme-primary)); }
.prevalence-table__count { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.6); font-weight: 400; }
.prevalence-table__wrap { overflow-x: auto; padding: 0 20px 20px; }
.prevalence-table__partition-title { font-size: 13px; margin: 0 0 8px; }
.prevalence-table__table { border-collapse: collapse; font-size: 12px; min-width: 100%; }
.prevalence-table__table--comparison { table-layout: fixed; width: 100%; }
.prevalence-table__concept-col { width: 96px; }
.prevalence-table__metric-col { width: 10%; }
.prevalence-table__std-diff-col { width: 72px; }
.prevalence-table__action-col { width: 44px; }
.prevalence-table__table th, .prevalence-table__table td { border: 1px solid rgba(var(--v-theme-on-surface), 0.12); padding: 6px 8px; text-align: right; white-space: nowrap; }
.prevalence-table__table thead th { white-space: normal; overflow-wrap: anywhere; }
.prevalence-table__table .prevalence-table__cohort-header { white-space: normal; overflow-wrap: anywhere; }
.prevalence-table__table th:first-child, .prevalence-table__table td:first-child { text-align: left; }
.prevalence-table__covariate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prevalence-table__table thead th { background: rgba(var(--v-theme-on-surface), 0.03); font-weight: 600; }
.prevalence-table__table thead .prevalence-table__numeric { text-align: right; }
</style>
