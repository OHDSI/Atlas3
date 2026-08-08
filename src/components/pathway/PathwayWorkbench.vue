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
            ? t('components.pathwayWorkbench.hideDesignPanel', 'Hide design panel').value
            : t('components.pathwayWorkbench.showDesignPanel', 'Show design panel').value
        "
        @click="railOpen = !railOpen"
      >
        {{
          railOpen
            ? '◂ ' + t('components.pathwayWorkbench.hideAnalysisDesign', 'Hide Analysis Design').value
            : '▸ ' + t('components.pathwayWorkbench.showAnalysisDesign', 'Show Analysis Design').value
        }}
      </button>
      <PathwayCanvasToolbar
        :mode="mode"
        :active-run="activeRunSummary"
        :coverage="coverageProps"
        @update:mode="v => (mode = v)"
      />

      <DataSourceRunTable
        v-if="pathwayId"
        :sources="runTableSources"
        :executions="runTableExecutions"
        :loading="executionsLoading"
        :run-disabled="!canGenerate"
        :run-disabled-reason="runDisabledReason"
        @run="onRun"
        @cancel="onCancel"
        @show-history="onShowHistory"
      />

      <div
        v-if="!pathwayId"
        class="workbench__canvas-empty"
        data-testid="canvas-empty"
      >
        <div class="workbench__canvas-empty-icon" />
        <h3>
          {{ t('pathway.workbench.emptyChartTitle', 'Your sunburst will appear here').value }}
        </h3>
        <p>
          {{
            t(
              'pathway.workbench.emptyChartHint',
              'Pick at least one target cohort and a few event cohorts on the left, then run a generation against a data source.'
            ).value
          }}
        </p>
      </div>

      <div
        v-else-if="!selectedExecutionId"
        class="workbench__canvas-empty"
        data-testid="canvas-no-run"
      >
        <div class="workbench__canvas-empty-icon" />
        <h3>{{ t('pathway.workbench.noRunYetTitle', 'No runs yet').value }}</h3>
        <p>
          {{
            t(
              'pathway.workbench.noRunYetHint',
              'Generate against a data source to see the sunburst.'
            ).value
          }}
        </p>
      </div>

      <div
        v-else
        class="workbench__sunburst-stage"
      >
        <PathwaySunburst
          v-if="mode === 'visual' && design && results && targetGroup"
          :design="design"
          :results="results"
          :target-cohort-id="targetGroup.targetCohortId"
          :colors="colors"
          @pathway:select="onPathSelect"
        />
        <PathwayTableView
          v-else-if="design && results && targetGroup"
          :design="design"
          :results="results"
          :target-cohort-id="targetGroup.targetCohortId"
        />
      </div>
    </main>

    <aside
      class="workbench__insights"
      data-testid="workbench-insights-rail"
    >
      <template v-if="targetGroup">
        <PathwayCoverageStat
          :total-pathways-count="targetGroup.totalPathwaysCount"
          :target-cohort-count="targetGroup.targetCohortCount"
          :target-cohort-name="targetCohortName"
        />
        <div class="workbench__sec-label">
          {{ t('pathway.workbench.legend', 'Legend').value }}
        </div>
        <PathwayLegend
          :design="design!"
          :colors="colors"
          :event-codes="results?.eventCodes"
          :target-cohort-name="targetCohortName"
          :target-cohort-count="targetGroup.targetCohortCount"
          :total-pathways-count="targetGroup.totalPathwaysCount"
        />
        <div class="workbench__sec-label">
          {{ t('pathway.workbench.selectedPath', 'Selected path').value }}
        </div>
        <PathwayPathStats
          v-if="pathStats"
          :stats="pathStats"
          :colors="colors"
        />
        <div
          v-else
          class="workbench__insights-hint"
          data-testid="insights-empty-hint"
        >
          {{
            t('pathway.workbench.selectPathHint', 'Click a slice to inspect a treatment path').value
          }}
        </div>
      </template>
      <div
        v-else
        class="workbench__insights-hint"
        data-testid="insights-empty-hint"
      >
        {{ t('pathway.workbench.insightsEmptyHint', 'Insights appear after the first run.').value }}
      </div>
    </aside>

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
import { computePathStats } from '@/utils/pathway-path-stats'
import { listPathwayExecutions } from '@/services/pathway.service'
import { logger } from '@/utils/logger'
import PathwayDesignForm from './PathwayDesignForm.vue'
import PathwaySunburst from './results/PathwaySunburst.vue'
import PathwayTableView from './results/PathwayTableView.vue'
import PathwayCanvasToolbar from './PathwayCanvasToolbar.vue'
import PathwayCoverageStat from './results/PathwayCoverageStat.vue'
import PathwayLegend from './results/PathwayLegend.vue'
import PathwayPathStats from './results/PathwayPathStats.vue'
import DataSourceRunTable from '@/components/generation/DataSourceRunTable.vue'
import PreviousRunsDialog from '@/components/generation/PreviousRunsDialog.vue'
import type {
  RunTableSource,
  RunTableExecution,
} from '@/components/generation/DataSourceRunTable.vue'
import type { PathwayExecution } from '@/models/pathway.types'

