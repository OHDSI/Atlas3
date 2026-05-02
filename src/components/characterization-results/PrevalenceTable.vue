<!--
  PrevalenceTable

  Renders prevalence rows for a single analysis. Columns are built
  dynamically from the linked cohorts: each cohort gets a Count and Pct
  column. When exactly two cohorts are present, an additional Std Diff
  column is appended.

  The Concept ID cell links out to Athena (the OHDSI public vocabulary
  search), matching the convention used elsewhere in the OHDSI
  ecosystem.
-->
<template>
  <SurfaceCard
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

    <v-data-table
      :items="tableRows"
      :headers="headers"
      :items-per-page="25"
      :items-per-page-options="[10, 25, 50, 100, -1]"
      density="compact"
      class="prevalence-table__table"
      :data-testid="`char-results-prevalence-table-${analysisId}`"
    >
      <template #[`item.conceptId`]="{ item }">
        <a
          v-if="item.conceptId"
          :href="conceptUrl(item.conceptId)"
          target="_blank"
          rel="noopener noreferrer"
          class="prevalence-table__concept-link"
        >
          {{ item.conceptId }}
        </a>
        <span v-else>—</span>
      </template>

      <template
        v-for="cohort in cohorts"
        :key="`pct-${cohort.id}`"
        #[`item.pct_${cohort.id}`]="{ item }"
      >
        {{ formatPercent(item[`pct_${cohort.id}`]) }}
      </template>

      <template
        v-for="cohort in cohorts"
        :key="`count-${cohort.id}`"
        #[`item.count_${cohort.id}`]="{ item }"
      >
        {{ formatCount(item[`count_${cohort.id}`]) }}
      </template>

      <template #[`item.stdDiff`]="{ item }">
        {{ formatStdDiff(item.stdDiff) }}
      </template>

      <template #[`item.actions`]="{ item }">
        <v-btn
          size="x-small"
          variant="text"
          color="primary"
          :data-testid="`char-results-explore-${item.covariateId}`"
          @click="onExplore(item._row)"
        >
          {{ tv('columns.explore', 'Explore') }}
        </v-btn>
      </template>

      <template #no-data>
        <div class="prevalence-table__empty">
          {{ tv('common.noData', 'No rows match the current filter.') }}
        </div>
      </template>
    </v-data-table>
  </SurfaceCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { LinkedCohort, PrevalenceStat } from '@/models/characterization.types'
import SurfaceCard from '@/components/shared/SurfaceCard.vue'

interface Props {
  analysisId: number
  analysisName: string
  rows: PrevalenceStat[]
  cohorts: LinkedCohort[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'explore', row: PrevalenceStat): void
}>()

const { tv } = useI18n()

interface FlattenedRow {
  covariateId: number
  covariateName: string
  conceptId: number
  stdDiff: number | undefined
  _row: PrevalenceStat
  [key: string]: unknown
}

function pickStratumKey(rec: Record<string, Record<string, number>>): string | null {
  const keys = Object.keys(rec)
  if (keys.length === 0) {
    return null
  }
  return keys.includes(DEFAULT_STRATA_KEY) ? DEFAULT_STRATA_KEY : (keys[0] as string)
}

const tableRows = computed<FlattenedRow[]>(() =>
  props.rows.map(row => {
    const flat: FlattenedRow = {
      covariateId: row.covariateId,
      covariateName: row.covariateName,
      conceptId: row.conceptId,
      stdDiff: row.stdDiff,
      _row: row,
    }
    const countKey = pickStratumKey(row.count)
    const pctKey = pickStratumKey(row.pct)
    for (const cohort of props.cohorts) {
      flat[`count_${cohort.id}`] = countKey ? row.count[countKey]?.[String(cohort.id)] : undefined
      flat[`pct_${cohort.id}`] = pctKey ? row.pct[pctKey]?.[String(cohort.id)] : undefined
    }
    return flat
  })
)

const headers = computed(() => {
  const out: {
    title: string
    key: string
    sortable?: boolean
    align?: 'start' | 'end' | 'center'
  }[] = [
    {
      title: tv('columns.covariate', 'Covariate'),
      key: 'covariateName',
    },
    {
      title: tv('columns.conceptId', 'Concept ID'),
      key: 'conceptId',
      align: 'end',
    },
  ]
  for (const cohort of props.cohorts) {
    out.push({
      title: `${cohort.name} · ${tv('columns.count', 'Count')}`,
      key: `count_${cohort.id}`,
      align: 'end',
    })
    out.push({
      title: `${cohort.name} · ${tv('columns.pct', '%')}`,
      key: `pct_${cohort.id}`,
      align: 'end',
    })
  }
  if (props.cohorts.length === 2) {
    out.push({
      title: tv('characterizations.results.table.stdDiff', 'Std Diff'),
      key: 'stdDiff',
      align: 'end',
    })
  }
  out.push({
    title: tv('columns.explore', 'Explore'),
    key: 'actions',
    sortable: false,
    align: 'end',
  })
  return out
})

function formatPercent(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return `${value.toFixed(2)}%`
}

function formatCount(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return value.toLocaleString()
}

function formatStdDiff(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return value.toFixed(4)
}

function conceptUrl(conceptId: number): string {
  return `https://athena.ohdsi.org/search-terms/terms/${conceptId}`
}

function onExplore(row: PrevalenceStat): void {
  emit('explore', row)
}
</script>

<style scoped>
.prevalence-table {
  margin-bottom: 16px;
}

.prevalence-table__header {
  padding: 20px 20px 12px;
}

.prevalence-table__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.prevalence-table__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.prevalence-table__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.prevalence-table__count {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 400;
}

.prevalence-table__concept-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.prevalence-table__concept-link:hover {
  text-decoration: underline;
}

.prevalence-table__empty {
  padding: 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
