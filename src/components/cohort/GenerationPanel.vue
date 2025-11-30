<template>
  <v-navigation-drawer
    :model-value="modelValue"
    location="right"
    temporary
    :width="drawerWidth"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card
      flat
      class="h-100 d-flex flex-column"
    >
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 border-b">
        <v-icon
          class="mr-2"
          color="primary"
        >
          mdi-database-cog
        </v-icon>
        <span class="text-h6">{{ t('cohortDefinitions.cohortDefinitionManager.tabs.generation', 'Generation') }}</span>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="close"
        />
      </v-card-title>

      <!-- Content -->
      <v-card-text class="flex-grow-1 overflow-y-auto pa-6">
        <!-- Unsaved cohort message -->
        <v-alert
          v-if="!cohortId"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          {{ t('cohortDefinitions.saveDefinitionBefore', 'Please save the cohort before generating.') }}
        </v-alert>

        <!-- No sources message -->
        <v-alert
          v-else-if="sources.length === 0"
          type="info"
          variant="tonal"
        >
          {{ t('components.generation.pickAtLeastOneSourceAlert', 'No data sources configured.') }}
        </v-alert>

        <!-- Show reports when a data source is selected -->
        <transition
          name="slide-fade"
          mode="out-in"
        >
          <div
            v-if="showReports && selectedSourceKey"
            key="reports"
          >
            <report-panel
              :cohort-id="cohortId ?? 0"
              :source-key="selectedSourceKey"
              :is-open="showReports"
              @close="handleCloseReports"
            />
          </div>

          <!-- Grid layout (data sources + analysis options) -->
          <div
            v-else
            key="grid"
            class="generation-grid"
          >
            <!-- Left: Data source tiles (40%) -->
            <div class="generation-grid__tiles">
              <p class="text-subtitle-1 font-weight-medium mb-4">
                {{ t('navigation.datasources', 'Data Sources') }}
              </p>
              <data-source-tile-grid
                :cohort-id="cohortId"
                :sources="sources"
                @tile-click="handleDataSourceClick"
              />
            </div>

            <!-- Right: Analysis options (60%) -->
            <div class="generation-grid__analysis">
              <p class="text-subtitle-1 font-weight-medium mb-4">
                {{ t('cohortDefinitions.cohort.modals.analysisTypes.title', 'Analysis Options') }}
              </p>
              <div class="text-body-2 text-grey">
                {{ t('profiles.selectADataSource', 'Select a Data Source') }}
              </div>
            </div>
          </div>
        </transition>
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useWebAPIStore } from '@/stores/webapi'
import DataSourceTileGrid from '../generation/DataSourceTileGrid.vue'
import ReportPanel from '../reports/ReportPanel.vue'

const { t } = useI18n()

interface Props {
  modelValue: boolean
  cohortId: number | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const webapiStore = useWebAPIStore()

// Report view state
const showReports = ref(false)
const selectedSourceKey = ref<string | null>(null)

const drawerWidth = computed(() => Math.min(window.innerWidth * 0.85, 1400))
const sources = computed(() => webapiStore.sourcesList)

function close() {
  emit('update:modelValue', false)
}

// Handle data source tile click to open reports
function handleDataSourceClick(sourceKey: string) {
  selectedSourceKey.value = sourceKey
  showReports.value = true
}

// Handle close event from ReportPanel
function handleCloseReports() {
  showReports.value = false
  selectedSourceKey.value = null
}

// Polling lifecycle
watch(() => props.modelValue, async (isOpen, wasOpen) => {
  if (isOpen && !wasOpen && props.cohortId) {
    // Panel just opened - fetch existing generation info
    await webapiStore.fetchCohortGenerationInfo(props.cohortId)
  } else if (!isOpen && wasOpen && props.cohortId) {
    // Panel just closed - stop polling and clear report state
    webapiStore.stopPolling(props.cohortId)
    showReports.value = false
    selectedSourceKey.value = null
  }
})

onMounted(async () => {
  await webapiStore.fetchSources()
  if (props.modelValue && props.cohortId) {
    // If panel is open on mount, fetch generation info
    await webapiStore.fetchCohortGenerationInfo(props.cohortId)
  }
})

onBeforeUnmount(() => {
  if (props.cohortId) {
    // Stop polling when unmounting
    webapiStore.stopPolling(props.cohortId)
  }
})
</script>

<style scoped>
.generation-grid {
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 2rem;
  min-height: 100%;
}

.generation-grid__tiles {
  /* Left column styles */
}

.generation-grid__analysis {
  /* Right column styles */
}

@media (max-width: 959px) {
  .generation-grid {
    grid-template-columns: 1fr;
  }
}

.border-b {
  border-bottom: 1px solid rgb(var(--v-border-color));
}

/* Transition animations for switching between grid and report views */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
