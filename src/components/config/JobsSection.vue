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
          <AtlasButton
            toggle
            value="all"
            size="sm"
          >
            {{ t('options.all') }}
            <AtlasChip
              size="xs"
              class="ml-1"
              variant="tonal"
            >
              {{ totalJobsCount }}
            </AtlasChip>
          </AtlasButton>
          <AtlasButton
            toggle
            value="running"
            size="sm"
          >
            <AtlasIcon
              start
              size="small"
              color="blue"
            >
              mdi-play-circle
            </AtlasIcon>
            {{ t('ir.results.running') }}
            <AtlasChip
              v-if="runningJobsCount > 0"
              size="xs"
              class="ml-1"
              color="blue"
              variant="tonal"
            >
              {{ runningJobsCount }}
            </AtlasChip>
          </AtlasButton>
          <AtlasButton
            toggle
            value="completed"
            size="sm"
          >
            <AtlasIcon
              start
              size="small"
              color="green"
            >
              mdi-check-circle
            </AtlasIcon>
            {{ t('executionStatus.values.COMPLETED') }}
          </AtlasButton>
          <AtlasButton
            toggle
            value="failed"
            size="sm"
          >
            <AtlasIcon
              start
              size="small"
              color="red"
            >
              mdi-alert-circle
            </AtlasIcon>
            {{ t('ir.results.failed') }}
          </AtlasButton>
        </v-btn-toggle>

        <AtlasIconButton
          :icon="pollingEnabled ? 'mdi-sync' : 'mdi-sync-off'"
          :tone="pollingEnabled ? 'primary' : 'neutral'"
          variant="text"
          :title="
            pollingEnabled
              ? tv('configuration.jobs.actions.stopPolling')
              : tv('configuration.jobs.actions.startPolling')
          "
          v-bind="{
            ariaLabel: pollingEnabled
              ? tv('configuration.jobs.actions.stopPolling')
              : tv('configuration.jobs.actions.startPolling')
          }"
          @click="togglePolling"
        />

        <!-- Manual Refresh -->
        <AtlasIconButton
          icon="mdi-refresh"
          v-bind="{ ariaLabel: tv('jobs.refreshJobs') }"
          variant="text"
          :loading="isLoading"
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
        <AtlasAlert
          v-else-if="error"
          severity="danger"
          class="ma-4"
        >
          <div class="d-flex align-center justify-space-between">
            <span>{{ error }}</span>
            <AtlasButton
              variant="ghost"
              size="sm"
              @click="refresh"
            >
              {{ t('configuration.jobs.actions.retry') }}
            </AtlasButton>
          </div>
        </AtlasAlert>

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
        <AtlasDataTable
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
            <AtlasChip
              :color="getStatusDisplay(item.status).color"
              size="sm"
              variant="tonal"
            >
              <AtlasIcon
                start
                size="small"
              >
                {{ getStatusDisplay(item.status).icon }}
              </AtlasIcon>
              {{ getStatusDisplay(item.status).label }}
            </AtlasChip>
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
        </AtlasDataTable>
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
import { AtlasAlert, AtlasButton, AtlasChip, AtlasDataTable, AtlasDivider, AtlasIcon, AtlasIconButton, AtlasProgressCircular, AtlasSpacer } from '@/components/ui'
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
