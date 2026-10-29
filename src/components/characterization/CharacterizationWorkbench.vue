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
          ? tv('components.workbench.hideDesignPanel')
          : tv('components.workbench.showDesignPanel')"
        @click="railOpen = !railOpen"
      >
        {{ railOpen
          ? '◂ ' + tv('components.workbench.hideAnalysisDesign')
          : '▸ ' + tv('components.workbench.showAnalysisDesign') }}
      </button>
      <AtlasCollapsibleSection
        :title="t('cohortDefinitions.generation.section.title').value"
        :default-expanded="true"
      >
        <template #controls>
          <AtlasSwitch
            v-model="onlyGenerated"
            :label="t('cohortDefinitions.generation.section.onlyGenerated').value"
          />
        </template>
        <DataSourceRunTable
          :sources="visibleRunTableSources"
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
      </AtlasCollapsibleSection>

      <template v-if="characterizationId">
        <CharacterizationCanvasToolbar
          v-model:configure-open="configureOpen"
          :mode="viewMode"
          :active-run="activeRunSummary"
          :threshold="filters.threshold"
          :has-results="prevalence.length > 0 || distribution.length > 0"
          @update:mode="(m) => (viewMode = m)"
          @update:threshold="(v) => (filters.threshold = v)"
          @export="onExport"
        >
          <template #configure-panel>
            <ConfigureInspector
              :open="true"
              :config="config"
              :cohort-count="cohorts.length"
              :has-strata="hasStrata"
              @update:config="(c) => (config = c)"
              @close="configureOpen = false"
            />
          </template>
        </CharacterizationCanvasToolbar>

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
          :selected-cohort-ids="filters.selectedCohortIds"
          :search="filters.search"
          @update:search="(v) => (filters.search = v)"
          @update:selected-analysis-ids="(v) => (filters.selectedAnalysisIds = v)"
          @update:selected-domains="(v) => (filters.selectedDomains = v)"
          @update:selected-cohort-ids="(v) => (filters.selectedCohortIds = v)"
        />

        <div
          v-if="resultsLoading"
          class="char-workbench__results-loading"
          role="status"
          aria-live="polite"
          data-testid="char-results-loading"
        >
          <AtlasProgressCircular
            indeterminate
            size="40"
          />
          <span>{{ tv('common.loadingWithDots') }}</span>
        </div>

        <CharacterizationEmptyState
          v-else-if="emptyVariant"
          :variant="emptyVariant"
          :error-message="emptyVariant === 'run-failed' || emptyVariant === 'results-error' ? errorMessage : undefined"
        />

        <template v-else>
          <AtlasAlert
            v-if="showTimeSeriesComparativeNote"
            severity="info"
            class="mb-4"
            data-testid="char-results-time-series-note"
          >
            {{ tv('components.characterizationResults.timeSeriesComparativeNote') }}
          </AtlasAlert>
          <CharacterizationTable1View
            v-if="viewMode === 'table1'"
            :prevalence="prevalence"
            :distribution="distribution"
            :cohorts="cohorts"
            :config="config"
            :filters="filters"
            :cohort-sizes="reportedCohortSizes"
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
            :search="filters.search"
            :selected-cohort-ids="filters.selectedCohortIds"
            :strata-counts="strataCounts"
            @explore="onExplore"
          />
        </template>
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

import { AtlasAlert, AtlasProgressCircular } from '@/components/ui'
import AtlasCollapsibleSection from '@/components/ui/AtlasCollapsibleSection.vue'
import AtlasSwitch from '@/components/ui/AtlasSwitch.vue'
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
import { getCharacterizationDesignSnapshot } from '@/services/characterization.service'
import { logger } from '@/utils/logger'
import { overallCohortSizes } from '@/utils/characterization-result-mapper'
import { filterGeneratedSources } from '@/utils/generation-source-filter'
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
const { t, tv } = useI18n()
const store = useCharacterizationStore()
const sourcesStore = useDataSourcesStore()
const cohortSizes = ref<Record<string, number>>({})
const { execution, prevalence, distribution, strataCounts, resultCount, error, loading: resultsLoading, load, reset } = useCharacterizationResults()

const railOpen = ref(!route.params.id)
const viewMode = ref<ViewMode>('perAnalysis')
const config = ref<Table1Config>({ ...DEFAULT_TABLE1_CONFIG })
const filters = ref<Table1Filters>({ ...DEFAULT_TABLE1_FILTERS })
const configureOpen = ref<boolean>(false)
const errorMessage = ref<string>('')
const generationDesign = ref<CharacterizationDefinition | null>(null)

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
  if (generationDesign.value) {
    return generationDesign.value.featureAnalyses.map(analysis => ({
      id: analysis.id,
      name: analysis.name ?? String(analysis.id),
    }))
  }
  const map = new Map<number, string>()
  for (const r of prevalence.value) map.set(r.analysisId, r.analysisName)
  for (const r of distribution.value) map.set(r.analysisId, r.analysisName)
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

