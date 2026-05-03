<template>
  <div class="jobs-section">
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <span>{{ t('navigation.jobs') }}</span>
        <AtlasSpacer />

        <!-- Status Filter -->
        <v-btn-toggle
          v-model="statusFilter"
          mandatory
          density="compact"
          color="primary"
          variant="outlined"
        >
          <v-btn
            value="all"
            size="small"
          >
            {{ t('options.all') }}
            <v-chip
              size="x-small"
              class="ml-1"
              variant="tonal"
            >
              {{ totalJobsCount }}
            </v-chip>
          </v-btn>
          <v-btn
            value="running"
            size="small"
          >
            <AtlasIcon
              start
              size="small"
              color="blue"
            >
              mdi-play-circle
            </AtlasIcon>
            {{ t('ir.results.running') }}
            <v-chip
              v-if="runningJobsCount > 0"
              size="x-small"
              class="ml-1"
              color="blue"
              variant="tonal"
            >
              {{ runningJobsCount }}
            </v-chip>
          </v-btn>
          <v-btn
            value="completed"
            size="small"
          >
            <AtlasIcon
              start
              size="small"
              color="green"
            >
              mdi-check-circle
            </AtlasIcon>
            {{ t('executionStatus.values.COMPLETED') }}
          </v-btn>
          <v-btn
            value="failed"
            size="small"
          >
            <AtlasIcon
              start
              size="small"
              color="red"
            >
              mdi-alert-circle
            </AtlasIcon>
            {{ t('ir.results.failed') }}
          </v-btn>
        </v-btn-toggle>

        <!-- Auto-refresh Toggle -->
        <v-btn
          :icon="pollingEnabled ? 'mdi-sync' : 'mdi-sync-off'"
          :color="pollingEnabled ? 'primary' : 'default'"
          variant="text"
          :title="
            pollingEnabled
              ? tv('configuration.jobs.actions.stopPolling')
              : tv('configuration.jobs.actions.startPolling')
          "
          @click="togglePolling"
        />

        <!-- Manual Refresh -->
        <v-btn
          icon="mdi-refresh"
          variant="text"
          :loading="isLoading"
          :title="tv('jobs.refreshJobs')"
          @click="refresh"
        />
      </v-card-title>

      <AtlasDivider />

      <v-card-text class="pa-0">
        <!-- Loading State -->
        <div
          v-if="isLoading && !hasJobs"
          class="d-flex justify-center align-center pa-8"
        >
          <AtlasProgressCircular
            indeterminate
            color="primary"
          />
        </div>

        <!-- Error State -->
        <v-alert
          v-else-if="error"
          type="error"
          variant="tonal"
          class="ma-4"
        >
          {{ error }}
          <template #append>
            <AtlasButton
              variant="ghost"
              size="sm"
              @click="refresh"
            >
              {{ t('configuration.jobs.actions.retry') }}
            </AtlasButton>
          </template>
        </v-alert>

        <!-- Empty State -->
        <div
          v-else-if="!hasJobs"
          class="d-flex flex-column justify-center align-center pa-8 text-medium-emphasis"
        >
          <AtlasIcon
            size="64"
            class="mb-4"
          >
            mdi-briefcase-off-outline
          </AtlasIcon>
          <p class="text-h6">
            {{ t('configuration.jobs.empty.title') }}
          </p>
          <p class="text-body-2">
            {{ t('columns.description') }}
          </p>
        </div>

        <!-- Jobs Table -->
        <v-data-table
          v-else
          :headers="tableHeaders"
          :items="filteredJobs"
          :items-per-page="25"
          :loading="isLoading"
          class="jobs-table"
          hover
        >
          <!-- Execution ID Column -->
          <template #item.executionId="{ item }">
            <span class="text-mono">{{ item.executionId }}</span>
          </template>

          <!-- Type Column -->
          <template #item.type="{ item }">
            <div class="d-flex align-center">
              <AtlasIcon
                :icon="getTypeIcon(item.type)"
                size="small"
                class="mr-2"
              />
              <span>{{ getTypeLabel(item.type) }}</span>
            </div>
          </template>

          <!-- Name Column -->
          <template #item.name="{ item }">
            <a
              v-if="canNavigateToEntity(item)"
              href="#"
              class="text-decoration-none"
              @click.prevent="navigateToJobEntity(item)"
            >
              {{ item.name }}
            </a>
            <span v-else>{{ item.name }}</span>
          </template>

          <!-- Status Column -->
          <template #item.status="{ item }">
            <v-chip
              :color="getStatusDisplay(item.status).color"
              size="small"
              variant="tonal"
            >
              <AtlasIcon
                start
                size="small"
              >
                {{ getStatusDisplay(item.status).icon }}
              </AtlasIcon>
              {{ getStatusDisplay(item.status).label }}
            </v-chip>
          </template>

          <!-- Author Column -->
          <template #item.author="{ item }">
            <span
              v-if="item.author"
              class="text-body-2"
            >{{ item.author }}</span>
            <span
              v-else
              class="text-disabled"
            >-</span>
          </template>

          <!-- Start Time Column -->
          <template #item.startTime="{ item }">
            <span class="text-body-2">{{ formatDate(item.startTime) }}</span>
          </template>

          <!-- End Time Column -->
          <template #item.endTime="{ item }">
            <span class="text-body-2">{{ formatDate(item.endTime) }}</span>
          </template>

          <!-- Duration Column -->
          <template #item.duration="{ item }">
            <span class="text-body-2 text-mono">{{ formatJobDuration(item.duration) }}</span>
          </template>
        </v-data-table>
      </v-card-text>

      <!-- Last Updated Footer -->
      <AtlasDivider v-if="lastFetched" />
      <v-card-actions
        v-if="lastFetched"
        class="text-caption text-disabled"
      >
        <AtlasIcon
          size="small"
          class="mr-1"
        >
          mdi-clock-outline
        </AtlasIcon>
        {{ t('configuration.jobs.lastUpdated') }}: {{ formatDate(lastFetched) }}
        <AtlasSpacer />
        <span
          v-if="pollingEnabled"
          class="d-flex align-center"
        >
          <AtlasIcon
            size="small"
            color="primary"
            class="mr-1 rotating"
          > mdi-sync </AtlasIcon>
          {{ t('configuration.jobs.autoRefreshOn') }}
        </span>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDivider, AtlasIcon, AtlasProgressCircular, AtlasSpacer } from '@/components/ui'
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useJobs } from '@/composables/useJobs'
import type { JobStatusFilter } from '@/models/jobs.types'

