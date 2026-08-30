<template>
  <div
    class="char-workbench"
    :class="{ 'char-workbench--rail-collapsed': !railOpen }"
  >
    <div
      v-show="railOpen"
      class="char-workbench__rail"
    >
      <CharacterizationDesignRail
        :model-value="modelValue"
        :available-cohorts="availableCohorts"
        :available-feature-analyses="availableFeatureAnalyses"
        @update:model-value="(v) => $emit('update:modelValue', v)"
      />
    </div>

    <main class="char-workbench__canvas">
      <button
        class="rail-toggle"
        :title="railOpen
          ? tv('components.characterizationWorkbench.hideDesignPanel', 'Hide design panel')
          : tv('components.characterizationWorkbench.showDesignPanel', 'Show design panel')"
        @click="railOpen = !railOpen"
      >
        {{ railOpen
          ? '◂ ' + tv('components.characterizationWorkbench.hideAnalysisDesign', 'Hide Analysis Design')
          : '▸ ' + tv('components.characterizationWorkbench.showAnalysisDesign', 'Show Analysis Design') }}
      </button>
      <DataSourceRunTable
        :sources="runTableSources"
        :executions="runTableExecutions"
        :selected-execution-id="selectedExecutionId"
        :loading="store.executionsLoading"
        :run-disabled="runDisabled"
        :run-disabled-reason="runDisabledReason"
        data-testid="char-workbench-run-table"
        @run="handleRun"
        @cancel="handleCancel"
        @select-result="onSelectHistoryExecution"
        @show-history="handleShowHistory"
      />

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

        <CharacterizationRunMeta
          v-if="execution"
          :execution="execution"
          :result-count="resultCount"
        />

        <ResultsFilterPanel
          v-if="prevalence.length > 0 || distribution.length > 0"
          :available-analyses="availableAnalyses"
          :available-domains="availableDomains"
          :available-cohorts="availableCohortsForFilter"
          :selected-analysis-ids="filters.selectedAnalysisIds"
          :selected-domains="filters.selectedDomains"
          :selected-cohort-id="filters.selectedCohortId"
          @update:selected-analysis-ids="(v) => (filters.selectedAnalysisIds = v)"
          @update:selected-domains="(v) => (filters.selectedDomains = v)"
          @update:selected-cohort-id="(v) => (filters.selectedCohortId = v)"
        />

        <CharacterizationEmptyState
          v-if="emptyVariant"
          :variant="emptyVariant"
          :error-message="emptyVariant === 'run-failed' || emptyVariant === 'results-error' ? errorMessage : undefined"
        />

        <template v-else>
          <CharacterizationTable1View
            v-if="viewMode === 'table1'"
            :prevalence="prevalence"
            :distribution="distribution"
            :cohorts="cohorts"
            :config="config"
            :filters="filters"
            :cohort-sizes="cohortSizes"
            @explore="onExplore"
          />
          <CharacterizationDashboardView
            v-else-if="viewMode === 'dashboard'"
            :prevalence="prevalence"
            :distribution="distribution"
            :cohorts="cohorts"
          />
          <CharacterizationPerAnalysisView
            v-else
            :prevalence="prevalence"
            :distribution="distribution"
            :cohorts="cohorts"
            :threshold="filters.threshold"
            :selected-analysis-ids="filters.selectedAnalysisIds"
            :selected-domains="filters.selectedDomains"
            :selected-cohort-id="filters.selectedCohortId"
            @explore="onExplore"
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

    <PreviousRunsDialog
      v-model:model-value="historyOpen"
      :source-name="historySourceName"
      :source-key="historySourceKey ?? ''"
      :executions="runTableExecutions"
      :selected-id="selectedExecutionId"
      @select="onSelectHistoryExecution"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CharacterizationDesignRail from './CharacterizationDesignRail.vue'
import CharacterizationCanvasToolbar from './CharacterizationCanvasToolbar.vue'
import CharacterizationRunMeta from './CharacterizationRunMeta.vue'
import CharacterizationTable1View from './CharacterizationTable1View.vue'
import CharacterizationPerAnalysisView from './CharacterizationPerAnalysisView.vue'
import CharacterizationDashboardView from './CharacterizationDashboardView.vue'
import CharacterizationEmptyState from './CharacterizationEmptyState.vue'
import ConfigureInspector from './ConfigureInspector.vue'
import DataSourceRunTable from '@/components/generation/DataSourceRunTable.vue'
import PreviousRunsDialog from '@/components/generation/PreviousRunsDialog.vue'
import type {
  RunTableSource,
  RunTableExecution,
} from '@/components/generation/DataSourceRunTable.vue'
import ResultsFilterPanel from '@/components/characterization-results/ResultsFilterPanel.vue'

