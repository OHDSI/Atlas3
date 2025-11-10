<!--
  ReportPanel Component
  Feature: 005-cohort-reports
  Tasks: T029-T034

  Main report container with action buttons, report selector, and dynamic report loading
-->
<template>
  <v-card
    class="report-panel"
    elevation="0"
  >
    <!-- Header with close button -->
    <v-card-title class="d-flex align-center justify-space-between pa-4 border-b">
      <div class="d-flex align-center gap-2">
        <v-icon>mdi-chart-box</v-icon>
        <span class="text-h6">{{ t('common.cohortReports') }}</span>
        <v-chip
          v-if="sourceKey"
          size="small"
          variant="outlined"
        >
          {{ sourceKey }}
        </v-chip>
      </div>
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        @click="handleClose"
      />
    </v-card-title>

    <v-divider />

    <!-- Action buttons section -->
    <v-card-text class="pa-4">
      <div class="action-buttons-section mb-4">
        <div class="text-subtitle-2 mb-2">
          {{ t('common.generateReports') }}
        </div>
        <v-btn-group
          variant="outlined"
          divided
        >
          <v-btn
            :disabled="loading || !cohortId || !sourceKey"
            :loading="activeAction === 'full-analysis'"
            prepend-icon="mdi-chart-multiple"
            @click="handleFullAnalysis"
          >
            {{ t('common.fullAnalysis') }}
          </v-btn>
          <v-btn
            :disabled="loading || !cohortId || !sourceKey"
            :loading="activeAction === 'quick-analysis'"
            prepend-icon="mdi-chart-timeline-variant"
            @click="handleQuickAnalysis"
          >
            {{ t('common.quickAnalysis') }}
          </v-btn>
          <v-btn
            :disabled="loading || !cohortId || !sourceKey"
            :loading="activeAction === 'utilization'"
            prepend-icon="mdi-chart-bar"
            @click="handleUtilization"
          >
            {{ t('common.utilization') }}
          </v-btn>
        </v-btn-group>
      </div>

      <v-divider class="my-4" />

      <!-- Report type selector -->
      <div class="report-selector-section mb-4">
        <ReportSelector
          :model-value="currentReportType"
          :disabled="loading || !cohortId || !sourceKey"
          @update:model-value="handleReportTypeChange"
        />
      </div>

      <v-divider class="my-4" />

      <!-- Loading state -->
      <div
        v-if="loading"
        class="report-loading"
      >
        <v-skeleton-loader type="article, article" />
      </div>

      <!-- Error state -->
      <v-alert
        v-else-if="error"
        type="error"
        variant="tonal"
        closable
        @click:close="clearError"
      >
        <div class="d-flex align-center justify-space-between">
          <span>{{ error }}</span>
          <v-btn
            variant="text"
            size="small"
            @click="handleRetry"
          >
            {{ t('common.retry') }}
          </v-btn>
        </div>
      </v-alert>

      <!-- Report content -->
      <div
        v-else-if="currentReportType && cohortId && sourceKey && currentReportComponent"
        class="report-content"
      >
        <component
          :is="currentReportComponent"
          :cohort-id="cohortId"
          :source-key="sourceKey"
        />
      </div>

      <!-- Not implemented state -->
      <v-alert
        v-else-if="currentReportType && !currentReportComponent"
        type="warning"
        variant="tonal"
        icon="mdi-alert-circle-outline"
      >
        <div class="text-subtitle-2 mb-1">
          {{ t('common.reportNotImplemented') }}
        </div>
        <div class="text-body-2">
          {{ t('common.reportNotImplementedMessage', { reportType: currentReportType }) }}
        </div>
      </v-alert>

      <!-- Empty state -->
      <v-alert
        v-else
        type="info"
        variant="tonal"
        icon="mdi-information"
      >
        {{ t('common.selectReportType') }}
      </v-alert>
    </v-card-text>

    <!-- Toast notifications (T112) -->
    <v-snackbar
      v-model="showToast"
      :timeout="toastTimeout"
      :color="toastColor"
      location="top"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showToast = false"
        >
          {{ t('common.close') }}
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent, onUnmounted } from 'vue'
import { useReports } from '@/composables/useReports'
import { useI18n } from '@/composables/useI18n'
import type { ReportType, ReportAction } from '@/models/report.types'
import {
  triggerFullAnalysis,
  triggerQuickAnalysis,
  triggerUtilization,
  getCohortGenerationInfo
} from '@/services/webapi'
import ReportSelector from './ReportSelector.vue'

/**
 * i18n
 */
const { t } = useI18n()

/**
 * Props
 */
const props = defineProps<{
  cohortId?: number
  sourceKey?: string
  isOpen: boolean
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  close: []
}>()

/**
 * Reports composable
 */
