<template>
  <div
    v-if="isTrexSQLEnabled"
    class="trexsql-cache-section"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          start
          color="primary"
        >
          mdi-lightning-bolt
        </v-icon>
        {{ t('trexsql.cacheTitle', 'TrexSQL Patient Cache') }}
      </v-card-title>

      <v-card-text>
        <p class="text-body-1 mb-4">
          {{ t('trexsql.cacheDescription', 'Build and manage TrexSQL patient caches for fast cohort counting. Each data source can have its own cache.') }}
        </p>

        <!-- Loading State -->
        <div
          v-if="isLoading"
          class="d-flex align-center justify-center py-8"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
          <span class="ml-3">{{ t('common.loading', 'Loading...') }}</span>
        </div>

        <!-- Data Sources List -->
        <v-list
          v-else
          lines="two"
          class="trexsql-cache-section__list"
        >
          <v-list-item
            v-for="source in dataSourcesWithStatus"
            :key="source.sourceKey"
            class="trexsql-cache-section__item"
          >
            <template #prepend>
              <v-avatar
                :color="getStatusColor(source.cacheStatus?.status)"
                size="40"
              >
                <v-icon color="white">
                  {{ getStatusIcon(source.cacheStatus?.status) }}
                </v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ source.sourceName }}
            </v-list-item-title>

            <v-list-item-subtitle>
              <div class="d-flex align-center flex-wrap gap-2">
                <v-chip
                  :color="getStatusColor(source.cacheStatus?.status)"
                  size="small"
                  variant="tonal"
                >
                  {{ getStatusLabel(source.cacheStatus?.status) }}
                </v-chip>

                <!-- Cache Stats -->
                <template v-if="source.cacheStatus?.status === 'ready' || source.cacheStatus?.status === 'stale'">
                  <span
                    v-if="source.cacheStatus?.totalPatientCount"
                    class="text-body-2 text-grey-darken-1"
                  >
                    {{ formatNumber(source.cacheStatus.totalPatientCount) }} patients
                  </span>
                  <span
                    v-if="source.cacheStatus?.sizeBytes"
                    class="text-body-2 text-grey"
                  >
                    ({{ formatBytes(source.cacheStatus.sizeBytes) }})
                  </span>
                </template>

                <!-- Last Built Date -->
                <span
                  v-if="source.cacheStatus?.lastBuiltAt"
                  class="text-caption text-grey"
                >
                  {{ t('trexsql.lastBuilt', 'Built') }}: {{ formatDate(source.cacheStatus.lastBuiltAt) }}
                </span>

                <!-- Error Message -->
                <span
                  v-if="source.cacheStatus?.status === 'error' && source.cacheStatus?.errorMessage"
                  class="text-caption text-error"
                >
                  {{ source.cacheStatus.errorMessage }}
                </span>
              </div>
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex align-center gap-2">
                <!-- Build/Rebuild Button -->
                <v-btn
                  v-if="source.cacheStatus?.status !== 'building'"
                  :color="source.cacheStatus?.status === 'ready' ? 'primary' : 'success'"
                  :variant="source.cacheStatus?.status === 'ready' ? 'outlined' : 'flat'"
                  size="small"
                  :loading="buildingSource === source.sourceKey"
                  :disabled="buildingSource !== null"
                  @click="handleBuildCache(source.sourceKey)"
                >
                  <v-icon start>
                    {{ source.cacheStatus?.status === 'ready' || source.cacheStatus?.status === 'stale' ? 'mdi-refresh' : 'mdi-hammer' }}
                  </v-icon>
                  {{ source.cacheStatus?.status === 'ready' || source.cacheStatus?.status === 'stale'
                    ? t('trexsql.rebuild', 'Rebuild')
                    : t('trexsql.build', 'Build Cache')
                  }}
                </v-btn>

                <!-- Building Progress -->
                <div
                  v-else
                  class="d-flex align-center"
                >
                  <v-progress-circular
                    indeterminate
                    size="24"
                    width="2"
                    color="info"
                  />
                  <span class="ml-2 text-body-2 text-info">
                    {{ t('trexsql.building', 'Building...') }}
                  </span>
                </div>
              </div>
            </template>
          </v-list-item>

          <!-- Empty State -->
          <v-list-item v-if="dataSourcesWithStatus.length === 0">
            <v-list-item-title class="text-grey">
              {{ t('trexsql.noDataSources', 'No data sources available') }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Toast Notification -->
    <v-snackbar
      v-model="showToast"
      :timeout="5000"
      :color="toastColor"
      location="bottom"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showToast = false"
        >
          {{ t('common.close', 'Close') }}
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
/**
 * TrexSQLCacheSection Component
 *
 * Displays TrexSQL cache status for all data sources and allows
 * building/rebuilding caches. Shows in Settings > Cache section.
 */

import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import { listDataSources } from '@/services/datasource.service'
import { getCacheStatus, buildCache } from '@/services/trexsql.service'
import type { CacheStatusType, DataSourceWithCacheStatus } from '@/models/trexsql.types'

// Composables
const { t } = useI18n()
const authStore = useAuthStore()

// ============================================================================
// State
// ============================================================================

const isLoading = ref(false)
const dataSourcesWithStatus = ref<DataSourceWithCacheStatus[]>([])
const buildingSource = ref<string | null>(null)
const showToast = ref(false)
const toastMessage = ref('')
const toastColor = ref<'success' | 'error' | 'info'>('success')

// ============================================================================
// Computed
// ============================================================================

/**
 * Whether TrexSQL cache feature is enabled
 */
const isTrexSQLEnabled = computed(() => {
  return authStore.trexsqlCacheEnabled
})

// ============================================================================
// Methods
// ============================================================================

/**
 * Load data sources with their cache status
 */
async function loadDataSources(): Promise<void> {
  if (!isTrexSQLEnabled.value) return

  isLoading.value = true

  try {
    const sources = await listDataSources()

    const sourcesWithStatus = await Promise.all(
      sources.map(async (source): Promise<DataSourceWithCacheStatus> => {
        try {
          const cacheStatus = await getCacheStatus(source.sourceKey)
          return {
            sourceKey: source.sourceKey,
            sourceName: source.sourceName,
            cacheStatus
          }
        } catch (error) {
          logger.warn('TrexSQLCacheSection', `Failed to get cache status for ${source.sourceKey}`, error)
          return {
            sourceKey: source.sourceKey,
            sourceName: source.sourceName,
            cacheStatus: null
          }
        }
      })
    )

    dataSourcesWithStatus.value = sourcesWithStatus
  } catch (error) {
    logger.error('TrexSQLCacheSection', 'Failed to load data sources', error)
    showNotification('Failed to load data sources', 'error')
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle build cache button click
 */
async function handleBuildCache(sourceKey: string): Promise<void> {
  buildingSource.value = sourceKey

  try {
    const response = await buildCache(sourceKey)

    // Update local status to 'building'
    const source = dataSourcesWithStatus.value.find(s => s.sourceKey === sourceKey)
    if (source) {
      source.cacheStatus = {
        sourceKey,
        status: 'building',
        totalPatientCount: source.cacheStatus?.totalPatientCount ?? null,
        lastBuiltAt: source.cacheStatus?.lastBuiltAt ?? null,
        sizeBytes: source.cacheStatus?.sizeBytes ?? null,
        errorMessage: null
      }
    }

    showNotification(response.message || 'Cache build started', 'success')

    // Start polling for status updates
    pollCacheStatus(sourceKey)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to start cache build'
    showNotification(errorMessage, 'error')
    buildingSource.value = null
  }
}

/**
 * Poll cache status while building
 */
async function pollCacheStatus(sourceKey: string): Promise<void> {
  const maxPolls = 120 // 10 minutes max (5 second intervals)
  let pollCount = 0

  const poll = async () => {
    try {
      const status = await getCacheStatus(sourceKey)

      // Update local status
      const source = dataSourcesWithStatus.value.find(s => s.sourceKey === sourceKey)
      if (source) {
        source.cacheStatus = status
      }

      // Check if still building
      if (status.status === 'building' && pollCount < maxPolls) {
        pollCount++
        setTimeout(poll, 5000) // Poll every 5 seconds
      } else {
        buildingSource.value = null

        if (status.status === 'ready') {
          showNotification('Cache build completed successfully', 'success')
        } else if (status.status === 'error') {
          showNotification(status.errorMessage || 'Cache build failed', 'error')
        }
      }
    } catch (error) {
      logger.error('TrexSQLCacheSection', 'Failed to poll cache status', error)
      buildingSource.value = null
    }
  }

  // Start polling after initial delay
  setTimeout(poll, 2000)
}

/**
 * Show toast notification
 */
function showNotification(message: string, color: 'success' | 'error' | 'info'): void {
  toastMessage.value = message
  toastColor.value = color
  showToast.value = true
}

/**
 * Get color for cache status
 */
function getStatusColor(status: CacheStatusType | undefined): string {
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
 * Get icon for cache status
 */
function getStatusIcon(status: CacheStatusType | undefined): string {
  switch (status) {
    case 'ready':
      return 'mdi-check-circle'
    case 'building':
      return 'mdi-cog'
    case 'stale':
      return 'mdi-clock-alert'
    case 'error':
      return 'mdi-alert-circle'
    case 'not_built':
    default:
      return 'mdi-database-off'
  }
}

/**
 * Get label for cache status
 */
function getStatusLabel(status: CacheStatusType | undefined): string {
  switch (status) {
    case 'ready':
      return t('trexsql.statusReady', 'Ready').value
    case 'building':
      return t('trexsql.statusBuilding', 'Building').value
    case 'stale':
      return t('trexsql.statusStale', 'Stale').value
    case 'error':
      return t('trexsql.statusError', 'Error').value
    case 'not_built':
    default:
      return t('trexsql.statusNotBuilt', 'Not Built').value
  }
}

/**
 * Format number with locale
 */
function formatNumber(num: number): string {
  return num.toLocaleString()
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
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

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  loadDataSources()
})
</script>

<style scoped>
.trexsql-cache-section {
  max-width: 800px;
  margin-top: 24px;
}

.trexsql-cache-section__list {
  background: transparent;
}

.trexsql-cache-section__item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 12px;
  background: #fafafa;
}

.trexsql-cache-section__item:last-child {
  margin-bottom: 0;
}

.gap-2 {
  gap: 8px;
}
</style>
