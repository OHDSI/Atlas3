<template>
  <div
    class="workbench"
    :class="{ 'workbench--rail-collapsed': !railOpen }"
  >
    <aside
      v-show="railOpen"
      class="workbench__design"
      data-testid="workbench-design-rail"
    >
      <PathwayDesignForm />
    </aside>

    <main
      class="workbench__canvas"
      data-testid="workbench-canvas"
    >
      <button
        class="rail-toggle"
        :title="
          railOpen
            ? t('components.workbench.hideDesignPanel').value
            : t('components.workbench.showDesignPanel').value
        "
        @click="railOpen = !railOpen"
      >
        {{
          railOpen
            ? '◂ ' + t('components.workbench.hideAnalysisDesign').value
            : '▸ ' + t('components.workbench.showAnalysisDesign').value
        }}
      </button>
      <DataSourceRunTable
        v-if="pathwayId"
        :sources="runTableSources"
        :executions="runTableExecutions"
        :selected-execution-id="selectedExecutionId ?? null"
        :loading="executionsLoading"
        :run-disabled="!canGenerate"
        :run-disabled-reason="runDisabledReason"
        @run="onRun"
        @cancel="onCancel"
        @select-result="onHistorySelect"
        @show-history="onShowHistory"
      />

      <PathwayCanvasToolbar
        :mode="mode"
        :active-run="activeRunSummary"
        :coverage="coverageProps"
        @update:mode="v => (mode = v)"
      />

      <div
        v-if="!pathwayId"
        class="workbench__canvas-empty"
        data-testid="canvas-empty"
      >
        <div class="workbench__canvas-empty-icon" />
        <h3>
          {{ t('pathway.workbench.emptyChartTitle').value }}
        </h3>
        <p>
          {{
            t('pathway.workbench.emptyChartHint').value
          }}
        </p>
      </div>

      <div
        v-else-if="!selectedExecutionId"
        class="workbench__canvas-empty"
        data-testid="canvas-no-run"
      >
        <div class="workbench__canvas-empty-icon" />
        <h3>{{ t('pathway.workbench.noRunYetTitle').value }}</h3>
        <p>
          {{
            t('pathway.workbench.noRunYetHint').value
          }}
        </p>
      </div>

      <div
        v-else
        class="workbench__results"
      >
        <template v-if="design && results">
          <template v-if="mode === 'visual'">
            <PathwayCohortResults
              v-for="row in resultRows"
              :key="row.targetCohortId"
              :design="design"
              :results="results"
              :target-cohort-id="row.targetCohortId"
              :group="row.group"
              :cohort-name="row.cohortName"
              :colors="colors"
            />
          </template>
          <PathwayTableView
            v-else
            :design="design"
            :results="results"
          />
        </template>
      </div>
    </main>
    <PreviousRunsDialog
      v-model="historyOpen"
      :source-name="historySourceName"
      :source-key="historySourceKey"
      :executions="runTableExecutions"
      :selected-id="selectedExecutionId ?? null"
      @select="onHistorySelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from '@/composables/useI18n'
import { usePathwayResults } from '@/composables/usePathwayResults'
import { usePathwayGeneration } from '@/composables/usePathwayGeneration'
import { usePathwayStore } from '@/stores/pathway'
import { useDataSourcesStore } from '@/stores/datasources'
import { listPathwayExecutions } from '@/services/pathway.service'
import { logger } from '@/utils/logger'
import PathwayDesignForm from './PathwayDesignForm.vue'
import PathwayCohortResults from './results/PathwayCohortResults.vue'
import PathwayTableView from './results/PathwayTableView.vue'
import PathwayCanvasToolbar from './PathwayCanvasToolbar.vue'
import DataSourceRunTable from '@/components/generation/DataSourceRunTable.vue'
import PreviousRunsDialog from '@/components/generation/PreviousRunsDialog.vue'
import type {
  RunTableSource,
  RunTableExecution,
} from '@/components/generation/DataSourceRunTable.vue'
import type { PathwayExecution } from '@/models/pathway.types'
import {
  buildColorMap,
  buildCohortResultRows,
  buildCoverageProps,
  buildRunTableExecutions,
  resolveActiveRunSummary,
  resolveHistorySourceName,
} from './pathway-workbench-state'
import {
  cancelPathwayGeneration,
  maybeFetchPathwaySources,
  refreshPathwayExecutions,
  runPathwayGeneration,
} from './pathway-workbench-actions'

const props = defineProps<{
  pathwayId: number | null
  selectedExecutionId?: number | null
}>()

const emit = defineEmits<{
  'execution:select': [id: number]
}>()

const { t, tv } = useI18n()
const { design, results, load } = usePathwayResults()
const pathwayStore = usePathwayStore()
const dsStore = useDataSourcesStore()
const { canGenerate } = storeToRefs(pathwayStore)

type Generation = ReturnType<typeof usePathwayGeneration>
const generation = shallowRef<Generation | null>(null)

watch(
  () => props.pathwayId,
  id => {
    generation.value?.stopPolling()
    generation.value = id ? usePathwayGeneration(id) : null
  },
  { immediate: true }
)

const railOpen = ref(props.pathwayId === null)
const mode = ref<'visual' | 'tabular'>('visual')
const executions = ref<PathwayExecution[]>([])
const executionsLoading = ref(false)
const historyOpen = ref(false)
const historySourceKey = ref('')