const {
  currentReportType,
  loading,
  error,
  loadReport,
  clearCurrent,
  setContext
} = useReports()

/**
 * Active action state (T110)
 */
const activeAction = ref<ReportAction | null>(null)

/**
 * Toast notification state (T112)
 */
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref<'success' | 'error' | 'info'>('info')
const toastTimeout = ref(4000)

/**
 * Job polling state (T111)
 */
const pollingInterval = ref<ReturnType<typeof setInterval> | null>(null)
const isPolling = ref(false)

/**
 * Component cache for loaded reports (T103)
 * Prevents re-importing already loaded components
 */
const componentCache = new Map<ReportType, any>()

/**
 * Dynamic report component loading (T102)
 * Uses defineAsyncComponent for lazy loading and caches loaded components
 */
const currentReportComponent = computed(() => {
  if (!currentReportType.value) return null

  // Check cache first (T103)
  if (componentCache.has(currentReportType.value)) {
    return componentCache.get(currentReportType.value)
  }

  // Map report types to components (lazy loaded)
  const componentMap: Record<string, () => Promise<any>> = {
    'person': () => import('./report-types/PersonReport.vue'),
    'condition-eras': () => import('./report-types/ConditionErasReport.vue'),
    'condition': () => import('./report-types/ConditionReport.vue'),
    'drug-eras': () => import('./report-types/DrugErasReport.vue'),
    'cohort-specific': () => import('./report-types/CohortSpecificReport.vue'),
    'persons-exposure-baseline': () => import('./report-types/PersonsExposureBaselineReport.vue'),
    'persons-exposure-cohort': () => import('./report-types/PersonsExposureCohortReport.vue'),
    'visits-baseline': () => import('./report-types/VisitsBaselineReport.vue'),
    'visit-dates-baseline': () => import('./report-types/VisitDatesBaselineReport.vue'),
    'care-site-visit-dates-baseline': () => import('./report-types/CareSiteVisitDatesBaselineReport.vue'),
    'visits-cohort': () => import('./report-types/VisitsCohortReport.vue'),
    'visit-dates-cohort': () => import('./report-types/VisitDatesCohortReport.vue'),
    'care-site-visit-dates-cohort': () => import('./report-types/CareSiteVisitDatesCohortReport.vue'),
    'drug-utilization-baseline': () => import('./report-types/DrugUtilizationBaselineReport.vue'),
    'drug-utilization-cohort': () => import('./report-types/DrugUtilizationCohortReport.vue'),
    'heracles-heel': () => import('./report-types/HeraclesHeelReport.vue'),
    'conditions-by-index': () => import('./report-types/ConditionsByIndexReport.vue'),
    'death': () => import('./report-types/DeathReport.vue'),
    'drug-exposure': () => import('./report-types/DrugExposureReport.vue'),
    'drugs-by-index': () => import('./report-types/DrugsByIndexReport.vue'),
    'observation-periods': () => import('./report-types/ObservationPeriodsReport.vue'),
    'procedure': () => import('./report-types/ProcedureReport.vue'),
    'procedures-by-index': () => import('./report-types/ProceduresByIndexReport.vue'),
    'data-completeness': () => import('./report-types/DataCompletenessReport.vue'),
    'entropy': () => import('./report-types/EntropyReport.vue'),
    'tornado': () => import('./report-types/TornadoReport.vue'),
    // Additional report types will be loaded when their components are implemented
    // For now, they will show a "not implemented" message in the error state
  }

  const loader = componentMap[currentReportType.value]
  if (!loader) {
    console.warn(`[ReportPanel] Report type "${currentReportType.value}" not yet implemented`)
    return null
  }

  // Create async component with error handling
  const asyncComponent = defineAsyncComponent({
    loader,
    loadingComponent: undefined, // Use parent loading state
    errorComponent: undefined,    // Use parent error state
    delay: 200,
    timeout: 10000
  })

  // Cache the component (T103)
  componentCache.set(currentReportType.value, asyncComponent)

  return asyncComponent
})

/**
 * Handle close button
 */
function handleClose() {
  clearCurrent()
  emit('close')
}

/**
 * Handle report type change
 */
async function handleReportTypeChange(reportType: ReportType | null) {
  if (!reportType || !props.cohortId || !props.sourceKey) return

  await loadReport(props.cohortId, props.sourceKey, reportType)
}

/**
 * Handle retry on error
 */
async function handleRetry() {
  if (!props.cohortId || !props.sourceKey || !currentReportType.value) return

  await loadReport(props.cohortId, props.sourceKey, currentReportType.value)
}

/**
 * Clear error
 */
function clearError() {
  // Error clearing is handled by composable
}

/**
 * Show toast notification (T112)
 */
function showToastNotification(message: string, color: 'success' | 'error' | 'info' = 'info', timeout = 4000) {
  toastMessage.value = message
  toastColor.value = color
  toastTimeout.value = timeout
  showToast.value = true
}

