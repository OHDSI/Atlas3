<!--
  ResultsFilterPanel

  Compact filter strip: Domain / Analysis / Cohort (multi) and a free
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
        :model-value="draftDomains"
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
        @update:menu="onDomainMenuChange"
        @update:model-value="(v) => onDomainChange(v as string[])"
      />
      <AtlasSelect
        :model-value="draftAnalysisIds"
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
        @update:menu="onAnalysisMenuChange"
        @update:model-value="(v) => onAnalysisChange(v as number[])"
      />
      <AtlasSelect
        :model-value="draftCohortIds"
        :items="cohortItems"
        item-title="title"
        item-value="value"
        :label="tv('common.cohort', 'Cohort')"
        variant="outlined"
        multiple
        chips
        closable-chips
        clearable
        hide-details
        class="results-filter__select"
        data-testid="char-results-filter-cohort"
        @update:menu="onCohortMenuChange"
        @update:model-value="(v) => onCohortChange(v as number[])"
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
import { computed, ref, watch } from 'vue'

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
  selectedCohortIds: number[]
  search: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:selectedAnalysisIds', value: number[]): void
  (e: 'update:selectedDomains', value: string[]): void
  (e: 'update:selectedCohortIds', value: number[]): void
  (e: 'update:search', value: string): void
}>()

const { tv } = useI18n()

const analysisItems = computed(() =>
  props.availableAnalyses.map(a => ({ title: a.name, value: a.id }))
)

const cohortItems = computed(() =>
  props.availableCohorts.map(c => ({ title: c.name, value: c.id }))
)

const domainMenuOpen = ref(false)
const draftDomains = ref<string[]>([...props.selectedDomains])
const analysisMenuOpen = ref(false)
const draftAnalysisIds = ref<number[]>([...props.selectedAnalysisIds])
const cohortMenuOpen = ref(false)
const draftCohortIds = ref<number[]>([...props.selectedCohortIds])

watch(
  () => props.selectedDomains,
  (value) => {
    if (!domainMenuOpen.value) draftDomains.value = [...value]
  },
  { deep: true },
)

watch(
  () => props.selectedAnalysisIds,
  (value) => {
    if (!analysisMenuOpen.value) draftAnalysisIds.value = [...value]
  },
  { deep: true },
)

watch(
  () => props.selectedCohortIds,
  (value) => {
    if (!cohortMenuOpen.value) draftCohortIds.value = [...value]
  },
  { deep: true },
)

function onDomainChange(value: unknown): void {
  if (Array.isArray(value)) {
    draftDomains.value = value.filter((v): v is string => typeof v === 'string')
  } else if (value === null || value === undefined) {
    draftDomains.value = []
  }

  if (!domainMenuOpen.value) emit('update:selectedDomains', draftDomains.value)
}

function onAnalysisChange(value: unknown): void {
  if (Array.isArray(value)) {
    draftAnalysisIds.value = value.filter((v): v is number => typeof v === 'number')
  } else if (value === null || value === undefined) {
    draftAnalysisIds.value = []
  }

  if (!analysisMenuOpen.value) emit('update:selectedAnalysisIds', draftAnalysisIds.value)
}

function onCohortChange(value: unknown): void {
  draftCohortIds.value = Array.isArray(value)
    ? value.filter((v): v is number => typeof v === 'number')
    : []

  if (!cohortMenuOpen.value) emit('update:selectedCohortIds', draftCohortIds.value)
}

function onDomainMenuChange(isOpen: boolean): void {
  domainMenuOpen.value = isOpen

  if (isOpen) {
    draftDomains.value = [...props.selectedDomains]
  } else if (!sameValues(draftDomains.value, props.selectedDomains)) {
    emit('update:selectedDomains', draftDomains.value)
  }
}

function onAnalysisMenuChange(isOpen: boolean): void {
  analysisMenuOpen.value = isOpen

  if (isOpen) {
    draftAnalysisIds.value = [...props.selectedAnalysisIds]
  } else if (!sameValues(draftAnalysisIds.value, props.selectedAnalysisIds)) {
    emit('update:selectedAnalysisIds', draftAnalysisIds.value)
  }
}

function onCohortMenuChange(isOpen: boolean): void {
  cohortMenuOpen.value = isOpen

  if (isOpen) {
    draftCohortIds.value = [...props.selectedCohortIds]
  } else if (!sameValues(draftCohortIds.value, props.selectedCohortIds)) {
    emit('update:selectedCohortIds', draftCohortIds.value)
  }
}

function sameValues<T>(left: T[], right: T[]): boolean {
  return left.length === right.length && left.every(id => right.includes(id))
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