const { t, tv } = useI18n()

const {
  filteredJobs,
  isLoading,
  error,
  pollingEnabled,
  statusFilter: storeStatusFilter,
  lastFetched,
  runningJobsCount,
  totalJobsCount,
  hasJobs,
  getStatusDisplay,
  getTypeLabel,
  getTypeIcon,
  formatJobDuration,
  formatDate,
  navigateToJobEntity,
  canNavigateToEntity,
  refresh,
  setFilter,
  togglePolling,
  stopPolling,
} = useJobs()

// Status filter with computed getter/setter
const statusFilter = computed({
  get: () => storeStatusFilter.value,
  set: (value: JobStatusFilter) => setFilter(value),
})

// Table headers - using existing notification translation keys where available
const tableHeaders = computed(() => [
  { title: tv('columns.executionId'), key: 'executionId', sortable: true, width: '100px' },
  { title: tv('columns.type'), key: 'type', sortable: true, width: '180px' },
  { title: tv('notifications.jobName'), key: 'name', sortable: true },
  { title: tv('notifications.status'), key: 'status', sortable: true, width: '140px' },
  { title: tv('columns.author'), key: 'author', sortable: true, width: '150px' },
  { title: tv('columns.startDate'), key: 'startTime', sortable: true, width: '180px' },
  { title: tv('notifications.endTime'), key: 'endTime', sortable: true, width: '180px' },
  { title: tv('notifications.duration'), key: 'duration', sortable: true, width: '100px' },
])

// Lifecycle hooks
onMounted(async () => {
  await refresh()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.jobs-section {
  width: 100%;
}

.jobs-table {
  width: 100%;
}

.text-mono {
  font-family: monospace;
}

/* Rotating animation for auto-refresh indicator */
.rotating {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
