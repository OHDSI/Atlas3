<template>
  <AtlasCollapsibleSection
    data-testid="cohort-generation-section"
    :title="t('cohortDefinitions.generation.section.title', 'Generation').value"
    :state-chip="stateChip"
    :meta="metaText"
    :default-expanded="defaultExpanded"
  >
    <template #controls>
      <AtlasSwitch
        v-model="onlyGenerated"
        :label="t('cohortDefinitions.generation.section.onlyGenerated', 'Only generated').value"
      />
    </template>

    <template
      v-if="cohortId !== null && sources.length > 0"
      #actions
    >
      <AtlasTooltip
        v-if="hasCriticalFindings"
        location="top"
      >
        <template #activator="{ props: tipProps }">
          <span v-bind="tipProps">
            <AtlasButton
              size="sm"
              variant="primary"
              :disabled="true"
              data-testid="generate-all-btn"
            >
              {{ t('cohortDefinitions.generation.section.generateAll', 'Generate all').value }}
            </AtlasButton>
          </span>
        </template>
        <span>{{ invalidDesignReason }}</span>
      </AtlasTooltip>
      <AtlasButton
        v-else
        size="sm"
        variant="primary"
        :disabled="!canGenerateAll"
        data-testid="generate-all-btn"
        @click="generateAll"
      >
        {{ t('cohortDefinitions.generation.section.generateAll', 'Generate all').value }}
      </AtlasButton>
    </template>

    <AtlasAlert
      v-if="cohortId === null"
      severity="warning"
    >
      {{ t('cohortDefinitions.saveDefinitionBefore', 'Please save the cohort before generating.').value }}
    </AtlasAlert>
    <AtlasAlert
      v-else-if="sources.length === 0"
      severity="info"
    >
      {{ t('components.generation.pickAtLeastOneSourceAlert', 'No data sources configured.').value }}
    </AtlasAlert>
    <DataSourceRunTable
      v-else
      :sources="visibleRunTableSources"
      :executions="runTableExecutions"
      :loading="false"
      :show-patient-count="true"
      :hide-cancel="true"
      :run-disabled="hasCriticalFindings"
      :run-disabled-reason="invalidDesignReason"
      :extra-actions="extraActions"
      @run="onRun"
      @show-history="onShowHistory"
      @extra-action="onExtraAction"
    />

    <CohortReportDrawer
      v-model="drawer.open"
      :cohort-id="cohortId"
      :source-key="drawer.sourceKey"
      :report-type="drawer.reportType"
      :person-id="drawer.personId"
      @open-profile="onOpenProfile"
      @back="onProfileBack"
    />

    <PreviousRunsDialog
      v-if="historyDialog.open"
      v-model="historyDialog.open"
      :source-name="historyDialog.sourceName"
      :source-key="historyDialog.sourceKey"
      :executions="historyExecutions"
    />
  </AtlasCollapsibleSection>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AtlasAlert, AtlasButton, AtlasTooltip } from '@/components/ui'
import AtlasSwitch from '@/components/ui/AtlasSwitch.vue'
import type { AtlasChipTone } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useSourceAccessFor } from '@/composables/useEntityAccess'
import { useWebAPIStore } from '@/stores/webapi'
import AtlasCollapsibleSection from '@/components/ui/AtlasCollapsibleSection.vue'
import CohortReportDrawer from './CohortReportDrawer.vue'
import DataSourceRunTable, {
  type RunTableSource,
  type RunTableExecution,
  type ExtraAction,
} from '@/components/generation/DataSourceRunTable.vue'
import PreviousRunsDialog from '@/components/generation/PreviousRunsDialog.vue'
import type { GenerationStatus as CohortStatus, GenerationJob } from '@/models/webapi.types'
import type { GenerationStatus as TableStatus } from '@/models/characterization.types'
import { logger } from '@/utils/logger'

interface Props {
  cohortId: number | null
  /** Number of CRITICAL validation findings on the current design. */
  criticalCount?: number
}

const props = withDefaults(defineProps<Props>(), { criticalCount: 0 })

const { t, tv } = useI18n()
const route = useRoute()
const router = useRouter()
const webapiStore = useWebAPIStore()
const sourceAccess = useSourceAccessFor()

const sources = computed(() => webapiStore.sourcesList)

