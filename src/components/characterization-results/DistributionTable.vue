<!--
  DistributionTable

  Renders distribution rows for a single analysis. When more than one
  cohort is present, a v-select narrows the columns to one cohort at a
  time — keeps the table readable.
-->
<template>
  <v-card
    class="distribution-table"
    variant="outlined"
    :data-testid="`char-results-distribution-${analysisId}`"
  >
    <v-card-title class="distribution-table__title">
      {{ analysisName }}
      <span class="distribution-table__count">({{ rows.length }})</span>
      <v-spacer />
      <v-select
        v-if="cohorts.length > 1"
        v-model="selectedCohortId"
        :items="cohortItems"
        item-title="title"
        item-value="value"
        density="compact"
        hide-details
        class="distribution-table__cohort-select"
        :data-testid="`char-results-distribution-cohort-${analysisId}`"
      />
    </v-card-title>

    <v-data-table
      :items="tableRows"
      :headers="headers"
      :items-per-page="25"
      :items-per-page-options="[10, 25, 50, 100, -1]"
      density="compact"
      :data-testid="`char-results-distribution-table-${analysisId}`"
    >
      <template #no-data>
        <div class="distribution-table__empty">
          {{ tv('characterizations.results.table.empty', 'No rows match the current filter.') }}
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { DistributionStat, LinkedCohort } from '@/models/characterization.types'

interface Props {
  analysisId: number
  analysisName: string
  rows: DistributionStat[]
  cohorts: LinkedCohort[]
}

const props = defineProps<Props>()
const { tv } = useI18n()

const selectedCohortId = ref<number | null>(props.cohorts[0]?.id ?? null)

watch(
  () => props.cohorts,
  (next) => {
    if (!next.length) {
      selectedCohortId.value = null
      return
    }
    if (
      selectedCohortId.value === null ||
      !next.some((c) => c.id === selectedCohortId.value)
    ) {
      selectedCohortId.value = next[0]?.id ?? null
    }
  }
)

const cohortItems = computed(() =>
  props.cohorts.map((c) => ({ title: c.name, value: c.id }))
)

function pickStratumKey(rec: Record<string, Record<string, number>>): string | null {
  const keys = Object.keys(rec)
  if (keys.length === 0) {
    return null
  }
  return keys.includes(DEFAULT_STRATA_KEY) ? DEFAULT_STRATA_KEY : (keys[0] as string)
}

function valueFor(
  rec: Record<string, Record<string, number>>,
  cohortId: number | null
): number | undefined {
  if (cohortId === null) {
    return undefined
  }
  const sKey = pickStratumKey(rec)
  if (!sKey) {
    return undefined
  }
  return rec[sKey]?.[String(cohortId)]
}

function fmt(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—'
  }
  return value.toFixed(2)
}

const tableRows = computed(() =>
  props.rows.map((row) => ({
    covariateName: row.covariateName,
    avg: fmt(valueFor(row.avg, selectedCohortId.value)),
    stdDev: fmt(valueFor(row.stdDev, selectedCohortId.value)),
    min: fmt(valueFor(row.min, selectedCohortId.value)),
    p25: fmt(valueFor(row.p25, selectedCohortId.value)),
    median: fmt(valueFor(row.median, selectedCohortId.value)),
    p75: fmt(valueFor(row.p75, selectedCohortId.value)),
    max: fmt(valueFor(row.max, selectedCohortId.value)),
  }))
)

const headers = computed(() => [
  { title: tv('characterizations.results.table.covariate', 'Covariate'), key: 'covariateName' },
  { title: tv('characterizations.results.table.mean', 'Mean'), key: 'avg', align: 'end' as const },
  { title: tv('characterizations.results.table.sd', 'SD'), key: 'stdDev', align: 'end' as const },
  { title: tv('characterizations.results.table.min', 'Min'), key: 'min', align: 'end' as const },
  { title: tv('characterizations.results.table.p25', 'P25'), key: 'p25', align: 'end' as const },
  { title: tv('characterizations.results.table.median', 'Median'), key: 'median', align: 'end' as const },
  { title: tv('characterizations.results.table.p75', 'P75'), key: 'p75', align: 'end' as const },
  { title: tv('characterizations.results.table.max', 'Max'), key: 'max', align: 'end' as const },
])
</script>

<style scoped>
.distribution-table {
  margin-bottom: 16px;
}

.distribution-table__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 500;
}

.distribution-table__count {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 400;
}

.distribution-table__cohort-select {
  max-width: 240px;
}

.distribution-table__empty {
  padding: 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
