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
            :cohort-sizes="cohortSizes"
            @explore="onExplore"
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
import CharacterizationRunMeta from './CharacterizationRunMeta.vue'
import CharacterizationTable1View from './CharacterizationTable1View.vue'
import CharacterizationPerAnalysisView from './CharacterizationPerAnalysisView.vue'
import CharacterizationEmptyState from './CharacterizationEmptyState.vue'
import ConfigureInspector from './ConfigureInspector.vue'
import RunExecutionDialog from './RunExecutionDialog.vue'
import ResultsFilterPanel from '@/components/characterization-results/ResultsFilterPanel.vue'

import { useCharacterizationStore } from '@/stores/characterization'
import { useDataSourcesStore } from '@/stores/datasources'
import { useCharacterizationResults } from '@/composables/useCharacterizationResults'
import { isTerminalStatus } from '@/composables/useExecutionPolling'
import { getCohortGenerationInfo } from '@/services/webapi'
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
import { buildTable1 } from '@/utils/characterization-table1'

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
const sourcesStore = useDataSourcesStore()
const cohortSizes = ref<Record<string, number>>({})
const { execution, prevalence, distribution, resultCount, error, load, reset } = useCharacterizationResults()

const viewMode = ref<ViewMode>('perAnalysis')
const config = ref<Table1Config>({ ...DEFAULT_TABLE1_CONFIG })
const filters = ref<Table1Filters>({ ...DEFAULT_TABLE1_FILTERS })
const configureOpen = ref<boolean>(false)
const runDialogOpen = ref<boolean>(false)
const errorMessage = ref<string>('')

const cohorts = computed<LinkedCohort[]>(() => {
  const map = new Map<number, LinkedCohort>()
  for (const r of prevalence.value) for (const c of r.cohorts) if (!map.has(c.id)) map.set(c.id, c)
  for (const r of distribution.value) for (const c of r.cohorts) if (!map.has(c.id)) map.set(c.id, c)
  if (map.size > 0) return Array.from(map.values())
  return props.modelValue.cohorts
})

const hasStrata = computed<boolean>(() =>
  props.modelValue.stratas.length > 0
  || (props.modelValue.stratifiedBy ?? '').trim().length > 0
)

const availableAnalyses = computed<{ id: number; name: string }[]>(() => {
  const map = new Map<number, string>()
  for (const r of prevalence.value) map.set(r.analysisId, r.analysisName)
  for (const r of distribution.value) map.set(r.analysisId, r.analysisName)
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

const availableDomains = computed<string[]>(() => {
  const set = new Set<string>()
  for (const r of prevalence.value) if (r.domainId) set.add(r.domainId)
  for (const r of distribution.value) if (r.domainId) set.add(r.domainId)
  return Array.from(set).sort()
})

const availableCohortsForFilter = computed<LinkedCohort[]>(() => {
  const map = new Map<number, LinkedCohort>()
  for (const r of prevalence.value) for (const c of r.cohorts) if (!map.has(c.id)) map.set(c.id, c)
  for (const r of distribution.value) for (const c of r.cohorts) if (!map.has(c.id)) map.set(c.id, c)
  return Array.from(map.values())
})

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
    personCount: resultCount.value || undefined,
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
  const built = buildTable1({
    prevalence: prevalence.value,
    distribution: distribution.value,
    cohorts: cohorts.value,
    config: config.value,
    filters: filters.value,
    cohortSizes: cohortSizes.value,
  })
  if (built.rows.length === 0) return

  const headers: { key: string; label: string }[] = [
    { key: 'kind', label: 'Type' },
    { key: 'analysisId', label: 'Analysis ID' },
    { key: 'analysisName', label: 'Analysis' },
    { key: 'covariateId', label: 'Covariate ID' },
    { key: 'covariateName', label: 'Covariate' },
    { key: 'conceptId', label: 'Concept ID' },
  ]
  for (const col of built.columns) {
    const colLabel = col.strataLabel
      ? `${col.cohortName} · ${col.strataLabel}`
      : col.cohortName
    headers.push({ key: `${col.cohortKey}__primary`, label: `${colLabel} · primary` })
    headers.push({ key: `${col.cohortKey}__secondary`, label: `${colLabel} · secondary` })
  }
  if (built.includeStdDiff) {
    headers.push({ key: 'stdDiff', label: 'Std Diff' })
  }

  const rows: Array<Record<string, string | number | null>> = []
  for (const row of built.rows) {
    if (row.kind === 'group') continue
    const out: Record<string, string | number | null> = {
      kind: row.kind,
      analysisId: row.analysisId,
      analysisName: row.analysisName,
      covariateId: row.covariateId,
      covariateName: row.label,
      conceptId: row.conceptId,
    }
    for (const col of built.columns) {
      const cell = row.cells[col.cohortKey]
      if (cell === null || cell === undefined) {
        out[`${col.cohortKey}__primary`] = null
        out[`${col.cohortKey}__secondary`] = null
      } else if (row.kind === 'binary') {
        out[`${col.cohortKey}__primary`] = (cell as { count: number }).count
        out[`${col.cohortKey}__secondary`] = (cell as { pct: number }).pct
      } else {
        out[`${col.cohortKey}__primary`] = (cell as { primary: number }).primary
        out[`${col.cohortKey}__secondary`] = (cell as { secondary: number }).secondary
      }
    }
    if (built.includeStdDiff && row.kind === 'binary' && typeof row.stdDiff === 'number') {
      out.stdDiff = row.stdDiff
    } else {
      out.stdDiff = null
    }
    rows.push(out)
  }

  const csv = arrayToCsv(rows, headers)
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
