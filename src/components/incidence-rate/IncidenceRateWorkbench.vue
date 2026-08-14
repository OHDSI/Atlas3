<template>
  <div
    class="ir-workbench"
    :class="{ 'ir-workbench--rail-collapsed': !railOpen }"
    data-testid="ir-workbench"
  >
    <IncidenceRateDesignRail
      v-show="railOpen"
      class="ir-workbench__rail"
      data-testid="ir-workbench-rail"
      @strata:add="onStrataAdd"
      @strata:edit="onStrataEdit"
    />

    <main
      class="ir-workbench__canvas"
      data-testid="ir-workbench-canvas"
    >
      <button
        class="rail-toggle"
        :title="railOpen ? tv('components.incidenceRate.hideDesignPanel', 'Hide design panel') : tv('components.incidenceRate.showDesignPanel', 'Show design panel')"
        @click="railOpen = !railOpen"
      >
        {{ railOpen ? `◂ ${tv('components.incidenceRate.hideAnalysisDesign', 'Hide Analysis Design')}` : `▸ ${tv('components.incidenceRate.showAnalysisDesign', 'Show Analysis Design')}` }}
      </button>
      <template v-if="!store.currentIR?.id">
        <IncidenceRateEmptyState variant="no-id" />
      </template>

      <template v-else>
        <DataSourceRunTable
          :sources="runTableSources"
          :executions="runTableExecutions"
          :loading="ds.isLoading"
          :run-disabled="!store.canGenerate"
          :run-disabled-reason="runDisabledReason"
          @run="onRunSource"
          @cancel="onCancelSource"
          @show-history="onShowHistory"
        />

        <IncidenceRateCanvasToolbar
          :mode="mode"
          :active-run="activeRun"
          :selected-target-id="store.selectedTargetId"
          :selected-outcome-id="store.selectedOutcomeId"
          :multiplier="store.rateMultiplier"
          :available-targets="availableTargets"
          :available-outcomes="availableOutcomes"
          :has-results="!!report"
          @update:mode="(m) => (mode = m)"
          @update:selected-target-id="(id) => store.setSelectedTargetOutcome(id, store.selectedOutcomeId)"
          @update:selected-outcome-id="(id) => store.setSelectedTargetOutcome(store.selectedTargetId, id)"
          @update:multiplier="(m) => store.setRateMultiplier(m)"
          @export="onExport"
        />

        <IncidenceRateRunMeta
          v-if="activeRun"
          :run="activeRun"
        />

        <template v-if="emptyVariant">
          <IncidenceRateEmptyState
            :variant="emptyVariant"
            :error-message="activeRun?.message ?? undefined"
          />
        </template>
        <IncidenceRateComparisonChart
          v-if="!emptyVariant && irIdRef && sourceKeyRef && targetIdRef"
          :ir-id="irIdRef"
          :source-key="sourceKeyRef"
          :target-id="targetIdRef"
          :selected-outcome-id="store.selectedOutcomeId"
          @select="(id) => store.setSelectedTargetOutcome(store.selectedTargetId, id)"
        />
        <template v-if="report">
          <AtlasAlert
            v-if="report.summary.cases === 0"
            severity="info"
            class="mb-2"
          >
            {{ t('components.incidenceRate.noCasesFound', 'No cases found for this target/outcome combination. Try selecting a different outcome.').value }}
          </AtlasAlert>
          <template v-else>
            <IncidenceRateTreemap
              v-if="mode === 'treemap'"
              :treemap-json="report.treemapData"
              :strata-names="strataNames"
            />
            <IncidenceRateRatesTable
              v-else
              :report="report"
              :multiplier="store.rateMultiplier"
            />
          </template>
        </template>
      </template>

      <PreviousRunsDialog
        v-model="historyOpen"
        :source-name="historySourceName"
        :source-key="historySourceKey ?? ''"
        :executions="runTableExecutions"
        @select="onSelectFromHistory"
      />
    </main>

    <aside
      class="ir-workbench__insights"
      data-testid="ir-workbench-insights"
    >
      <IncidenceRateInsightsRail
        v-if="report"
        :report="report"
        :multiplier="store.rateMultiplier"
      />
    </aside>

    <IncidenceRateStratifyInspector
      v-model="strataInspectorOpen"
      :rule="strataInspectorRule"
      :concept-sets="irConceptSets"
      @update="(p) => strataInspectorIndex !== null && store.updateStratifyRule(strataInspectorIndex, p)"
      @add-concept-set="onAddStratifyConceptSet"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useIncidenceRateReport } from '@/composables/useIncidenceRateReport'