const runDisabledReason = tv('pathway.workbench.runDisabledReason')

const resultRows = computed(() => buildCohortResultRows(design.value, results.value))

const colorMap = computed(() => buildColorMap({
  results: results.value,
  design: design.value,
}))
const colors = (key: string): string => colorMap.value.get(key) ?? '#ccc'

const activeRunSummary = computed(() => resolveActiveRunSummary(props.selectedExecutionId))

const coverageProps = computed(() => buildCoverageProps(results.value?.pathwayGroups[0] ?? null))

const runTableSources = computed<RunTableSource[]>(() =>
  dsStore.sources.map(s => ({ sourceId: s.sourceId, sourceKey: s.sourceKey, sourceName: s.sourceName }))
)

const runTableExecutions = computed<RunTableExecution[]>(() => buildRunTableExecutions({
  executions: executions.value,
  liveExecution: generation.value?.execution.value ?? null,
}))

const historySourceName = computed(() => resolveHistorySourceName({
  sourceKey: historySourceKey.value,
  sources: dsStore.sources,
}))

async function refreshExecutions() {
  await refreshPathwayExecutions({
    pathwayId: props.pathwayId,
    selectedExecutionId: props.selectedExecutionId,
    listExecutions: listPathwayExecutions,
    onExecutions: value => { executions.value = value },
    onLoading: value => { executionsLoading.value = value },
    onSelectExecution: id => emit('execution:select', id),
    logError: (message, error) => logger.error('PathwayWorkbench', message, error),
  })
}

async function onRun(sourceKey: string) {
  await runPathwayGeneration({
    generation: generation.value,
    sourceKey,
    refreshExecutions,
    logError: (message, error) => logger.error('PathwayWorkbench', message, error),
  })
}

async function onCancel(sourceKey: string) {
  await cancelPathwayGeneration({
    generation: generation.value,
    sourceKey,
    refreshExecutions,
    logError: (message, error) => logger.error('PathwayWorkbench', message, error),
  })
}

function onShowHistory(sourceKey: string) {
  historySourceKey.value = sourceKey
  historyOpen.value = true
}

function onHistorySelect(id: number | string | undefined) {
  if (id == null) return
  const numericId = typeof id === 'number' ? id : Number(id)
  if (Number.isFinite(numericId)) emit('execution:select', numericId)
  historyOpen.value = false
}

watch(
  () => props.selectedExecutionId,
  id => {
    if (Number.isFinite(id) && id && id > 0) load(id)
  },
  { immediate: true }
)

watch(() => props.pathwayId, refreshExecutions, { immediate: true })

watch(
  () => generation.value?.polling.value,
  (now, prev) => {
    if (prev && !now) refreshExecutions()
  }
)

// A run started by the agent doesn't go through this component's generation
// composable, so nothing was polling it: the page showed "No runs yet" until a
// manual reload, making a perfectly good run look like it never happened. Poll
// here until the newest execution reaches a terminal state.
const AGENT_POLL_MS = 2000
const AGENT_POLL_MAX = 150
let agentPollTimer: ReturnType<typeof setInterval> | null = null

function stopAgentPolling() {
  if (agentPollTimer) {
    clearInterval(agentPollTimer)
    agentPollTimer = null
  }
}

watch(
  () => pathwayStore.agentGenerationSignal,
  () => {
    stopAgentPolling()
    let ticks = 0
    void refreshExecutions()
    agentPollTimer = setInterval(async () => {
      ticks += 1
      await refreshExecutions()
      const latest = executions.value?.[0]
      const terminal = latest && ['COMPLETED', 'FAILED', 'CANCELED'].includes(latest.status)
      if (terminal || ticks >= AGENT_POLL_MAX) stopAgentPolling()
    }, AGENT_POLL_MS)
  }
)

onBeforeUnmount(stopAgentPolling)

onMounted(async () => {
  await maybeFetchPathwaySources({
    sourceCount: dsStore.sources.length,
    isLoading: dsStore.isLoading,
    fetchDataSources: () => dsStore.fetchDataSources(),
  })
})

onBeforeUnmount(() => {
  generation.value?.stopPolling()
})
</script>

<style scoped>
.workbench {
  display: grid;
  grid-template-columns: 50% minmax(0, 1fr);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  overflow: hidden;
  min-height: 540px;
}

.workbench__design {
  padding: 14px;
  overflow-y: auto;
}
.workbench__design {
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.workbench__canvas {
  padding: 18px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 540px;
  position: relative;
}
.workbench__canvas-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: rgb(var(--v-theme-surface));
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 8px;
  padding: 32px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  gap: 8px;
}
.workbench__canvas-empty h3 {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
  font-size: 16px;
}
.workbench__canvas-empty p {
  margin: 0 0 8px;
  max-width: 360px;
  font-size: 13px;
}
.workbench__canvas-empty-icon {
  font-size: 42px;
  opacity: 0.7;
  line-height: 1;
}

.workbench__results {
  flex: 1;
  min-width: 0;
}

.workbench--rail-collapsed {
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
@media (max-width: 1280px) {
  .workbench {
    grid-template-columns: 50% minmax(0, 1fr);
  }
  .workbench--rail-collapsed {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 1024px) {
  .workbench {
    grid-template-columns: 1fr;
  }
  .workbench__design {
    display: none;
  }
}
</style>
