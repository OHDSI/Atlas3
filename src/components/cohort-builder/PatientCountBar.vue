<template>
  <div
    v-if="isTrexSQLEnabled"
    class="patient-count-bar"
  >
    <div class="patient-count-bar__content">
      <!-- Dataset Selector -->
      <div class="patient-count-bar__selector">
        <v-select
          v-model="selectedSource"
          :items="dataSourceItems"
          :loading="isLoadingDataSources"
          :disabled="isLoadingDataSources"
          item-title="text"
          item-value="value"
          density="compact"
          variant="outlined"
          hide-details
          class="patient-count-bar__select"
          :placeholder="t('trexsql.selectDataset', 'Select dataset').value"
        >
          <template #prepend-inner>
            <v-icon
              size="small"
              color="grey-darken-1"
            >
              mdi-database
            </v-icon>
          </template>

          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #append>
                <v-chip
                  v-if="item.raw.cacheStatus"
                  :color="getCacheStatusColor(item.raw.cacheStatus)"
                  size="x-small"
                  variant="tonal"
                >
                  {{ getCacheStatusLabel(item.raw.cacheStatus) }}
                </v-chip>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </div>

      <!-- Patient Count Display -->
      <div class="patient-count-bar__count-section">
        <!-- Loading State -->
        <div
          v-if="isCountLoading"
          class="patient-count-bar__loading"
        >
          <v-progress-circular
            indeterminate
            size="20"
            width="2"
            color="primary"
          />
          <span class="patient-count-bar__loading-text">
            {{ isCountSlow ? t('trexsql.countingInProgress', 'Counting patients...') : t('trexsql.counting', 'Counting...') }}
          </span>
        </div>

        <!-- Error State -->
        <div
          v-else-if="countError"
          class="patient-count-bar__error"
        >
          <v-icon
            size="small"
            color="error"
          >
            mdi-alert-circle
          </v-icon>
          <span class="patient-count-bar__error-text">{{ countError }}</span>
          <v-btn
            size="x-small"
            variant="text"
            color="primary"
            @click="handleRetry"
          >
            {{ t('common.retry', 'Retry') }}
          </v-btn>
        </div>

        <!-- No Dataset Selected -->
        <div
          v-else-if="!selectedSource"
          class="patient-count-bar__prompt"
        >
          <v-icon
            size="small"
            color="grey"
          >
            mdi-information-outline
          </v-icon>
          <span>{{ t('trexsql.selectDatasetPrompt', 'Select a dataset to view patient count') }}</span>
        </div>

        <!-- Cache Not Ready -->
        <div
          v-else-if="!isCacheReady"
          class="patient-count-bar__cache-warning"
        >
          <v-icon
            size="small"
            color="warning"
          >
            mdi-alert
          </v-icon>
          <span>{{ cacheStatusMessage }}</span>
        </div>

        <!-- Zero Patients (special case before general patient count) -->
        <div
          v-else-if="patientCount && patientCount.cohortPatientCount === 0"
          class="patient-count-bar__zero"
        >
          <v-icon
            size="small"
            color="grey"
          >
            mdi-account-off
          </v-icon>
          <span>{{ t('trexsql.noPatients', 'No patients match this criteria') }}</span>
        </div>

        <!-- Patient Count Result -->
        <div
          v-else-if="patientCount"
          class="patient-count-bar__result"
        >
          <div class="patient-count-bar__numbers">
            <span class="patient-count-bar__cohort-count">{{ cohortPatientCountFormatted }}</span>
            <span class="patient-count-bar__separator">/</span>
            <span class="patient-count-bar__total-count">{{ totalPatientCountFormatted }}</span>
            <span class="patient-count-bar__label">{{ t('trexsql.patients', 'patients') }}</span>
          </div>

          <!-- Progress Bar -->
          <div class="patient-count-bar__progress-wrapper">
            <v-progress-linear
              :model-value="cohortPercentage"
              :color="getProgressColor(cohortPercentage)"
              height="8"
              rounded
              class="patient-count-bar__progress"
            />
            <span class="patient-count-bar__percentage">{{ cohortPercentage }}%</span>
          </div>

          <!-- Stale Cache Warning Tooltip -->
          <v-tooltip
            v-if="selectedCacheStatus?.status === 'stale'"
            location="bottom"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                v-bind="tooltipProps"
                size="small"
                color="warning"
                class="patient-count-bar__stale-icon"
              >
                mdi-clock-alert
              </v-icon>
            </template>
            <div class="patient-count-bar__tooltip">
              <div class="font-weight-medium">{{ t('trexsql.staleCacheWarning', 'Cache may be stale') }}</div>
              <div
                v-if="selectedCacheStatus?.lastBuiltAt"
                class="text-caption"
              >
                {{ t('trexsql.lastBuilt', 'Last built') }}: {{ formatDate(selectedCacheStatus.lastBuiltAt) }}
              </div>
            </div>
          </v-tooltip>
        </div>

        <!-- Waiting for Expression -->
        <div
          v-else
          class="patient-count-bar__waiting"
        >
          <span class="text-grey">{{ t('trexsql.addCriteria', 'Add criteria to see patient count') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PatientCountBar Component
 *
 * Displays TrexSQL patient count with:
 * - Dataset selector dropdown
 * - Patient count display (cohort / total)
 * - Progress bar showing percentage
 * - Loading, error, and cache status states
 *
 * Positioned above the cohort builder toolbar.
 */

import { computed, watch, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useTrexSQLCache } from '@/composables/useTrexSQLCache'
import type { CacheStatusType } from '@/models/trexsql.types'

// Props
interface Props {
  /** Cohort expression in Atlas format - used for patient count queries */
  expression?: Record<string, unknown>
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  /** Emitted when user requests retry after error */
  (e: 'retry'): void
}>()

// Composables
const { t } = useI18n()
const {
  isTrexSQLEnabled,
  selectedSourceKey,
  dataSources,
  isLoadingDataSources,
  isCountLoading,
  isCountSlow,
  countError,
  patientCount,
  cohortPatientCountFormatted,
  totalPatientCountFormatted,
  cohortPercentage,
  selectedCacheStatus,
  isCacheReady,
  cacheStatusMessage,
  initialize,
  selectDataSource,
  getPatientCount,
  clearCount
} = useTrexSQLCache()

// ============================================================================
// Computed
// ============================================================================

/**
 * Selected source for v-model binding
 */
const selectedSource = computed({
  get: () => selectedSourceKey.value,
  set: (value: string | null) => {
    if (value) {
      selectDataSource(value)
      // Clear count when switching sources
      clearCount()
      // Request new count if we have an expression
      if (props.expression && Object.keys(props.expression).length > 0) {
        getPatientCount(props.expression)
      }
    }
  }
})

/**
 * Data source items for v-select
 */
const dataSourceItems = computed(() => {
  return dataSources.value.map(source => ({
    text: source.sourceName,
    value: source.sourceKey,
    cacheStatus: source.cacheStatus?.status
  }))
})

// ============================================================================
// Methods
// ============================================================================

/**
 * Get color for cache status chip
 */
function getCacheStatusColor(status: CacheStatusType | undefined): string {
  switch (status) {
    case 'ready':
      return 'success'
    case 'building':
      return 'info'
    case 'stale':
      return 'warning'
    case 'error':
      return 'error'
    case 'not_built':
    default:
      return 'grey'
  }
}

/**
 * Get label for cache status chip
 */
function getCacheStatusLabel(status: CacheStatusType | undefined): string {
  switch (status) {
    case 'ready':
      return t('trexsql.cacheReady', 'Ready').value
    case 'building':
      return t('trexsql.cacheBuilding', 'Building').value
    case 'stale':
      return t('trexsql.cacheStale', 'Stale').value
    case 'error':
      return t('trexsql.cacheError', 'Error').value
    case 'not_built':
    default:
      return t('trexsql.cacheNotBuilt', 'Not Built').value
  }
}

/**
 * Get progress bar color based on percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage === 0) return 'grey'
  if (percentage < 25) return 'info'
  if (percentage < 50) return 'primary'
  if (percentage < 75) return 'success'
  return 'warning' // High percentage might indicate overly broad criteria
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

/**
 * Handle retry button click
 */
function handleRetry(): void {
  emit('retry')
  if (props.expression) {
    getPatientCount(props.expression)
  }
}

// ============================================================================
// Watchers
// ============================================================================

/**
 * Watch expression changes and trigger count update
 */
watch(
  () => props.expression,
  (newExpression) => {
    if (newExpression && Object.keys(newExpression).length > 0 && selectedSourceKey.value && isCacheReady.value) {
      getPatientCount(newExpression)
    }
  },
  { deep: true }
)

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(async () => {
  await initialize()
})
</script>

<style scoped>
.patient-count-bar {
  background: linear-gradient(to right, #f8f9fa, #ffffff);
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 24px;
}

.patient-count-bar__content {
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.patient-count-bar__selector {
  flex: 0 0 280px;
}

.patient-count-bar__select {
  max-width: 280px;
}

.patient-count-bar__count-section {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 36px;
}

.patient-count-bar__loading,
.patient-count-bar__error,
.patient-count-bar__prompt,
.patient-count-bar__cache-warning,
.patient-count-bar__zero,
.patient-count-bar__waiting {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.patient-count-bar__loading-text {
  color: #1976d2;
}

.patient-count-bar__error {
  color: #d32f2f;
}

.patient-count-bar__error-text {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patient-count-bar__result {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.patient-count-bar__numbers {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
}

.patient-count-bar__cohort-count {
  font-size: 20px;
  font-weight: 600;
  color: #1976d2;
}

.patient-count-bar__separator {
  font-size: 16px;
  color: #999;
  margin: 0 2px;
}

.patient-count-bar__total-count {
  font-size: 16px;
  font-weight: 500;
  color: #666;
}

.patient-count-bar__label {
  font-size: 12px;
  color: #999;
  margin-left: 4px;
}

.patient-count-bar__progress-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 400px;
}

.patient-count-bar__progress {
  flex: 1;
}

.patient-count-bar__percentage {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  min-width: 40px;
  text-align: right;
}

.patient-count-bar__stale-icon {
  margin-left: 8px;
  cursor: help;
}

.patient-count-bar__tooltip {
  padding: 4px;
}

/* Vuetify overrides */
:deep(.v-select .v-field) {
  font-size: 14px;
}

:deep(.v-select .v-field__input) {
  padding-top: 6px;
  padding-bottom: 6px;
}
</style>
