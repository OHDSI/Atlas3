<!--
  ResultsFilterPanel

  Compact filter strip: Domain / Analysis (multi), Cohort (single) and a free
  text filter over the covariate names (#327).
  Pure controlled component — emits update:* for each binding.
-->
<template>
  <AtlasCard
    padding="md"
    class="results-filter"
    data-testid="char-results-filters"
  >
    <div class="results-filter__row">
      <AtlasSelect
        :model-value="selectedDomains"
        :items="availableDomains"
        :label="tv('columns.domain', 'Domain')"
        variant="outlined"
        multiple
        chips
        closable-chips
        clearable
        hide-details
        class="results-filter__select"
        data-testid="char-results-filter-domain"
        @update:model-value="(v) => onDomainChange(v as string[])"
      />
      <AtlasSelect
        :model-value="selectedAnalysisIds"
        :items="analysisItems"
        item-title="title"
        item-value="value"
        :label="tv('columns.analysis', 'Analysis')"
        variant="outlined"
        multiple
        chips
        closable-chips
        clearable
        hide-details
        class="results-filter__select"
        data-testid="char-results-filter-analysis"
        @update:model-value="(v) => onAnalysisChange(v as number[])"
      />
      <AtlasSelect
        :model-value="selectedCohortId"
        :items="cohortItems"
        item-title="title"
        item-value="value"
        :label="tv('common.cohort', 'Cohort')"
        variant="outlined"
        clearable
        hide-details
        class="results-filter__select"
        data-testid="char-results-filter-cohort"
        @update:model-value="(v) => onCohortChange(v as number | null)"
      />
      <AtlasTextField
        :model-value="search"
        :label="tv('common.search', 'Search')"
        :placeholder="tv('components.characterizationResults.searchCovariates', 'Filter results by name')"
        variant="outlined"
        clearable
        hide-details
        class="results-filter__select"
        data-testid="char-results-filter-search"
        @update:model-value="(v) => emit('update:search', v == null ? '' : String(v))"
      />
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '@/composables/useI18n'
import type { LinkedCohort } from '@/models/characterization.types'
import { AtlasCard, AtlasSelect, AtlasTextField } from '@/components/ui'

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
  search: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:selectedAnalysisIds', value: number[]): void
  (e: 'update:selectedDomains', value: string[]): void
  (e: 'update:selectedCohortId', value: number | null): void
  (e: 'update:search', value: string): void
}>()

const { tv } = useI18n()

const analysisItems = computed(() =>
  props.availableAnalyses.map(a => ({ title: a.name, value: a.id }))
)

const cohortItems = computed(() =>
  props.availableCohorts.map(c => ({ title: c.name, value: c.id }))
)

function onDomainChange(value: unknown): void {
  if (Array.isArray(value)) {
    emit(
      'update:selectedDomains',
      value.filter((v): v is string => typeof v === 'string')
    )
  } else if (value === null || value === undefined) {
    emit('update:selectedDomains', [])
  }
}

function onAnalysisChange(value: unknown): void {
  if (Array.isArray(value)) {
    emit(
      'update:selectedAnalysisIds',
      value.filter((v): v is number => typeof v === 'number')
    )
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
  font-size: 12px;
}
.results-filter__select :deep(.v-field__input),
.results-filter__select :deep(.v-label),
.results-filter__select :deep(.v-chip) {
  font-size: 12px;
}
.results-filter__select :deep(.v-chip) {
  height: 22px;
}
</style>