import { useIncidenceRateGeneration } from '@/composables/useIncidenceRateGeneration'
import { useDataSourcesStore } from '@/stores/datasources'
import { useI18n } from '@/composables/useI18n'
import IncidenceRateDesignRail from './IncidenceRateDesignRail.vue'
import IncidenceRateCanvasToolbar, { type ViewMode } from './IncidenceRateCanvasToolbar.vue'
import IncidenceRateRunMeta from './IncidenceRateRunMeta.vue'
import IncidenceRateTreemap from './IncidenceRateTreemap.vue'
import IncidenceRateComparisonChart from './IncidenceRateComparisonChart.vue'
import IncidenceRateRatesTable from './IncidenceRateRatesTable.vue'
import IncidenceRateInsightsRail from './IncidenceRateInsightsRail.vue'
import { AtlasAlert } from '@/components/ui'
import IncidenceRateEmptyState from './IncidenceRateEmptyState.vue'
import IncidenceRateStratifyInspector from './IncidenceRateStratifyInspector.vue'
import DataSourceRunTable, {
  type RunTableSource,
  type RunTableExecution,
} from '@/components/generation/DataSourceRunTable.vue'
import PreviousRunsDialog from '@/components/generation/PreviousRunsDialog.vue'
import { IR_TERMINAL_STATUSES } from '@/models/incidence-rate.types'
import { arrayToCsv, downloadCsv } from '@/utils/csv'
import type { ConceptSet } from '@/models/circe-types'
import type { StratifyRule } from '@/models/incidence-rate.types'
import type { GenerationStatus } from '@/models/characterization.types'

const { t, tv } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useIncidenceRateStore()
const railOpen = ref(!route.params.id)
const ds = useDataSourcesStore()

const mode = ref<ViewMode>('treemap')

const strataInspectorOpen = ref(false)
const strataInspectorIndex = ref<number | null>(null)
const strataInspectorRule = computed<StratifyRule | null>(() =>
  strataInspectorIndex.value === null
    ? null
    : (store.currentIR?.expression.strata[strataInspectorIndex.value] ?? null)
)

// Concept sets at the IR-expression level, passed into the stratify inspector.
const irConceptSets = computed<ConceptSet[]>(
  () => (store.currentIR?.expression.ConceptSets ?? []) as ConceptSet[],
)

function onAddStratifyConceptSet(cs: ConceptSet) {
  if (!store.currentIR) return
  const sets = store.currentIR.expression.ConceptSets ?? []
  if (!sets.some(s => s.id === cs.id)) {
    store.currentIR.expression.ConceptSets = [...sets, cs]
  }
}

const selectedExecutionId = computed<number | null>(() => {
  const q = route.query?.run
  if (typeof q === 'string') {
    const n = Number(q)
    return Number.isFinite(n) ? n : null
  }
  return null
})

const activeRun = computed(() =>
  selectedExecutionId.value === null ? null : store.executionById(selectedExecutionId.value)
)

const irIdRef = computed<number | null>(() => store.currentIR?.id ?? null)
const sourceKeyRef = computed<string | null>(() => activeRun.value?.sourceKey ?? null)
const targetIdRef = computed<number | null>(() => store.selectedTargetId)
const outcomeIdRef = computed<number | null>(() => store.selectedOutcomeId)

const { report } = useIncidenceRateReport(irIdRef, sourceKeyRef, targetIdRef, outcomeIdRef)

const strataNames = computed(() =>
  (store.currentIR?.expression.strata ?? []).map(s => s.name ?? '')
)

const availableTargets = computed(() =>
  (store.currentIR?.expression.targetIds ?? []).map(id => ({
    id, name: store.cohortNameById.get(id) ?? `Cohort ${id}`,
  }))
)
const availableOutcomes = computed(() =>
  (store.currentIR?.expression.outcomeIds ?? []).map(id => ({
    id, name: store.cohortNameById.get(id) ?? `Cohort ${id}`,
  }))
)

const emptyVariant = computed<'run-pending' | 'run-failed' | 'select-to' | null>(() => {
  if (!store.currentIR?.id) return null
  if (selectedExecutionId.value === null) return null
  if (activeRun.value && !IR_TERMINAL_STATUSES.has(activeRun.value.status)) return 'run-pending'
  if (activeRun.value?.status === 'FAILED') return 'run-failed'
  if (!store.selectedTargetId || !store.selectedOutcomeId) return 'select-to'
  return null
})

watch(
  [() => store.currentIR?.id, () => store.executions],
  async ([id, executions], [prevId]) => {
    if (id == null) return
    if (id !== prevId) {
      await useIncidenceRateGeneration(id).pollOnce()
    }
    if (selectedExecutionId.value === null) {
      const list = id !== prevId ? store.executions : executions
      const completed = list.find(e => e.status === 'COMPLETED' || e.status === 'COMPLETE')
      if (completed) await router.replace({ query: { ...route.query, run: String(completed.id) } })
    }
    if (store.selectedTargetId === null && store.currentIR?.expression.targetIds.length) {
      store.setSelectedTargetOutcome(
        store.currentIR.expression.targetIds[0]!,
        store.currentIR.expression.outcomeIds[0] ?? null
      )
    }
  },
  { immediate: true },
)