const PALETTE_20 = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
  '#aec7e8',
  '#ffbb78',
  '#98df8a',
  '#ff9896',
  '#c5b0d5',
  '#c49c94',
  '#f7b6d2',
  '#c7c7c7',
  '#dbdb8d',
  '#9edae5',
]

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELED'])

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
const selectedPath = ref<{ path: string } | null>(null)
const executions = ref<PathwayExecution[]>([])
const executionsLoading = ref(false)
const historyOpen = ref(false)
const historySourceKey = ref('')

const runDisabledReason = tv(
  'pathway.workbench.runDisabledReason',
  'Save the design before generating'
)

const targetGroup = computed(() => results.value?.pathwayGroups[0] ?? null)

const targetCohortName = computed(() => {
  if (!design.value || !targetGroup.value) return ''
  return (
    design.value.targetCohorts.find(c => c.id === targetGroup.value!.targetCohortId)?.name ?? ''
  )
})

const colorMap = computed(() => {
  const map = new Map<string, string>()
  const singleCodes = (results.value?.eventCodes ?? [])
    .filter(ec => !ec.isCombo)
    .sort((a, b) => a.code - b.code)
  if (singleCodes.length > 0) {
    singleCodes.forEach((ec, i) => {
      map.set(String(ec.code), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
    })
  } else if (design.value) {
    design.value.eventCohorts.forEach((cohort, i) => {
      const bit = cohort.code != null ? (1 << cohort.code) : (1 << i)
      map.set(String(bit), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
    })
  }
  return map
})
const colors = (key: string): string => colorMap.value.get(key) ?? '#ccc'

const activeRunSummary = computed(() => {
  if (!props.selectedExecutionId) return null
  return { id: props.selectedExecutionId, sourceKey: '—', age: undefined }
})

const coverageProps = computed(() => ({
  totalPathwaysCount: targetGroup.value?.totalPathwaysCount ?? 0,
  targetCohortCount: targetGroup.value?.targetCohortCount ?? 0,
}))

const pathStats = computed(() => {
  if (!design.value || !results.value || !targetGroup.value) return null
  return computePathStats({
    design: design.value,
    results: results.value,
    targetCohortId: targetGroup.value.targetCohortId,
    selectedPath: selectedPath.value,
  })
})

const runTableSources = computed<RunTableSource[]>(() =>
  dsStore.sources.map(s => ({ sourceKey: s.sourceKey, sourceName: s.sourceName }))
)

function toMs(v: string | number | undefined): number | undefined {
  if (v === undefined) return undefined
  if (typeof v === 'number') return v
  const n = Date.parse(v)
  return Number.isNaN(n) ? undefined : n
}

const runTableExecutions = computed<RunTableExecution[]>(() => {
  const rows: RunTableExecution[] = executions.value.map(e => {
    const start = toMs(e.startTime) ?? toMs(e.executionDate)
    const end = toMs(e.endTime)
    return {
      id: e.id,
      sourceKey: e.sourceKey,
      status: e.status,
      startTime: start,
      endTime: end,
      duration: e.duration,
    }
  })

  const live = generation.value?.execution.value
  if (live && !TERMINAL_STATUSES.has(live.status)) {
    const idx = rows.findIndex(r => r.sourceKey === live.sourceKey)
    const liveRow: RunTableExecution = {
      id: live.id,
      sourceKey: live.sourceKey,
      status: live.status,
      startTime: toMs(live.startTime) ?? toMs(live.executionDate),
    }
    if (idx >= 0) rows[idx] = liveRow
    else rows.unshift(liveRow)
  }

  return rows
})

const historySourceName = computed(() => {
  const match = dsStore.sources.find(s => s.sourceKey === historySourceKey.value)
  return match?.sourceName ?? historySourceKey.value
})

async function refreshExecutions() {
  if (!props.pathwayId) {
    executions.value = []
    return
  }
  executionsLoading.value = true
  try {
    const r = await listPathwayExecutions(props.pathwayId)
    if (r.success) {
      executions.value = r.data
      if (!props.selectedExecutionId) {
        const latestCompleted = r.data.find(e => e.status === 'COMPLETED')
        if (latestCompleted) emit('execution:select', latestCompleted.id)
      }
    } else {
      logger.error('PathwayWorkbench', 'listPathwayExecutions failed', r.error)
    }
  } finally {
    executionsLoading.value = false
  }
}

async function onRun(sourceKey: string) {
  const gen = generation.value
  if (!gen) return
  const ok = await gen.start(sourceKey)
  if (!ok) logger.error('PathwayWorkbench', 'start failed', gen.error.value)
  await refreshExecutions()
}

async function onCancel(sourceKey: string) {
  const gen = generation.value
  if (!gen) return
  const ok = await gen.cancel(sourceKey)
  if (!ok) logger.error('PathwayWorkbench', 'cancel failed', gen.error.value)
  await refreshExecutions()
}

function onShowHistory(sourceKey: string) {
  historySourceKey.value = sourceKey
  historyOpen.value = true
}

function onHistorySelect(id: number | string) {
  if (typeof id === 'number') emit('execution:select', id)
  historyOpen.value = false
}

watch(
  () => props.selectedExecutionId,
  id => {
    selectedPath.value = null
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

onMounted(async () => {
  if (dsStore.sources.length === 0 && !dsStore.isLoading) {
    await dsStore.fetchDataSources()
  }
})

onBeforeUnmount(() => {
  generation.value?.stopPolling()
})

function onPathSelect(info: { code: number; nodeName: string; value: number }) {
  selectedPath.value = { path: info.nodeName }
}

defineExpose({ onPathSelect })
</script>

<style scoped>
.workbench {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 320px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  overflow: hidden;
  min-height: 540px;
}

.workbench__design,
.workbench__insights {
  padding: 14px;
  overflow-y: auto;
}
.workbench__design {
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.workbench__insights {
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.08);
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

.workbench__sunburst-stage {
  flex: 1;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  padding: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}

.workbench__sec-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface));
  margin: 14px 0 6px;
}
.workbench__insights-hint {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  text-align: center;
  padding: 14px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 8px;
}

.workbench--rail-collapsed {
  grid-template-columns: minmax(0, 1fr) 320px;
}
.rail-toggle {
  background: rgb(var(--v-theme-primary));
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  align-self: flex-start;
}
.rail-toggle:hover {
  opacity: 0.9;
}
@media (max-width: 1280px) {
  .workbench {
    grid-template-columns: 320px minmax(0, 1fr);
  }
  .workbench__insights {
    display: none;
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