const availableDomains = computed<string[]>(() => {
  if (generationDesign.value) {
    const domains = new Set<string>()
    for (const analysis of generationDesign.value.featureAnalyses) {
      if (analysis.domain) domains.add(analysis.domain)
    }
    return Array.from(domains).sort()
  }
  const domains = new Set<string>()
  for (const result of prevalence.value) if (result.domainId) domains.add(result.domainId)
  for (const result of distribution.value) if (result.domainId) domains.add(result.domainId)
  return Array.from(domains).sort()
})

const availableCohortsForFilter = computed<LinkedCohort[]>(() =>
  generationDesign.value?.cohorts ?? props.modelValue.cohorts
)

// WebAPI only returns annual/temporal data with single-cohort reports, so with
// two cohorts compared side by side the user has to narrow to one to see it.
const showTimeSeriesComparativeNote = computed<boolean>(() => {
  const selected = filters.value.selectedCohortIds
  const shown = selected.length
    ? cohorts.value.filter(cohort => selected.includes(cohort.id))
    : cohorts.value
  if (shown.length !== 2) return false
  const design = generationDesign.value ?? props.modelValue
  return design.featureAnalyses.some(fa => fa.includeAnnual || fa.includeTemporal)
})

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
    sourceId: s.sourceId,
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

const onlyGenerated = ref(false)
const visibleRunTableSources = computed(() =>
  onlyGenerated.value
    ? filterGeneratedSources(runTableSources.value, runTableExecutions.value)
    : runTableSources.value
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
  [
    selectedExecutionId,
    () => filters.value.selectedAnalysisIds,
    () => filters.value.selectedDomains,
    () => filters.value.selectedCohortIds,
    () => filters.value.threshold,
  ],
  async ([id]) => {
    if (id === null) { reset(); cohortSizes.value = {}; return }
    await loadSelectedResults(id)
  },
  { immediate: true, deep: true },
)

async function loadSelectedResults(id: number): Promise<void> {
  const ok = await load(id, {
    analysisIds: filters.value.selectedAnalysisIds,
    domainIds: filters.value.selectedDomains,
    cohortIds: filters.value.selectedCohortIds,
    thresholdValuePct: filters.value.threshold / 100,
  })
  errorMessage.value = ok ? '' : (error.value ?? '')
}

// `execution` is a snapshot taken when the results were loaded, while polling
// updates `store.executions`. Reload once the selected run reaches a terminal
// status so the pending state gives way to the results.
const selectedPolledStatus = computed(() =>
  store.executions.find(e => e.id === selectedExecutionId.value)?.status,
)

let terminalReloadFor: number | null = null

watch([selectedPolledStatus, () => execution.value?.status], ([polledStatus, loadedStatus]) => {
  const id = selectedExecutionId.value
  if (id === null || !polledStatus || !isTerminalStatus(polledStatus)) return
  if (!loadedStatus || isTerminalStatus(loadedStatus) || terminalReloadFor === id) return
  terminalReloadFor = id
  void loadSelectedResults(id)
})

watch(
  selectedExecutionId,
  async (id) => {
    generationDesign.value = null
    if (id === null) return
    const result = await getCharacterizationDesignSnapshot(id)
    if (selectedExecutionId.value === id && result.success) generationDesign.value = result.data
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

// The run's own person counts (from WebAPI's strataCounts) describe the people
// analysed, so they win over the cohort's current generation size.
const reportedCohortSizes = computed<Record<string, number>>(() => ({
  ...cohortSizes.value,
  ...overallCohortSizes(strataCounts.value),
}))

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
    const msg = err instanceof Error ? err.message : tv('cc.fa.runError')
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
    const msg = err instanceof Error ? err.message : tv('cc.fa.cancelError')
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
    cohortSizes: reportedCohortSizes.value,
    selectedExecutionId: selectedExecutionId.value,
  })
}
</script>

<style scoped>
.char-workbench {
  display: grid;
  grid-template-columns: 50% minmax(0, 1fr);
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
.char-workbench__results-loading {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
  display: flex;
  flex-direction: column;
  font-size: 13px;
  gap: 12px;
  justify-content: center;
  padding: 64px 24px;
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