function onSelectRun(id: number) {
  void router.replace({ query: { ...route.query, run: String(id) } })
}

onMounted(async () => {
  if (ds.sources.length === 0 && !ds.isLoading) await ds.fetchDataSources()
})

const runTableSources = computed<RunTableSource[]>(() =>
  ds.sources.map(s => ({ sourceKey: s.sourceKey, sourceName: s.sourceName }))
)

function mapStatus(raw: string): GenerationStatus {
  return raw === 'COMPLETE' ? 'COMPLETED' : (raw as GenerationStatus)
}

const runTableExecutions = computed<RunTableExecution[]>(() =>
  store.executions.map(e => ({
    id: e.id,
    sourceKey: e.sourceKey,
    status: mapStatus(e.status),
    startTime: e.startTime ?? undefined,
    duration: e.duration ?? undefined,
  }))
)

const runDisabledReason = computed(() => {
  if (store.isPreviewMode) return tv('common.previewMode', 'Preview mode')
  if (store.isDirty) return tv('components.generation.unsavedChanges', 'Save changes before running')
  if (store.hasErrors) return tv('components.generation.fixErrors', 'Resolve validation errors before running')
  return ''
})

async function onRunSource(sourceKey: string) {
  const id = store.currentIR?.id
  if (id == null) return
  await useIncidenceRateGeneration(id).start(sourceKey)
}

async function onCancelSource(sourceKey: string) {
  const id = store.currentIR?.id
  if (id == null) return
  await useIncidenceRateGeneration(id).cancel(sourceKey)
}

const historyOpen = ref(false)
const historySourceKey = ref<string | null>(null)
const historySourceName = computed(() => {
  if (!historySourceKey.value) return ''
  return ds.sources.find(s => s.sourceKey === historySourceKey.value)?.sourceName ?? historySourceKey.value
})

function onShowHistory(sourceKey: string) {
  historySourceKey.value = sourceKey
  historyOpen.value = true
}

function onSelectFromHistory(id: number | string) {
  historyOpen.value = false
  if (typeof id === 'number') onSelectRun(id)
  else {
    const n = Number(id)
    if (Number.isFinite(n)) onSelectRun(n)
  }
}

function onStrataAdd() {
  const newRule: StratifyRule = {
    name: `Rule ${(store.currentIR?.expression.strata.length ?? 0) + 1}`,
    description: '',
    expression: { Type: 'ALL', CriteriaList: [] },
  }
  store.addStratifyRule(newRule)
  strataInspectorIndex.value = (store.currentIR?.expression.strata.length ?? 1) - 1
  strataInspectorOpen.value = true
}

function onStrataEdit(index: number) {
  strataInspectorIndex.value = index
  strataInspectorOpen.value = true
}

function onExport(format: 'csv' | 'svg' | 'png') {
  if (format === 'csv' && report.value) {
    type CsvRow = { name: string; totalPersons: number; cases: number; timeAtRisk: number }
    const rows: CsvRow[] = [
      {
        name: 'Summary',
        totalPersons: report.value.summary.totalPersons,
        cases: report.value.summary.cases,
        timeAtRisk: report.value.summary.timeAtRisk,
      },
      ...report.value.stratifyStats.map(s => ({
        name: s.name,
        totalPersons: s.totalPersons,
        cases: s.cases,
        timeAtRisk: s.timeAtRisk,
      })),
    ]
    const headers: { key: keyof CsvRow; label: string }[] = [
      { key: 'name',         label: 'Stratum' },
      { key: 'totalPersons', label: 'Persons' },
      { key: 'cases',        label: 'Cases' },
      { key: 'timeAtRisk',   label: 'TAR (days)' },
    ]
    downloadCsv(`incidence-rate-${selectedExecutionId.value ?? 'results'}.csv`, arrayToCsv(rows, headers))
  }
}
</script>

<style scoped>
.ir-workbench {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 280px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  overflow: hidden;
  min-height: 540px;
}
.ir-workbench__rail { border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08); }
.ir-workbench__insights { border-left: 1px solid rgba(var(--v-theme-on-surface), 0.08); }
.ir-workbench__canvas {
  padding: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  display: flex; flex-direction: column; gap: 10px;
  min-height: 540px; min-width: 0; position: relative;
}
@media (max-width: 1280px) {
  .ir-workbench { grid-template-columns: 320px minmax(0, 1fr); }
  .ir-workbench__insights { display: none; }
}
.ir-workbench--rail-collapsed {
  grid-template-columns: minmax(0, 1fr) 280px;
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
  .ir-workbench { grid-template-columns: 1fr; }
  .ir-workbench__rail { display: none; }
}
</style>
