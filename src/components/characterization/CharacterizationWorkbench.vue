<template>
  <div class="char-workbench">
    <CharacterizationDesignRail
      :model-value="modelValue"
      :available-cohorts="availableCohorts"
      :available-feature-analyses="availableFeatureAnalyses"
      :runs="store.executions"
      :active-run-id="selectedExecutionId"
      :show-past-runs="!!characterizationId"
      class="char-workbench__rail"
      @update:model-value="(v) => $emit('update:modelValue', v)"
      @select-run="onSelectRun"
    />

    <main class="char-workbench__canvas">
      <template v-if="characterizationId">
        <CharacterizationCanvasToolbar
          :mode="viewMode"
          :active-run="activeRunSummary"
          :threshold="filters.threshold"
          :has-results="prevalence.length > 0 || distribution.length > 0"
          @update:mode="(m) => (viewMode = m)"
          @update:threshold="(v) => (filters.threshold = v)"
          @open-configure="configureOpen = true"
          @export="onExport"
        />

        <CharacterizationEmptyState
          v-if="emptyVariant"
          :variant="emptyVariant"
          :error-message="execution?.status === 'FAILED' ? errorMessage : undefined"
          @run="onOpenRunDialog"
        />

        <template v-else>
          <CharacterizationTable1View
            v-if="viewMode === 'table1'"
            :prevalence="prevalence"
            :distribution="distribution"
            :cohorts="cohorts"
            :config="config"
            :filters="filters"
            @explore="onExplore"
          />
          <CharacterizationPerAnalysisView
            v-else-if="viewMode === 'perAnalysis'"
            :prevalence="prevalence"
            :distribution="distribution"
            :cohorts="cohorts"
            :threshold="filters.threshold"
            :selected-analysis-ids="filters.selectedAnalysisIds"
            :selected-domains="filters.selectedDomains"
            :selected-cohort-id="filters.selectedCohortId"
            @explore="onExplore"
          />
          <CharacterizationPerAnalysisView
            v-else
            :prevalence="[]"
            :distribution="distribution"
            :cohorts="cohorts"
            :threshold="filters.threshold"
            :selected-analysis-ids="filters.selectedAnalysisIds"
            :selected-domains="filters.selectedDomains"
            :selected-cohort-id="filters.selectedCohortId"
          />
        </template>

        <ConfigureInspector
          :open="configureOpen"
          :config="config"
          :cohort-count="cohorts.length"
          :has-strata="hasStrata"
          @update:config="(c) => (config = c)"
          @close="configureOpen = false"
        />
      </template>

      <CharacterizationEmptyState
        v-else
        variant="no-id"
      />
    </main>

    <RunExecutionDialog
      v-model="runDialogOpen"
      :characterization-id="characterizationId"
      @started="onRunStarted"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CharacterizationDesignRail from './CharacterizationDesignRail.vue'
import CharacterizationCanvasToolbar from './CharacterizationCanvasToolbar.vue'
import CharacterizationTable1View from './CharacterizationTable1View.vue'
import CharacterizationPerAnalysisView from './CharacterizationPerAnalysisView.vue'
import CharacterizationEmptyState from './CharacterizationEmptyState.vue'
import ConfigureInspector from './ConfigureInspector.vue'
import RunExecutionDialog from './RunExecutionDialog.vue'

import { useCharacterizationStore } from '@/stores/characterization'
import { useCharacterizationResults } from '@/composables/useCharacterizationResults'
import { isTerminalStatus } from '@/composables/useExecutionPolling'
import {
  DEFAULT_TABLE1_CONFIG, DEFAULT_TABLE1_FILTERS,
  type CharacterizationDefinition,
  type CharacterizationExecution,
  type LinkedCohort,
  type PrevalenceStat,
  type Table1Config,
  type Table1Filters,
} from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'
import { arrayToCsv, downloadCsv } from '@/utils/csv'

import type { ViewMode } from './CharacterizationCanvasToolbar.vue'

const props = defineProps<{
  modelValue: CharacterizationDefinition
  characterizationId: number | null
  availableCohorts: CohortDefinitionSummary[]
  availableFeatureAnalyses: FeatureAnalysisListItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CharacterizationDefinition]
  'explore': [row: PrevalenceStat]
}>()

const route = useRoute()
const router = useRouter()
const store = useCharacterizationStore()
const { execution, prevalence, distribution, error, load, reset } = useCharacterizationResults()

