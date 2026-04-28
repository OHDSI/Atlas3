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

        <!-- Layout: Data sources on left, reports on right -->
        <div class="generation-layout">
          <!-- Left: Data source tiles (fixed width) -->
          <div class="generation-layout__sidebar">
            <p class="text-subtitle-1 font-weight-medium mb-4">
              {{ t('navigation.datasources', 'Data Sources') }}
            </p>
            <data-source-tile-grid
              :cohort-id="cohortId"
              :sources="sources"
              @tile-click="handleDataSourceClick"
            />
          </div>

          <!-- Right: Reports or placeholder -->
          <div class="generation-layout__content">
            <transition
              name="slide-fade"
              mode="out-in"
            >
              <div
                v-if="showReports && selectedSourceKey"
                key="reports"
                class="h-100"
              >
                <v-tabs
                  v-model="activeTab"
                  density="compact"
                  color="primary"
                  class="generation-layout__tabs"
                >
                  <v-tab
                    value="inclusion-rules"
                    data-testid="generation-tab-inclusion-rules"
                  >
                    <v-icon class="mr-2">
                      mdi-filter-variant
                    </v-icon>
                    Inclusion Rules
                  </v-tab>
                  <v-tab
                    value="reports"
                    data-testid="generation-tab-reports"
                  >
                    <v-icon class="mr-2">
                      mdi-chart-box
                    </v-icon>
                    Reports
                  </v-tab>
                  <v-tab
                    value="samples"
                    data-testid="generation-tab-samples"
                  >
                    <v-icon class="mr-2">
                      mdi-shuffle-variant
                    </v-icon>
                    Samples
                  </v-tab>
                </v-tabs>
                <v-window
                  v-model="activeTab"
                  class="mt-2"
                >
                  <v-window-item value="inclusion-rules">
                    <v-card
                      flat
                      class="pa-4"
                    >
                      <inclusion-rule-report
                        v-if="cohortId && selectedSourceKey"
                        :cohort-id="cohortId"
                        :source-key="selectedSourceKey"
                      />
                    </v-card>
                  </v-window-item>
                  <v-window-item value="reports">
                    <report-panel
                      :cohort-id="cohortId ?? 0"
                      :source-key="selectedSourceKey"
                      :is-open="showReports"
                      @close="handleCloseReports"
                    />
                  </v-window-item>
                  <v-window-item value="samples">
                    <v-card
                      flat
                      class="pa-4"
                    >
                      <cohort-samples-panel
                        v-if="cohortId"
                        :cohort-id="cohortId"
                        :source-key="selectedSourceKey"
                      />
                    </v-card>
                  </v-window-item>
                </v-window>
              </div>

              <div
                v-else
                key="placeholder"
                class="placeholder-content"
              >
                <p class="text-subtitle-1 font-weight-medium mb-2">
                  {{ t('cohortDefinitions.cohort.modals.analysisTypes.title', 'Analysis Options') }}
                </p>
                <div class="text-body-2 text-grey">
                  {{ t('profiles.selectADataSource', 'Select a Data Source') }}
                </div>
              </div>
            </transition>
          </div>
        </div>
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
import InclusionRuleReport from '../reports/inclusion/InclusionRuleReport.vue'
import CohortSamplesPanel from '../cohort-samples/CohortSamplesPanel.vue'

const { t } = useI18n()
const activeTab = ref<'inclusion-rules' | 'reports' | 'samples'>('inclusion-rules')

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
.generation-layout {
  display: flex;
  gap: 1.5rem;
  min-height: 100%;
}

.generation-layout__sidebar {
  flex: 0 0 300px; /* Fixed width for data sources */
  min-width: 300px;
  max-width: 300px;
}

.generation-layout__content {
  flex: 1;
  min-width: 0; /* Allow content to shrink if needed */
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
}

@media (max-width: 959px) {
  .generation-layout {
    flex-direction: column;
  }

  .generation-layout__sidebar {
    flex: 0 0 auto;
    min-width: 100%;
    max-width: 100%;
  }
}

.border-b {
  border-bottom: 1px solid rgb(var(--v-border-color));
}

/* Transition animations for switching between placeholder and report views */
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