function mapStatus(s: CohortStatus): TableStatus {
  if (s === 'COMPLETE') return 'COMPLETED'
  return s as TableStatus
}

function jobToExecution(j: GenerationJob): RunTableExecution {
  const start = j.startTime ? new Date(j.startTime).getTime() : undefined
  const end = j.endTime ? new Date(j.endTime).getTime() : undefined
  return {
    id: j.id,
    sourceKey: j.sourceKey,
    status: mapStatus(j.status),
    startTime: start,
    endTime: end,
    duration: start && end ? end - start : undefined,
    personCount: j.personCount,
  }
}

const jobs = computed<GenerationJob[]>(() =>
  props.cohortId === null ? [] : webapiStore.getJobsByCohortId(props.cohortId)
)

const runTableSources = computed<RunTableSource[]>(() =>
  sources.value.map(s => ({ sourceKey: s.sourceKey, sourceName: s.sourceName || s.sourceKey }))
)

const onlyGenerated = ref(false)

const generatedSourceKeys = computed(
  () => new Set(jobs.value.filter(j => j.status === 'COMPLETE').map(j => j.sourceKey))
)

const visibleRunTableSources = computed<RunTableSource[]>(() =>
  onlyGenerated.value
    ? runTableSources.value.filter(s => generatedSourceKeys.value.has(s.sourceKey))
    : runTableSources.value
)

const runTableExecutions = computed<RunTableExecution[]>(() => jobs.value.map(jobToExecution))

const completeCount = computed(() => jobs.value.filter(j => j.status === 'COMPLETE').length)

const stateChip = computed<{ label: string; tone: AtlasChipTone } | undefined>(() => {
  if (props.cohortId === null) {
    return {
      label: t('cohortDefinitions.generation.section.statusSaveFirst', 'Save cohort to generate').value,
      tone: 'neutral',
    }
  }
  if (jobs.value.length === 0) {
    return {
      label: t('cohortDefinitions.generation.section.statusNoRuns', 'No generations yet').value,
      tone: 'neutral',
    }
  }
  const total = sources.value.length || jobs.value.length
  const label = t('cohortDefinitions.generation.section.statusCount', '{done} / {total} generated', {
    done: completeCount.value,
    total,
  }).value
  let tone: AtlasChipTone = 'success'
  if (jobs.value.some(j => j.status === 'FAILED')) tone = 'danger'
  else if (jobs.value.some(j => j.status === 'RUNNING' || j.status === 'PENDING')) tone = 'warning'
  else if (completeCount.value === 0) tone = 'neutral'
  return { label, tone }
})

const metaText = computed(() => {
  if (props.cohortId === null) return undefined
  const completed = jobs.value
    .filter(j => j.status === 'COMPLETE' && j.startTime)
    .sort((a, b) => new Date(b.startTime!).getTime() - new Date(a.startTime!).getTime())
  const latest = completed[0]
  if (!latest) return undefined
  const sourceName = sources.value.find(s => s.sourceKey === latest.sourceKey)?.sourceName ?? latest.sourceKey
  const time = formatRelative(new Date(latest.startTime!).getTime())
  return t('cohortDefinitions.generation.section.lastRunMeta', 'Last run · {time} on {source}', {
    time,
    source: sourceName,
  }).value
})

