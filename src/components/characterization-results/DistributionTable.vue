<!--
  DistributionTable

  Renders distribution rows for a single analysis. When more than one
  cohort is present, a v-select narrows the columns to one cohort at a
  time — keeps the table readable.
-->
<template>
  <SurfaceCard
    padding="none"
    class="distribution-table"
    :data-testid="`char-results-distribution-${analysisId}`"
  >
    <div class="distribution-table__header">
      <div class="distribution-table__title-block">
        <div class="distribution-table__eyebrow-row">
          <span class="text-eyebrow">{{ analysisName }}</span>
          <span class="distribution-table__accent-rule" />
        </div>
        <h3 class="distribution-table__title">
          {{ tv('characterizations.results.table.distribution', 'Distribution') }}
          <span class="distribution-table__count">({{ rows.length }})</span>
        </h3>
      </div>
      <v-spacer />
      <v-select
        v-if="cohorts.length > 1"
        v-model="selectedCohortId"
        :items="cohortItems"
        item-title="title"
        item-value="value"
        variant="outlined"
        density="compact"
        hide-details
        class="distribution-table__cohort-select"
        :data-testid="`char-results-distribution-cohort-${analysisId}`"
      />
    </div>

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
          {{ tv('common.noData', 'No rows match the current filter.') }}
        </div>
      </template>
    </v-data-table>
  </SurfaceCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useI18n } from '@/composables/useI18n'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type { DistributionStat, LinkedCohort } from '@/models/characterization.types'
import SurfaceCard from '@/components/shared/SurfaceCard.vue'

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
  next => {
    if (!next.length) {
      selectedCohortId.value = null
      return
    }
    if (selectedCohortId.value === null || !next.some(c => c.id === selectedCohortId.value)) {
      selectedCohortId.value = next[0]?.id ?? null
    }
  }
)

const cohortItems = computed(() => props.cohorts.map(c => ({ title: c.name, value: c.id })))

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
  props.rows.map(row => ({
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
  { title: tv('columns.covariate', 'Covariate'), key: 'covariateName' },
  { title: tv('columns.avg', 'Mean'), key: 'avg', align: 'end' as const },
  { title: tv('columns.stddev', 'SD'), key: 'stdDev', align: 'end' as const },
  { title: tv('common.min', 'Min'), key: 'min', align: 'end' as const },
  { title: tv('columns.p25', 'P25'), key: 'p25', align: 'end' as const },
  { title: tv('columns.median', 'Median'), key: 'median', align: 'end' as const },
  { title: tv('columns.p75', 'P75'), key: 'p75', align: 'end' as const },
  { title: tv('columns.max', 'Max'), key: 'max', align: 'end' as const },
])
</script>

<style scoped>
.distribution-table {
  margin-bottom: 16px;
}

.distribution-table__header {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  padding: 20px 20px 12px;
}

.distribution-table__title-block {
  flex: 0 1 auto;
}

.distribution-table__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.distribution-table__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.distribution-table__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
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
