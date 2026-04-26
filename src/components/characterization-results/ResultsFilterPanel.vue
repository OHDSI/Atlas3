<!--
  ResultsFilterPanel

  Compact filter strip: Domain / Analysis (multi) and Cohort (single).
  Pure controlled component — emits update:* for each binding.
-->
<template>
  <v-card
    class="results-filter"
    variant="outlined"
    data-testid="char-results-filters"
  >
    <v-card-text class="results-filter__row">
      <v-select
        :model-value="selectedDomains"
        :items="availableDomains"
        :label="tv('characterizations.results.filter.domain', 'Domain')"
        density="comfortable"
        multiple
        chips
        clearable
        hide-details
        class="results-filter__select"
        data-testid="char-results-filter-domain"
        @update:model-value="onDomainChange"
      />
      <v-select
        :model-value="selectedAnalysisIds"
        :items="analysisItems"
        item-title="title"
        item-value="value"
        :label="tv('characterizations.results.filter.analysis', 'Analysis')"
        density="comfortable"
        multiple
        chips
        clearable
        hide-details
        class="results-filter__select"
        data-testid="char-results-filter-analysis"
        @update:model-value="onAnalysisChange"
      />
      <v-select
        :model-value="selectedCohortId"
        :items="cohortItems"
        item-title="title"
        item-value="value"
        :label="tv('characterizations.results.filter.cohort', 'Cohort')"
        density="comfortable"
        clearable
        hide-details
        class="results-filter__select"
        data-testid="char-results-filter-cohort"
        @update:model-value="onCohortChange"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import type { LinkedCohort } from '@/models/characterization.types'

interface AnalysisOption {
  id: number
  name: string
}

interface Props {
  availableAnalyses: AnalysisOption[]
  availableDomains: string[]
  availableCohorts: LinkedCohort[]
  selectedAnalysisIds: number[]
  selectedDomains: string[]
  selectedCohortId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:selectedAnalysisIds', value: number[]): void
  (e: 'update:selectedDomains', value: string[]): void
  (e: 'update:selectedCohortId', value: number | null): void
}>()

const { tv } = useI18n()

const analysisItems = computed(() =>
  props.availableAnalyses.map((a) => ({ title: a.name, value: a.id }))
)

const cohortItems = computed(() =>
  props.availableCohorts.map((c) => ({ title: c.name, value: c.id }))
)

function onDomainChange(value: unknown): void {
  if (Array.isArray(value)) {
    emit('update:selectedDomains', value.filter((v): v is string => typeof v === 'string'))
  } else if (value === null || value === undefined) {
    emit('update:selectedDomains', [])
  }
}

function onAnalysisChange(value: unknown): void {
  if (Array.isArray(value)) {
    emit('update:selectedAnalysisIds', value.filter((v): v is number => typeof v === 'number'))
  } else if (value === null || value === undefined) {
    emit('update:selectedAnalysisIds', [])
  }
}

function onCohortChange(value: unknown): void {
  if (typeof value === 'number') {
    emit('update:selectedCohortId', value)
  } else {
    emit('update:selectedCohortId', null)
  }
}
</script>

<style scoped>
.results-filter {
  margin-bottom: 16px;
}

.results-filter__row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

.results-filter__select {
  flex: 1 1 200px;
  min-width: 200px;
}
</style>