import { useI18n } from '@/composables/useI18n'
import { useCharacterizationStore } from '@/stores/characterization'
import { useDataSourcesStore } from '@/stores/datasources'
import { useCharacterizationResults } from '@/composables/useCharacterizationResults'
import { isTerminalStatus } from '@/composables/useExecutionPolling'
import { getCohortGenerationInfo } from '@/services/cohort-definition.service'
import { logger } from '@/utils/logger'
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
import { exportCharacterizationResults } from './characterization-export'
import {
  resolveActiveRunSummary,
  resolveAvailableCohortsForFilter,
  resolveAvailableDomains,
  resolveCohorts,
  resolveEmptyVariant,
  resolveHasStrata,
  resolveHistorySourceName,
  resolveRunDisabledReason,
  resolveSelectedExecutionId,
} from './characterization-workbench-state'

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
  'snackbar': [message: string, severity: 'success' | 'error' | 'info']
}>()

const route = useRoute()
const router = useRouter()
const { tv } = useI18n()
const store = useCharacterizationStore()
const sourcesStore = useDataSourcesStore()
const cohortSizes = ref<Record<string, number>>({})
const { execution, prevalence, distribution, resultCount, error, load, reset } = useCharacterizationResults()

const railOpen = ref(!route.params.id)
const viewMode = ref<ViewMode>('perAnalysis')
const config = ref<Table1Config>({ ...DEFAULT_TABLE1_CONFIG })
const filters = ref<Table1Filters>({ ...DEFAULT_TABLE1_FILTERS })
const configureOpen = ref<boolean>(false)
const errorMessage = ref<string>('')

const historyOpen = ref<boolean>(false)
const historySourceKey = ref<string | null>(null)

async function refreshExecutions(characterizationId: number): Promise<void> {
  await store.loadExecutions(characterizationId)
  seedRunningExecutions()
  await selectDefaultExecution()
}

async function selectDefaultExecution(): Promise<void> {
  if (selectedExecutionId.value !== null) return
  const selectable =
    store.executions.find(e => e.status === 'COMPLETED') ??
    store.executions.find(e => e.status === 'FAILED')
  if (selectable) {
    await router.replace({ query: { ...route.query, run: String(selectable.id) } })
  }
}

function seedRunningExecutions(): void {
  for (const execution of store.executions) {
    if (!isTerminalStatus(execution.status)) {
      store.pollExecution(execution.id, () => {
        if (props.characterizationId != null) {
          void refreshExecutions(props.characterizationId)
        }
      })
    }
  }
}

const cohorts = computed<LinkedCohort[]>(() => resolveCohorts({
  prevalence: prevalence.value,
  distribution: distribution.value,
  fallbackCohorts: props.modelValue.cohorts,
}))

const hasStrata = computed<boolean>(() => resolveHasStrata({
  stratasLength: props.modelValue.stratas.length,
  stratifiedBy: props.modelValue.stratifiedBy,
}))

