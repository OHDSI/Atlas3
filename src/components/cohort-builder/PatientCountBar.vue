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
          class="patient-count-bar__bar-layout"
        >
          <div class="patient-count-bar__bar-container">
            <v-progress-linear
              :model-value="previousPercentage"
              :color="getProgressColor(previousPercentage)"
              height="8"
              rounded
              reverse
              class="patient-count-bar__progress pulsing"
            />
          </div>
          <div class="patient-count-bar__count-display">
            <span class="patient-count-bar__cohort-count">{{ previousCohortCount }}</span>
            <span class="patient-count-bar__separator">/</span>
            <span class="patient-count-bar__total-count">{{ previousTotalCount }}</span>
            <span class="patient-count-bar__label">{{ t('trexsql.patients', 'patients') }}</span>
          </div>
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
          <span>{{
            t('trexsql.selectDatasetPrompt', 'Select a dataset to view patient count')
          }}</span>
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

        <!-- Zero Patients -->
        <div
          v-else-if="patientCount && patientCount.cohortPatientCount === 0"
          class="patient-count-bar__bar-layout"
        >
          <div class="patient-count-bar__bar-container">
            <v-progress-linear
              :model-value="0"
              color="grey"
              height="8"
              rounded
              reverse
              class="patient-count-bar__progress"
            />
          </div>
          <div class="patient-count-bar__count-display">
            <span class="patient-count-bar__cohort-count">0</span>
            <span class="patient-count-bar__separator">/</span>
            <span class="patient-count-bar__total-count">{{ totalPatientCountFormatted }}</span>
            <span class="patient-count-bar__label">{{ t('trexsql.patients', 'patients') }}</span>
          </div>
        </div>

        <!-- Patient Count Result -->
        <div
          v-else-if="patientCount"
          class="patient-count-bar__bar-layout"
        >
          <div class="patient-count-bar__bar-container">
            <v-progress-linear
              :model-value="animatedPercentage"
              :color="getProgressColor(animatedPercentage)"
              height="8"
              rounded
              reverse
              class="patient-count-bar__progress"
            />
          </div>
          <div class="patient-count-bar__count-display">
            <span class="patient-count-bar__cohort-count">{{
              animatedCohortCount.toLocaleString()
            }}</span>
            <span class="patient-count-bar__separator">/</span>
            <span class="patient-count-bar__total-count">{{ totalPatientCountFormatted }}</span>
            <span class="patient-count-bar__label">{{ t('trexsql.patients', 'patients') }}</span>
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
                <div class="font-weight-medium">
                  {{ t('trexsql.staleCacheWarning', 'Cache may be stale') }}
                </div>
                <div
                  v-if="selectedCacheStatus?.lastBuiltAt"
                  class="text-caption"
                >
                  {{ t('trexsql.lastBuilt', 'Last built') }}:
                  {{ formatDate(selectedCacheStatus.lastBuiltAt) }}
                </div>
              </div>
            </v-tooltip>
          </div>
        </div>

        <!-- Waiting for Expression -->
        <div
          v-else
          class="patient-count-bar__waiting"
        >
          <span class="text-grey">{{
            t('trexsql.addCriteria', 'Add criteria to see patient count')
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onBeforeUnmount, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useTrexSQLCache } from '@/composables/useTrexSQLCache'
import type { CacheStatusType } from '@/models/trexsql.types'

interface Props {
  expression?: Record<string, unknown>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const { t } = useI18n()
const {
  isTrexSQLEnabled,
  selectedSourceKey,
  dataSources,
  isLoadingDataSources,
  isCountLoading,
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
  clearCount,
} = useTrexSQLCache()

const previousPercentage = ref(0)
const previousCohortCount = ref('0')
const previousTotalCount = ref('0')
const animatedPercentage = ref(0)
const animatedCohortCount = ref(0)
let animationFrameId: number | null = null

function animateToValue(targetPercentage: number, targetCount: number) {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  const startPercentage = animatedPercentage.value
  const startCount = animatedCohortCount.value
  const startTime = performance.now()
  const duration = 100

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Linear interpolation for consistent speed
    animatedPercentage.value = startPercentage + (targetPercentage - startPercentage) * progress
    animatedCohortCount.value = Math.round(startCount + (targetCount - startCount) * progress)

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      animationFrameId = null
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

watch(
  () => patientCount.value,
  newCount => {
    if (newCount && !isCountLoading.value) {
      previousPercentage.value = cohortPercentage.value
      previousCohortCount.value = cohortPatientCountFormatted.value
      previousTotalCount.value = totalPatientCountFormatted.value

      // Animate to new values
      animateToValue(cohortPercentage.value, newCount.cohortPatientCount)
    } else if (!newCount) {
      // Reset animated values when count is cleared
      animatedPercentage.value = 0
      animatedCohortCount.value = 0
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }
  }
)

// Initialize animated values on mount
watch(
  () => cohortPercentage.value,
  newPercentage => {
    if (animatedPercentage.value === 0 && newPercentage > 0 && !isCountLoading.value) {
      animatedPercentage.value = newPercentage
      animatedCohortCount.value = patientCount.value?.cohortPatientCount || 0
    }
  },
  { immediate: true }
)

const selectedSource = computed({
  get: () => selectedSourceKey.value,
  set: (value: string | null) => {
    if (value) {
      selectDataSource(value)
      clearCount()
      if (props.expression && Object.keys(props.expression).length > 0) {
        getPatientCount(props.expression)
      }
    }
  },
})

const dataSourceItems = computed(() => {
  return dataSources.value.map(source => ({
    text: source.sourceName,
    value: source.sourceKey,
    cacheStatus: source.cacheStatus?.status,
  }))
})

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

function getProgressColor(percentage: number): string {
  if (percentage === 0) return 'grey'
  return 'primary'
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

function handleRetry(): void {
  emit('retry')
  if (props.expression) {
    getPatientCount(props.expression)
  }
}

watch(
  () => props.expression,
  newExpression => {
    if (
      newExpression &&
      Object.keys(newExpression).length > 0 &&
      selectedSourceKey.value &&
      isCacheReady.value
    ) {
      getPatientCount(newExpression)
    }
  },
  { deep: true }
)

watch(
  () => isCacheReady.value,
  isReady => {
    if (isReady && props.expression && Object.keys(props.expression).length > 0) {
      getPatientCount(props.expression)
    }
  }
)

onMounted(async () => {
  await initialize()
})

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
/* Hero metric treatment — when TrexSQL is enabled, the patient
 * count gets prominent typography so the user sees the funnel
 * size at a glance. Surface-variant background gives it presence
 * without becoming a separate card. */
.patient-count-bar {
  margin: 0 0 12px;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.patient-count-bar__content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.patient-count-bar__selector {
  flex: 0 0 220px;
}

.patient-count-bar__select {
  max-width: 220px;
}

.patient-count-bar__count-section {
  flex: 1;
  display: flex;
  align-items: center;
  min-height: 32px;
}

.patient-count-bar__error,
.patient-count-bar__prompt,
.patient-count-bar__cache-warning,
.patient-count-bar__waiting {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.patient-count-bar__error {
  color: rgb(var(--v-theme-error));
}

.patient-count-bar__error-text {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patient-count-bar__bar-layout {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.patient-count-bar__bar-container {
  flex: 1;
  display: flex;
  align-items: center;
}

.patient-count-bar__progress {
  width: 100%;
}

/* Override Vuetify transitions for JS animation control */
.patient-count-bar__progress :deep(.v-progress-linear__determinate),
.patient-count-bar__progress :deep(.v-progress-linear__background) {
  transition: none !important;
}

.patient-count-bar__progress.pulsing :deep(.v-progress-linear__determinate) {
  animation: colorPulse 1.2s ease-in-out infinite;
}

@keyframes colorPulse {
  0%,
  100% {
    opacity: 0.6;
    filter: brightness(0.8);
  }
  50% {
    opacity: 1;
    filter: brightness(1.2);
  }
}

.patient-count-bar__count-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
  min-width: 180px;
  justify-content: flex-end;
}

.patient-count-bar__cohort-count {
  font-size: 28px;
  font-weight: 300;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.patient-count-bar__separator {
  font-size: 18px;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.5;
  margin: 0 4px;
  font-weight: 300;
}

.patient-count-bar__total-count {
  font-size: 16px;
  font-weight: 400;
  color: rgb(var(--v-theme-on-surface-variant));
  font-variant-numeric: tabular-nums;
}

.patient-count-bar__label {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  margin-left: 4px;
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