function formatRelative(ms: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

const defaultExpanded = computed(() => false)

// ATLAS 2.15 gates generation (not saving) on the design being valid:
// cohort-definition-manager.js canGenerate requires `criticalCount() <= 0`
// and reports disabledReasons.INVALID_DESIGN when it is not.
const hasCriticalFindings = computed(() => props.criticalCount > 0)
const invalidDesignReason = tv('const.disabledReason.invalidDesign', 'Design is not valid')

const canGenerateAll = computed(() => {
  if (props.cohortId === null) return false
  if (hasCriticalFindings.value) return false
  return sources.value.some(s => {
    if (!sourceAccess.canWrite(s.sourceKey)) return false
    const j = jobs.value.find(x => x.sourceKey === s.sourceKey)
    return !j || (j.status !== 'RUNNING' && j.status !== 'PENDING')
  })
})

async function generateAll() {
  if (props.cohortId === null || hasCriticalFindings.value) return
  for (const s of sources.value) {
    if (!sourceAccess.canWrite(s.sourceKey)) continue
    const j = jobs.value.find(x => x.sourceKey === s.sourceKey)
    if (j && (j.status === 'RUNNING' || j.status === 'PENDING')) continue
    try {
      await webapiStore.generateCohort(props.cohortId, s.sourceKey)
    } catch (error) {
      logger.error('CohortGenerationSection', 'generate-all failed for ' + s.sourceKey, error)
    }
  }
}

async function onRun(sourceKey: string) {
  if (props.cohortId === null || hasCriticalFindings.value) return
  try {
    await webapiStore.generateCohort(props.cohortId, sourceKey)
  } catch (error) {
    logger.error('CohortGenerationSection', 'generate failed for ' + sourceKey, error)
  }
}

const historyDialog = reactive<{ open: boolean; sourceKey: string; sourceName: string }>({
  open: false,
  sourceKey: '',
  sourceName: '',
})

const historyExecutions = computed<RunTableExecution[]>(() =>
  runTableExecutions.value.filter(e => e.sourceKey === historyDialog.sourceKey)
)

function onShowHistory(sourceKey: string) {
  const src = sources.value.find(s => s.sourceKey === sourceKey)
  historyDialog.sourceKey = sourceKey
  historyDialog.sourceName = src?.sourceName ?? sourceKey
  historyDialog.open = true
}

const drawer = reactive<{
  open: boolean
  sourceKey: string | null
  reportType: 'inclusion' | 'samples' | 'profile' | null
  personId: string | null
  prevReportType: 'inclusion' | 'samples' | null
}>({
  open: false,
  sourceKey: null,
  reportType: null,
  personId: null,
  prevReportType: null,
})

function onOpenProfile(personId: string) {
  drawer.prevReportType = drawer.reportType === 'samples' ? 'samples' : null
  drawer.personId = personId
  drawer.reportType = 'profile'
}

function onProfileBack() {
  drawer.personId = null
  drawer.reportType = drawer.prevReportType ?? 'samples'
}

const extraActions: ExtraAction[] = [
  {
    key: 'inclusion',
    label: t('cohortDefinitions.generation.row.inclusionReport', 'Inclusion report').value,
    disabledWhen: r => r.latestStatus !== 'COMPLETED',
  },
  {
    key: 'samples',
    label: t('cohortDefinitions.generation.row.samples', 'Samples').value,
    disabledWhen: r => r.latestStatus !== 'COMPLETED',
  },
]

function onExtraAction(actionKey: string, sourceKey: string) {
  if (actionKey !== 'inclusion' && actionKey !== 'samples') return
  drawer.sourceKey = sourceKey
  drawer.reportType = actionKey
  drawer.open = true
  router.replace({ query: { ...route.query, report: actionKey, source: sourceKey } }).catch(() => {})
}

watch(
  () => drawer.open,
  (open) => {
    if (!open) {
      drawer.sourceKey = null
      drawer.reportType = null
      const next = { ...route.query }
      delete next.report
      delete next.source
      router.replace({ query: next }).catch(() => {})
    }
  }
)

watch(
  () => props.cohortId,
  async id => {
    if (id === null) return
    await webapiStore.fetchSources()
    await webapiStore.fetchCohortGenerationInfo(id)
    restoreDrawerFromUrl()
  },
  { immediate: false }
)

function restoreDrawerFromUrl() {
  const reportRaw = route.query.report
  const sourceRaw = route.query.source
  const report = typeof reportRaw === 'string' ? reportRaw : null
  const source = typeof sourceRaw === 'string' ? sourceRaw : null
  if (
    (report === 'inclusion' || report === 'samples') &&
    source &&
    sources.value.some(s => s.sourceKey === source)
  ) {
    drawer.open = true
    drawer.sourceKey = source
    drawer.reportType = report
  }
}

onMounted(async () => {
  if (props.cohortId !== null) {
    await webapiStore.fetchSources()
    await webapiStore.fetchCohortGenerationInfo(props.cohortId)
    restoreDrawerFromUrl()
  } else {
    await webapiStore.fetchSources()
  }
})

onBeforeUnmount(() => {
  if (props.cohortId !== null) {
    webapiStore.stopPolling(props.cohortId)
  }
})

defineExpose({ onlyGenerated, visibleRunTableSources })
</script>