const availableAnalyses = computed<{ id: number; name: string }[]>(() => {
  const map = new Map<number, string>()
  for (const r of prevalence.value) map.set(r.analysisId, r.analysisName)
  for (const r of distribution.value) map.set(r.analysisId, r.analysisName)
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

const availableDomains = computed<string[]>(() => resolveAvailableDomains({
  prevalence: prevalence.value,
  distribution: distribution.value,
}))

const availableCohortsForFilter = computed<LinkedCohort[]>(() => resolveAvailableCohortsForFilter({
  prevalence: prevalence.value,
  distribution: distribution.value,
}))

const selectedExecutionId = computed<number | null>(() => resolveSelectedExecutionId(route.query?.run))

const activeRunSummary = computed(() => resolveActiveRunSummary({
  execution: execution.value,
  resultCount: resultCount.value,
}))

const emptyVariant = computed(() => resolveEmptyVariant({
  characterizationId: props.characterizationId,
  executionCount: store.executions.length,
  selectedExecutionId: selectedExecutionId.value,
  executionStatus: execution.value?.status,
  resultsError: errorMessage.value || null,
}))

const runTableSources = computed<RunTableSource[]>(() =>
  sourcesStore.sources.map((s) => ({
    sourceKey: s.sourceKey,
    sourceName: s.sourceName ?? s.sourceKey,
  }))
)

const runTableExecutions = computed<RunTableExecution[]>(() =>
  store.executions.map((e) => ({
    id: e.id,
    sourceKey: e.sourceKey,
    status: e.status,
    startTime: e.startTime,
    endTime: e.endTime ?? undefined,
    duration: e.duration,
  }))
)

const runDisabled = computed<boolean>(() => props.characterizationId == null || store.isDirty)

const runDisabledReason = computed<string>(() => resolveRunDisabledReason({
  characterizationId: props.characterizationId,
  isDirty: store.isDirty,
  translate: tv,
}))

const historySourceName = computed<string>(() => resolveHistorySourceName({
  historySourceKey: historySourceKey.value,
  sources: sourcesStore.sources,
}))

watch(
  () => props.characterizationId,
  async (id, prev) => {
    if (prev !== undefined && prev !== id) {
      store.dispose()
    }
    if (id == null) return
    if (prev !== undefined && prev !== id && route.query.run !== undefined) {
      const { run: _run, ...rest } = route.query
      void _run
      await router.replace({ query: rest })
    }
    await refreshExecutions(id)
  },
  { immediate: true },
)

watch(
  selectedExecutionId,
  async (id) => {
    if (id === null) { reset(); cohortSizes.value = {}; return }
    const ok = await load(id)
    if (!ok) errorMessage.value = error.value ?? ''
  },
  { immediate: true },
)

watch(
  [() => execution.value?.sourceKey, () => cohorts.value, () => config.value.showStdDiffCI],
  async ([sourceKey, list, ciOn]) => {
    if (!ciOn || !sourceKey || !Array.isArray(list) || list.length === 0) {
      cohortSizes.value = {}
      return
    }
    if (sourcesStore.sources.length === 0) {
      try { await sourcesStore.fetchDataSources() } catch { /* surfaced elsewhere */ }
    }
    const src = sourcesStore.sources.find(s => s.sourceKey === sourceKey)
    if (!src) { cohortSizes.value = {}; return }
    const next: Record<string, number> = {}
    const results = await Promise.all(
      list.map(c =>
        getCohortGenerationInfo(c.id).then(r => ({ id: c.id, r })).catch(() => ({ id: c.id, r: null })),
      ),
    )
    for (const { id: cohortId, r } of results) {
      if (!r || !r.success) continue
      const gen = r.data.find(g => g.id.sourceId === src.sourceId)
      if (gen && typeof gen.personCount === 'number' && gen.personCount > 0) {
        next[String(cohortId)] = gen.personCount
      }
    }
    cohortSizes.value = next
  },
  { immediate: true },
)

onMounted(async () => {
  errorMessage.value = error.value ?? ''
  if (sourcesStore.sources.length === 0) {
    try { await sourcesStore.fetchDataSources() } catch { /* surfaced via store */ }
  }
})

onBeforeUnmount(() => {
  store.dispose()
})

async function handleRun(sourceKey: string): Promise<void> {
  if (props.characterizationId == null) return
  try {
    const exec = await store.runExecution(props.characterizationId, sourceKey)
    if (exec) onRunStarted(exec)
  } catch (err) {
    logger.error('CharacterizationWorkbench', 'Run failed', err)
    const msg = err instanceof Error ? err.message : tv('cc.fa.runError', 'Failed to start generation')
    emit('snackbar', msg, 'error')
  }
}

async function handleCancel(sourceKey: string): Promise<void> {
  if (props.characterizationId == null) return
  const latest = store.executions
    .filter(e => e.sourceKey === sourceKey && !isTerminalStatus(e.status))
    .sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))[0]
  try {
    await store.cancelExecution(props.characterizationId, sourceKey, latest?.id)
  } catch (err) {
    logger.error('CharacterizationWorkbench', 'Cancel failed', err)
    const msg = err instanceof Error ? err.message : tv('cc.fa.cancelError', 'Failed to cancel generation')
    emit('snackbar', msg, 'error')
  }
}

function handleShowHistory(sourceKey: string): void {
  historySourceKey.value = sourceKey
  historyOpen.value = true
}

function onSelectHistoryExecution(id: number | string | undefined): void {
  if (id == null) return
  const numericId = typeof id === 'number' ? id : Number(id)
  if (!Number.isFinite(numericId)) return
  historyOpen.value = false
  void router.push({ query: { ...route.query, run: String(numericId) } })
}

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
  exportCharacterizationResults({
    prevalence: prevalence.value,
    distribution: distribution.value,
    cohorts: cohorts.value,
    config: config.value,
    filters: filters.value,
    cohortSizes: cohortSizes.value,
    selectedExecutionId: selectedExecutionId.value,
  })
}
</script>

<style scoped>
.char-workbench {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
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
.char-workbench--rail-collapsed {
  grid-template-columns: minmax(0, 1fr);
}
.rail-toggle {
  background: rgb(var(--v-theme-primary));
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: var(--atlas-color-on-primary);
  cursor: pointer;
  align-self: flex-start;
}
.rail-toggle:hover {
  opacity: 0.9;
}
@media (max-width: 1024px) {
  .char-workbench { grid-template-columns: 1fr; }
  .char-workbench__rail { display: none; }
}
</style>