/**
 * Start job status polling (T111)
 */
function startJobPolling(jobType: string) {
  if (isPolling.value || !props.cohortId) return

  isPolling.value = true
  let pollCount = 0
  const maxPolls = 60 // Poll for max 5 minutes (60 * 5s)

  pollingInterval.value = setInterval(async () => {
    try {
      pollCount++

      // Check job status via generation info endpoint
      const info = await getCohortGenerationInfo(props.cohortId!)
      if (!info || info.length === 0) {
        stopJobPolling()
        showToastNotification(`${jobType} job status unknown`, 'info')
        return
      }

      // Find the most recent job for this source
      const relevantJob = info.find((job: any) => job.sourceId === props.sourceKey || job.sourceKey === props.sourceKey)

      if (relevantJob && relevantJob.status === 'COMPLETE') {
        stopJobPolling()
        showToastNotification(`${jobType} completed successfully!`, 'success', 5000)

        // Refresh the current report if one is loaded
        if (currentReportType.value && props.cohortId && props.sourceKey) {
          await loadReport(props.cohortId, props.sourceKey, currentReportType.value)
        }
      } else if (relevantJob && relevantJob.status === 'FAILED') {
        stopJobPolling()
        showToastNotification(`${jobType} failed: ${relevantJob.failMessage || 'Unknown error'}`, 'error', 8000)
      } else if (pollCount >= maxPolls) {
        stopJobPolling()
        showToastNotification(`${jobType} polling timeout - check job status manually`, 'info', 6000)
      }
    } catch (error) {
      console.error('[ReportPanel] Job polling error:', error)
      stopJobPolling()
    }
  }, 5000) // Poll every 5 seconds
}

/**
 * Stop job status polling (T111)
 */
function stopJobPolling() {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
  isPolling.value = false
}

/**
 * Action button handlers (T107-T109 with T111-T112)
 */
async function handleFullAnalysis() {
  if (!props.cohortId || !props.sourceKey) return

  activeAction.value = 'full-analysis'
  try {
    const success = await triggerFullAnalysis(props.cohortId, props.sourceKey)
    if (success) {
      console.log('[ReportPanel] Full Analysis triggered successfully')
      showToastNotification('Full Analysis job started - this may take several minutes', 'info', 5000)
      startJobPolling('Full Analysis')
    } else {
      showToastNotification('Failed to start Full Analysis job', 'error')
    }
  } catch (error) {
    console.error('[ReportPanel] Failed to trigger Full Analysis:', error)
    showToastNotification('Error starting Full Analysis job', 'error')
  } finally {
    activeAction.value = null
  }
}

async function handleQuickAnalysis() {
  if (!props.cohortId || !props.sourceKey) return

  activeAction.value = 'quick-analysis'
  try {
    const success = await triggerQuickAnalysis(props.cohortId, props.sourceKey)
    if (success) {
      console.log('[ReportPanel] Quick Analysis triggered successfully')
      showToastNotification('Quick Analysis job started - this should complete shortly', 'info', 5000)
      startJobPolling('Quick Analysis')
    } else {
      showToastNotification('Failed to start Quick Analysis job', 'error')
    }
  } catch (error) {
    console.error('[ReportPanel] Failed to trigger Quick Analysis:', error)
    showToastNotification('Error starting Quick Analysis job', 'error')
  } finally {
    activeAction.value = null
  }
}

async function handleUtilization() {
  if (!props.cohortId || !props.sourceKey) return

  activeAction.value = 'utilization'
  try {
    const success = await triggerUtilization(props.cohortId, props.sourceKey)
    if (success) {
      console.log('[ReportPanel] Utilization analysis triggered successfully')
      showToastNotification('Utilization analysis job started', 'info', 5000)
      startJobPolling('Utilization Analysis')
    } else {
      showToastNotification('Failed to start Utilization analysis job', 'error')
    }
  } catch (error) {
    console.error('[ReportPanel] Failed to trigger Utilization:', error)
    showToastNotification('Error starting Utilization analysis job', 'error')
  } finally {
    activeAction.value = null
  }
}

/**
 * Watch for panel open/close
 */
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.cohortId && props.sourceKey) {
      // Set initial context
      setContext(props.cohortId, props.sourceKey, 'person')
    } else if (!isOpen) {
      // Clear context and stop polling on close
      clearCurrent()
      stopJobPolling()
    }
  },
  { immediate: true }
)

/**
 * Cleanup on unmount (T111)
 */
onUnmounted(() => {
  stopJobPolling()
})
</script>

<style scoped>
.report-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.action-buttons-section {
  display: flex;
  flex-direction: column;
}

.report-loading,
.report-content {
  min-height: 400px;
}

.report-content {
  flex: 1;
}
</style>
