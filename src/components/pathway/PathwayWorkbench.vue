<template>
  <div class="workbench">
    <aside
      class="workbench__design"
      data-testid="workbench-design-rail"
    >
      <PathwayDesignForm
        :pathway-id="pathwayId ?? undefined"
        :active-run-id="selectedExecutionId ?? null"
        @execution:select="(id) => $emit('execution:select', id)"
      />
    </aside>

    <main
      class="workbench__canvas"
      data-testid="workbench-canvas"
    >
      <PathwayCanvasToolbar
        :mode="mode"
        :active-run="activeRunSummary"
        :coverage="coverageProps"
        @update:mode="(v) => (mode = v)"
      />

      <div
        v-if="!pathwayId"
        class="workbench__canvas-empty"
        data-testid="canvas-empty"
      >
        <div class="workbench__canvas-empty-icon">
          ◌
        </div>
        <h3>{{ t('pathway.workbench.emptyChartTitle', 'Your sunburst will appear here').value }}</h3>
        <p>{{ t('pathway.workbench.emptyChartHint', 'Pick at least one target cohort and a few event cohorts on the left, then run a generation against a data source.').value }}</p>
      </div>

      <div
        v-else-if="!selectedExecutionId"
        class="workbench__canvas-empty"
        data-testid="canvas-no-run"
      >
        <div class="workbench__canvas-empty-icon">
          ▶
        </div>
        <h3>{{ t('pathway.workbench.noRunYetTitle', 'No runs yet').value }}</h3>
        <p>{{ t('pathway.workbench.noRunYetHint', 'Generate against a data source to see the sunburst.').value }}</p>
        <v-btn
          color="primary"
          variant="flat"
          @click="$emit('open-generate')"
        >
          {{ t('components.generation.generate', 'Generate') }}
        </v-btn>
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
          {{ t('pathway.workbench.selectPathHint', 'Click a slice to inspect a treatment path').value }}
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { usePathwayResults } from '@/composables/usePathwayResults'
import { computePathStats } from '@/utils/pathway-path-stats'
import PathwayDesignForm from './PathwayDesignForm.vue'
import PathwaySunburst from './results/PathwaySunburst.vue'
import PathwayTableView from './results/PathwayTableView.vue'
import PathwayCanvasToolbar from './PathwayCanvasToolbar.vue'
import PathwayCoverageStat from './results/PathwayCoverageStat.vue'
import PathwayLegend from './results/PathwayLegend.vue'
import PathwayPathStats from './results/PathwayPathStats.vue'

const PALETTE_20 = [
  '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f',
  '#bcbd22','#17becf','#aec7e8','#ffbb78','#98df8a','#ff9896','#c5b0d5','#c49c94',
  '#f7b6d2','#c7c7c7','#dbdb8d','#9edae5',
]

const props = defineProps<{
  pathwayId: number | null
  selectedExecutionId?: number | null
}>()

defineEmits<{
  'execution:select': [id: number]
  'open-generate': []
}>()

const { t } = useI18n()
const { design, results, load } = usePathwayResults()

const mode = ref<'visual' | 'tabular'>('visual')
const selectedPath = ref<{ path: string } | null>(null)

const targetGroup = computed(() => results.value?.pathwayGroups[0] ?? null)

const targetCohortName = computed(() => {
  if (!design.value || !targetGroup.value) return ''
  return design.value.targetCohorts.find(
    (c) => c.id === targetGroup.value!.targetCohortId,
  )?.name ?? ''
})

const colorMap = computed(() => {
  const map = new Map<string, string>()
  if (design.value) {
    design.value.eventCohorts.forEach((_, i) => {
      map.set(String(1 << i), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
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

watch(
  () => props.selectedExecutionId,
  (id) => {
    selectedPath.value = null
    if (Number.isFinite(id) && id && id > 0) load(id)
  },
  { immediate: true },
)

function onPathSelect(info: { code: number; nodeName: string; value: number }) {
  selectedPath.value = { path: info.nodeName }
}

defineExpose({ onPathSelect })
</script>

<style scoped>
.workbench {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 320px;
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
.workbench__design { border-right: 1px solid rgba(var(--v-theme-on-surface), 0.08); }
.workbench__insights { border-left: 1px solid rgba(var(--v-theme-on-surface), 0.08); }

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
.workbench__canvas-empty h3 { margin: 0; color: rgb(var(--v-theme-on-surface)); font-weight: 500; font-size: 16px; }
.workbench__canvas-empty p { margin: 0 0 8px; max-width: 360px; font-size: 13px; }
.workbench__canvas-empty-icon { font-size: 42px; opacity: 0.7; line-height: 1; }

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

.workbench__generate-anchor {
  position: absolute;
  top: 8px;
  right: 12px;
  pointer-events: none;
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

@media (max-width: 1280px) {
  .workbench { grid-template-columns: 280px minmax(0, 1fr); }
  .workbench__insights { display: none; }
}
@media (max-width: 1024px) {
  .workbench { grid-template-columns: 1fr; }
  .workbench__design { display: none; }
}
</style>
