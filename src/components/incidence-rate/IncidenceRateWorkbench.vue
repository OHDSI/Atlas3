<template>
  <div
    class="ir-workbench"
    data-testid="ir-workbench"
  >
    <IncidenceRateDesignRail
      class="ir-workbench__rail"
      data-testid="ir-workbench-rail"
      :active-run-id="selectedExecutionId"
      @select-run="onSelectRun"
      @strata:add="onStrataAdd"
      @strata:edit="onStrataEdit"
    />

    <main
      class="ir-workbench__canvas"
      data-testid="ir-workbench-canvas"
    >
      <template v-if="!store.currentIR?.id">
        <IncidenceRateEmptyState variant="no-id" />
      </template>

      <template v-else>
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
            @run="$emit('open-generate')"
          />
        </template>
        <template v-else-if="report">
          <IncidenceRateTreemap
            v-if="mode === 'treemap'"
            ref="treemapRef"
            :treemap-json="report.treemapData"
          />
          <IncidenceRateRatesTable
            v-else
            :report="report"
            :multiplier="store.rateMultiplier"
          />
        </template>
      </template>
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
      @update="(p) => strataInspectorIndex !== null && store.updateStratifyRule(strataInspectorIndex, p)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { v4 as uuidv4 } from 'uuid'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useIncidenceRateReport } from '@/composables/useIncidenceRateReport'
import { useIncidenceRateGeneration } from '@/composables/useIncidenceRateGeneration'
import IncidenceRateDesignRail from './IncidenceRateDesignRail.vue'
import IncidenceRateCanvasToolbar, { type ViewMode } from './IncidenceRateCanvasToolbar.vue'
import IncidenceRateRunMeta from './IncidenceRateRunMeta.vue'
import IncidenceRateTreemap from './IncidenceRateTreemap.vue'
import IncidenceRateRatesTable from './IncidenceRateRatesTable.vue'
import IncidenceRateInsightsRail from './IncidenceRateInsightsRail.vue'
import IncidenceRateEmptyState from './IncidenceRateEmptyState.vue'
import IncidenceRateStratifyInspector from './IncidenceRateStratifyInspector.vue'
import { IR_TERMINAL_STATUSES } from '@/models/incidence-rate.types'
import { downloadPNG, downloadSVG } from '@/utils/treemap-export'
import { arrayToCsv, downloadCsv } from '@/utils/csv'
import type { CriteriaGroup } from '@/models/cohort.types'
import type { StratifyRule } from '@/models/incidence-rate.types'

defineEmits<{ 'open-generate': [] }>()

const route = useRoute()
const router = useRouter()
const store = useIncidenceRateStore()

const mode = ref<ViewMode>('treemap')
const treemapRef = ref<InstanceType<typeof IncidenceRateTreemap> | null>(null)

const strataInspectorOpen = ref(false)
const strataInspectorIndex = ref<number | null>(null)
const strataInspectorRule = computed<StratifyRule | null>(() =>
  strataInspectorIndex.value === null
    ? null
    : (store.currentIR?.expression.strata[strataInspectorIndex.value] ?? null)
)

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

const emptyVariant = computed<'no-runs' | 'run-pending' | 'run-failed' | 'select-to' | null>(() => {
  if (!store.currentIR?.id) return null
  if (store.executions.length === 0) return 'no-runs'
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
      const completed = list.find(e => e.status === 'COMPLETED')
      if (completed) await router.replace({ query: { ...route.query, run: String(completed.id) } })
    }
  },
  { immediate: true },
)

function onSelectRun(id: number) {
  void router.replace({ query: { ...route.query, run: String(id) } })
}

function onStrataAdd() {
  const newRule: StratifyRule = {
    name: `Rule ${(store.currentIR?.expression.strata.length ?? 0) + 1}`,
    description: '',
    expression: { id: uuidv4(), logicType: 'ALL', events: [] } as CriteriaGroup,
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
  if (format === 'svg' && treemapRef.value?.svgRef) {
    downloadSVG(treemapRef.value.svgRef, 'incidence-rate.svg')
  } else if (format === 'png' && treemapRef.value?.svgRef) {
    void downloadPNG(treemapRef.value.svgRef, 'incidence-rate.png')
  } else if (format === 'csv' && report.value) {
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
  grid-template-columns: 240px minmax(0, 1fr) 280px;
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
  .ir-workbench { grid-template-columns: 240px minmax(0, 1fr); }
  .ir-workbench__insights { display: none; }
}
@media (max-width: 1024px) {
  .ir-workbench { grid-template-columns: 1fr; }
  .ir-workbench__rail { display: none; }
}
</style>