const viewMode = ref<ViewMode>('table1')
const config = ref<Table1Config>({ ...DEFAULT_TABLE1_CONFIG })
const filters = ref<Table1Filters>({ ...DEFAULT_TABLE1_FILTERS })
const configureOpen = ref<boolean>(false)
const runDialogOpen = ref<boolean>(false)
const errorMessage = ref<string>('')

const cohorts = computed<LinkedCohort[]>(() => props.modelValue.cohorts)

const hasStrata = computed<boolean>(() =>
  props.modelValue.stratas.length > 0
  || (props.modelValue.stratifiedBy ?? '').trim().length > 0
)

const selectedExecutionId = computed<number | null>(() => {
  const q = route.query?.run
  if (typeof q === 'string') {
    const n = Number(q)
    return Number.isFinite(n) ? n : null
  }
  return null
})

const activeRunSummary = computed(() => {
  if (!execution.value) return null
  return {
    id: execution.value.id,
    sourceKey: execution.value.sourceKey,
  }
})

const emptyVariant = computed<'no-runs' | 'run-pending' | 'run-failed' | null>(() => {
  if (!props.characterizationId) return null
  if (store.executions.length === 0) return 'no-runs'
  if (selectedExecutionId.value === null) return null
  if (execution.value && !isTerminalStatus(execution.value.status)) return 'run-pending'
  if (execution.value?.status === 'FAILED') return 'run-failed'
  return null
})

watch(
  () => props.characterizationId,
  async (id, prev) => {
    if (id == null) return
    if (prev !== undefined && prev !== id && route.query.run !== undefined) {
      const { run: _run, ...rest } = route.query
      void _run
      await router.replace({ query: rest })
    }
    await store.loadExecutions(id)
    if (selectedExecutionId.value === null) {
      const completed = store.executions.find(e => e.status === 'COMPLETED')
      if (completed) {
        await router.replace({ query: { ...route.query, run: String(completed.id) } })
      }
    }
  },
  { immediate: true },
)

watch(
  selectedExecutionId,
  async (id) => {
    if (id === null) { reset(); return }
    const ok = await load(id)
    if (!ok) errorMessage.value = error.value ?? ''
  },
  { immediate: true },
)

onMounted(() => {
  errorMessage.value = error.value ?? ''
})

function onSelectRun(id: number): void {
  router.push({ query: { ...route.query, run: String(id) } })
}

function onOpenRunDialog(): void { runDialogOpen.value = true }

function onRunStarted(exec: CharacterizationExecution): void {
  void router.replace({ query: { ...route.query, run: String(exec.id) } })
  store.pollExecution(exec.id, () => {
    if (props.characterizationId != null) {
      void store.loadExecutions(props.characterizationId)
    }
  })
}

function onExplore(row: PrevalenceStat): void { emit('explore', row) }

function onExport(): void {
  const rows: Array<Record<string, string | number | null>> = []
  for (const row of prevalence.value) {
    const sKey = Object.keys(row.pct)[0]
    if (!sKey) continue
    for (const cohort of cohorts.value) {
      rows.push({
        analysisId: row.analysisId,
        analysisName: row.analysisName,
        covariateId: row.covariateId,
        covariateName: row.covariateName,
        conceptId: row.conceptId,
        cohortId: cohort.id,
        cohortName: cohort.name,
        count: row.count[sKey]?.[String(cohort.id)] ?? null,
        pct: row.pct[sKey]?.[String(cohort.id)] ?? null,
        stdDiff: row.stdDiff ?? null,
      })
    }
  }
  if (rows.length === 0) return
  const csv = arrayToCsv(rows, [
    { key: 'analysisId', label: 'Analysis ID' },
    { key: 'analysisName', label: 'Analysis' },
    { key: 'covariateId', label: 'Covariate ID' },
    { key: 'covariateName', label: 'Covariate' },
    { key: 'conceptId', label: 'Concept ID' },
    { key: 'cohortId', label: 'Cohort ID' },
    { key: 'cohortName', label: 'Cohort' },
    { key: 'count', label: 'Count' },
    { key: 'pct', label: 'Pct' },
    { key: 'stdDiff', label: 'Std Diff' },
  ])
  downloadCsv(`characterization-${selectedExecutionId.value ?? 'results'}.csv`, csv)
}
</script>

<style scoped>
.char-workbench {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  overflow: hidden;
  min-height: 540px;
  position: relative;
}
.char-workbench__rail {
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.char-workbench__canvas {
  padding: 18px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  display: flex; flex-direction: column; gap: 12px;
  min-height: 540px;
  position: relative;
  min-width: 0;
}
@media (max-width: 1024px) {
  .char-workbench { grid-template-columns: 1fr; }
  .char-workbench__rail { display: none; }
}
</style>
