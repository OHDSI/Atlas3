<template>
  <div class="cohort-builder">
    <!-- Breadcrumb Navigation -->
    <nav class="cohort-builder__breadcrumb">
      <span
        class="cohort-builder__breadcrumb-item cohort-builder__breadcrumb-item--link"
        @click="router.push('/cohorts')"
      >{{ t('navigation.cohortdefinitions') }}</span>
      <span class="cohort-builder__breadcrumb-separator">›</span>
      <span class="cohort-builder__breadcrumb-item cohort-builder__breadcrumb-item--active">
        {{ cohortName || t('cohortDefinitions.newDefinition') }}
      </span>
      <v-tooltip
        :text="t('common.editName', 'Edit name').value"
        location="bottom"
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon
            v-bind="tooltipProps"
            size="small"
            class="cohort-builder__breadcrumb-edit-icon"
            @click="showEditNameDialog = true"
          >
            mdi-pencil
          </v-icon>
        </template>
      </v-tooltip>
    </nav>

    <!-- Edit Name Dialog -->
    <v-dialog
      v-model="showEditNameDialog"
      max-width="600px"
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon
            color="primary"
            class="mr-2"
          >
            mdi-pencil
          </v-icon>
          {{ t('common.editCohortName', 'Edit Cohort Name') }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editingName"
            :label="t('columns.name', 'Name').value"
            :placeholder="tv('cohortDefinitions.newDefinitionTitle')"
            variant="outlined"
            autofocus
            @keyup.enter="saveEditedName"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showEditNameDialog = false"
          >
            {{ t('common.cancel', 'Cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="elevated"
            @click="saveEditedName"
          >
            {{ t('common.save', 'Save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Top Toolbar -->
    <div class="cohort-builder__toolbar">
      <div class="cohort-builder__toolbar-left">
        <div class="cohort-builder__cohort-description">
          <label class="cohort-builder__label">{{ t('columns.description', 'DESCRIPTION').value.toUpperCase() }}:</label>
          <input
            v-model="cohortDescription"
            class="cohort-builder__description-input"
            :placeholder="t('common.description', 'Description').value"
            data-testid="cohort-description-input"
          >
        </div>

        <!-- Concept Sets Icon -->
        <v-tooltip
          v-if="usedConceptSets.length > 0"
          :text="t('conceptSets.title', 'Concept Sets').value"
          location="bottom"
        >
          <template #activator="{ props: tooltipProps }">
            <v-badge
              v-bind="tooltipProps"
              :content="usedConceptSets.length"
              color="primary"
              class="cohort-builder__validation-badge"
            >
              <v-icon
                color="primary"
                icon="mdi-shape"
                size="small"
                data-testid="concept-sets-icon"
                style="cursor: pointer"
                @click="showConceptSetsDialog = true"
              />
            </v-badge>
          </template>
        </v-tooltip>

        <!-- Validation Notification Icon -->
        <v-tooltip
          v-if="isValidating"
          :text="t('common.validating', 'Validating cohort...').value"
          location="bottom"
        >
          <template #activator="{ props: tooltipProps }">
            <v-progress-circular
              v-bind="tooltipProps"
              indeterminate
              size="20"
              width="2"
              color="primary"
              class="cohort-builder__validation-badge"
            />
          </template>
        </v-tooltip>
        <v-tooltip
          v-else-if="validationWarnings.length > 0"
          :text="t('cc.viewEdit.tabs.messages', 'View validation messages').value"
          location="bottom"
        >
          <template #activator="{ props: tooltipProps }">
            <v-badge
              v-bind="tooltipProps"
              :content="validationWarnings.length"
              :color="highestSeverityColor"
              class="cohort-builder__validation-badge"
            >
              <v-icon
                color="primary"
                icon="mdi-message-text"
                size="small"
                data-testid="validation-icon"
                style="cursor: pointer"
                @click="showValidationDialog = true"
              />
            </v-badge>
          </template>
        </v-tooltip>

        <!-- Concept Sets Dialog -->
        <v-dialog
          v-model="showConceptSetsDialog"
          max-width="900"
        >
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon
                color="primary"
                class="mr-2"
              >
                mdi-shape
              </v-icon>
              {{ t('conceptSets.title', 'Concept Sets') }}
            </v-card-title>
            <v-card-text>
              <v-table>
                <thead>
                  <tr>
                    <th class="text-left">
                      {{ t('columns.id', 'ID') }}
                    </th>
                    <th class="text-left">
                      {{ t('columns.name', 'Name') }}
                    </th>
                    <th class="text-left">
                      {{ t('common.concepts', 'Concepts') }}
                    </th>
                    <th class="text-left">
                      {{ t('common.actions', 'Actions') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="conceptSet in usedConceptSets"
                    :key="conceptSet.id"
                  >
                    <td>{{ conceptSet.id }}</td>
                    <td>{{ conceptSet.name }}</td>
                    <td>{{ conceptSet.items?.length || 0 }}</td>
                    <td>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        @click="handleViewConceptSet(conceptSet)"
                      >
                        <v-icon size="small">
                          mdi-eye
                        </v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
              <div
                v-if="usedConceptSets.length === 0"
                class="text-center py-8 text-grey"
              >
                {{ t('common.noConceptSets', 'No concept sets in this cohort') }}
              </div>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="primary"
                @click="showConceptSetsDialog = false"
              >
                {{ t('common.close') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Validation Messages Dialog -->
        <v-dialog
          v-model="showValidationDialog"
          max-width="800"
        >
          <v-card>
            <v-card-title class="d-flex align-center">
              <v-icon
                :color="highestSeverityColor"
                class="mr-2"
              >
                mdi-message-text
              </v-icon>
              {{ t('cc.viewEdit.tabs.messages') }}
            </v-card-title>
            <v-card-text>
              <v-table>
                <thead>
                  <tr>
                    <th
                      class="text-left"
                      style="width: 120px"
                    >
                      {{ t('common.severity', 'Severity') }}
                    </th>
                    <th class="text-left">
                      {{ t('common.message', 'Message') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(warning, idx) in validationWarnings"
                    :key="idx"
                    :class="{
                      'bg-error-lighten-4': warning.severity === 'CRITICAL',
                      'bg-warning-lighten-4': warning.severity === 'WARNING',
                      'bg-info-lighten-4': warning.severity === 'INFO'
                    }"
                  >
                    <td>
                      <v-chip
                        :color="warning.severity === 'CRITICAL' ? 'error' : warning.severity === 'WARNING' ? 'warning' : 'info'"
                        size="small"
                        label
                      >
                        {{ warning.severity }}
                      </v-chip>
                    </td>
                    <td>{{ warning.message }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                color="primary"
                @click="showValidationDialog = false"
              >
                {{ t('common.close') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>

      <div class="cohort-builder__toolbar-center">
        <!-- Center area intentionally empty -->
      </div>

      <div class="cohort-builder__toolbar-right">
        <v-btn
          variant="outlined"
          @click="handleCancel"
        >
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!canSave"
          @click="handleSave"
        >
          <v-icon
            v-if="hasUnsavedChanges"
            start
            size="small"
            color="white"
          >
            mdi-circle
          </v-icon>
          {{ t('common.save') }}
        </v-btn>
        <v-btn
          v-if="cohortId"
          color="orange"
          variant="outlined"
          prepend-icon="mdi-database-cog"
          :disabled="!canSave"
          data-testid="generate-btn"
          @click="openGenerationPanel"
        >
          {{ t('components.generation.generate') }}
        </v-btn>
      </div>
    </div>

    <!-- Cohort Entry Events -->
    <div class="section-wrapper mb-6">
      <div class="section-header">
        <div class="section-title-container">
          <h3 class="section-title">
            {{ t('components.cohortExpressionEditor.cohortEntryEvents') }}
          </h3>
        </div>

        <div class="section-controls">
          <v-btn-toggle
            v-model="qualifyingLimit"
            mandatory
            density="compact"
            variant="outlined"
            divided
          >
            <v-btn
              value="FIRST"
              size="small"
            >
              {{ t('options.earliestEvents', 'First') }}
            </v-btn>
            <v-btn
              value="ALL"
              size="small"
            >
              {{ t('options.all') }}
            </v-btn>
            <v-btn
              value="LAST"
              size="small"
            >
              {{ t('options.latestEvents', 'Latest') }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <div class="section-obs-period">
          <span class="obs-period-label">{{ t('cohortDefinitions.designTab.collapseEntryLabel', 'Limit cohort to') }}</span>
          <span class="obs-period-text">{{ t('components.cohortExpressionEditor.cohortEntryEventsText_3') }}</span>
          <v-text-field
            v-model.number="observationPeriod.priorDays"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
            style="width: 80px;"
            min="0"
          />
          <span class="obs-period-text">{{ t('components.cohortExpressionEditor.cohortEntryEventsText_4') }}</span>
          <v-text-field
            v-model.number="observationPeriod.postDays"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
            style="width: 80px;"
            min="0"
          />
          <span class="obs-period-text">{{ t('components.cohortExpressionEditor.cohortEntryEventsText_5') }}</span>
        </div>
      </div>

      <entry-events-list
        :events="entryEvents"
        @update:events="entryEvents = $event"
        @select-concept-set="handleSelectConceptSet"
        @edit-concept-set="handleEditConceptSet"
      />

      <!-- Additional Criteria (restricts entry events) -->
      <div
        v-if="additionalCriteria"
        class="mt-4"
      >
        <div class="additional-criteria-header">
          <span class="additional-criteria-label">WITH</span>
          <v-btn-toggle
            v-model="additionalCriteria.qualifyingLimit"
            mandatory
            density="compact"
            variant="outlined"
            divided
            class="ml-4"
          >
            <v-btn
              value="FIRST"
              size="small"
            >
              {{ t('options.earliestEvents', 'First') }}
            </v-btn>
            <v-btn
              value="ALL"
              size="small"
            >
              {{ t('options.all') }}
            </v-btn>
            <v-btn
              value="LAST"
              size="small"
            >
              {{ t('options.latestEvents', 'Latest') }}
            </v-btn>
          </v-btn-toggle>
        </div>
        <criteria-group-editor
          v-model="additionalCriteria"
          @select-concept-set="handleSelectConceptSetForAdditionalCriteria"
          @edit-concept-set="handleEditConceptSet"
          @remove="removeAdditionalCriteria"
        />
      </div>
      <v-btn
        v-else
        class="mt-4"
        variant="outlined"
        prepend-icon="mdi-filter-plus"
        @click="addAdditionalCriteria"
      >
        {{ t('components.cohortExpressionEditor.newInclusionCriteria') }}
      </v-btn>
    </div>

    <!-- Inclusion Criteria -->
    <div class="section-wrapper mb-6">
      <div class="section-header section-header--centered">
        <div class="section-title-container">
          <h3 class="section-title">
            {{ t('components.cohortExpressionEditor.inclusionCriteriaTitle') }}
          </h3>
        </div>

        <div class="section-controls section-controls--center">
          <v-btn-toggle
            v-model="inclusionQualifyingLimit"
            mandatory
            density="compact"
            variant="outlined"
            divided
          >
            <v-btn
              value="FIRST"
              size="small"
            >
              {{ t('options.earliestEvents', 'First') }}
            </v-btn>
            <v-btn
              value="ALL"
              size="small"
            >
              {{ t('options.all') }}
            </v-btn>
            <v-btn
              value="LAST"
              size="small"
            >
              {{ t('options.latestEvents', 'Latest') }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <div class="section-spacer" />
      </div>
      <inclusion-criteria-panel
        v-model="inclusionRules"
        :qualifying-limit="inclusionQualifyingLimit"
        @update:qualifying-limit="inclusionQualifyingLimit = $event"
        @select-concept-set="handleSelectConceptSetForCriteria"
        @edit-concept-set="handleEditConceptSet"
      />
    </div>

    <!-- Exit Criteria -->
    <div class="section-wrapper mb-6">
      <div class="section-header section-header--centered">
        <div class="section-title-container">
          <h3 class="section-title">
            {{ t('components.cohortExpressionEditor.cohortExitTitle') }}
          </h3>
        </div>

        <div class="section-controls section-controls--center">
          <v-btn-toggle
            v-model="exitCriteria.strategy"
            mandatory
            density="compact"
            variant="outlined"
            divided
          >
            <v-btn
              value="CONTINUOUS_OBSERVATION"
              size="small"
            >
              {{ t('options.endOfContinuousObservation') }}
            </v-btn>
            <v-btn
              value="FIXED_DURATION"
              size="small"
            >
              {{ t('options.fixedDurationRelativeToInitialEvent') }}
            </v-btn>
            <v-btn
              value="CONTINUOUS_DRUG"
              size="small"
            >
              {{ t('options.endOfContinuousDrugExposure') }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <div class="section-spacer" />
      </div>
      <exit-criteria-panel
        v-model="exitCriteria"
        :censoring-criteria="censoringCriteria"
        :concept-sets="usedConceptSets"
        @update:censoring-criteria="censoringCriteria = $event"
        @select-drug-concept-set="handleSelectDrugConceptSet"
        @select-censoring-concept-set="handleSelectCensoringConceptSet"
      />
    </div>

    <!-- Cohort Eras -->
    <div class="section-wrapper mb-6">
      <div class="section-header section-header--centered">
        <div class="section-title-container">
          <h3 class="section-title">
            {{ t('components.cohortExpressionEditor.cohortErasTitle', 'Cohort Eras') }}
          </h3>
        </div>

        <div class="section-spacer" />
      </div>
      <censor-window-editor
        v-model="censorWindow"
        @validation-error="handleCensorWindowValidation"
      />
    </div>

    <!-- Concept Set Selection Dialog (shows all system concept sets) -->
    <concept-set-selection-dialog
      v-model="isConceptSetDialogOpen"
      @concept-set-selected="handleConceptSetSelected"
      @edit-concept-set="handleEditConceptSet"
      @create-new="handleCreateNewConceptSet"
    />

    <!-- Concept Set Editor Side Panel (for editing/creating concept sets) -->
    <concept-set-editor
      v-if="conceptSetsStore.editorOpen"
      :model-value="conceptSetsStore.editorOpen"
      :concept-set="conceptSetsStore.currentSet"
      @update:model-value="(value) => { if (!value) conceptSetsStore.closeEditor() }"
      @save="handleConceptSetSaved"
    />

    <!-- Error Snackbar -->
    <v-snackbar
      v-model="showError"
      color="error"
      :timeout="5000"
    >
      {{ errorMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showError = false"
        >
          {{ t('common.close') }}
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Success Snackbar -->
    <v-snackbar
      v-model="showSuccess"
      color="success"
      :timeout="3000"
    >
      {{ successMessage }}
    </v-snackbar>

    <!-- Loading Overlay -->
    <v-overlay
      v-model="isLoadingCohort"
      class="align-center justify-center"
      persistent
    >
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      />
      <div class="text-h6 mt-4">
        {{ t('cohortDefinitions.loading', 'Loading cohort definition...') }}
      </div>
    </v-overlay>

    <!-- Generation Panel -->
    <generation-panel
      v-model="isGenerationPanelOpen"
      :cohort-id="cohortId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useWebAPIStore } from '@/stores/webapi'
import { useAtlasConverter } from '@/composables/useAtlasConverter'
import { useI18n } from '@/composables/useI18n'
import { getCohortDefinition, validateCohortDefinition } from '@/services/webapi'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import type {
  CohortEvent,
  ConceptSetReference,
  InclusionRule,
  ExitCriteria,
  Period,
  ObservationPeriod,
  QualifyingLimit,
  CohortDefinition,
  CriteriaGroup
} from '@/models/cohort.types'
import type { ValidationWarning, ValidationSeverity } from '@/models/cohort-validation.types'
import EntryEventsList from './EntryEventsList.vue'
import ConceptSetSelectionDialog from './ConceptSetSelectionDialog.vue'
import ConceptSetEditor from '../concepts/ConceptSetEditor.vue'
import InclusionCriteriaPanel from '../cohort-builder/InclusionCriteriaPanel.vue'
import ExitCriteriaPanel from '../cohort-builder/ExitCriteriaPanel.vue'
import CensorWindowEditor from '../cohort-builder/CensorWindowEditor.vue'
import CriteriaGroupEditor from '../cohort-builder/CriteriaGroupEditor.vue'
import GenerationPanel from './GenerationPanel.vue'

interface Props {
  id?: string
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()
const cohortStore = useCohortStore()
const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()
const { importFromFile, downloadAtlasJSON, conversionError } = useAtlasConverter()
const { t, tv } = useI18n()

// Core cohort state
const cohortName = ref('')
const cohortDescription = ref('')
const entryEvents = ref<CohortEvent[]>([])
const additionalCriteria = ref<CriteriaGroup | undefined>(undefined)
const inclusionRules = ref<InclusionRule[]>([])
const exitCriteria = ref<ExitCriteria>({ strategy: 'CONTINUOUS_OBSERVATION' })
const censorWindow = ref<Period | null>(null)
const censoringCriteria = ref<CohortEvent[]>([])
const observationPeriod = ref<ObservationPeriod>({ priorDays: 0, postDays: 0 })
const qualifyingLimit = ref<QualifyingLimit>('ALL') // For entry events
const inclusionQualifyingLimit = ref<QualifyingLimit>('ALL') // For inclusion criteria

// UI state
const showValidationDialog = ref(false)
const showConceptSetsDialog = ref(false)
const isGenerationPanelOpen = ref(false)

// UI state
// If we have an ID prop, start with loading=true to prevent UI from rendering before data loads
const isLoadingCohort = ref(!!props.id)
const isConceptSetDialogOpen = ref(false)
const selectedCriteriaContext = ref<{
  eventId?: string | null
  ruleIndex: number
  groupIndex: number
  eventIndex: number
} | null>(null)
const showError = ref(false)
const errorMessage = ref('')
const showSuccess = ref(false)
const successMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const showEditNameDialog = ref(false)
const editingName = ref('')
const isConfirmingNavigation = ref(false) // Flag to prevent double confirmation

// Snapshot of the loaded/saved state for change detection
const loadedSnapshot = ref<string | null>(null)

// Generation state (T119, T120)
const selectedSourceKey = ref<string | null>(null)
const generationError = ref<string | null>(null)

// Validation state
const validationWarnings = ref<ValidationWarning[]>([])
const isValidating = ref(false)
let validationDebounceTimer: ReturnType<typeof setTimeout> | null = null

const cohortId = computed(() => props.id ? Number(props.id) : null)

const canSave = computed(() => {
  return cohortName.value.trim().length > 0 && entryEvents.value.length > 0
})

/**
 * Create a snapshot of the current cohort state for change detection
 */
function createStateSnapshot(): string {
  return JSON.stringify({
    name: cohortName.value,
    description: cohortDescription.value,
    entryEvents: entryEvents.value,
    additionalCriteria: additionalCriteria.value,
    inclusionRules: inclusionRules.value,
    exitCriteria: exitCriteria.value,
    censorWindow: censorWindow.value,
    censoringCriteria: censoringCriteria.value,
    observationPeriod: observationPeriod.value,
    qualifyingLimit: qualifyingLimit.value,
    inclusionQualifyingLimit: inclusionQualifyingLimit.value,
  })
}

/**
 * Computed property that detects if there are unsaved changes
 * by comparing current state with the loaded snapshot
 */
const hasUnsavedChanges = computed(() => {
  if (!loadedSnapshot.value) {
    // No snapshot means we're in a new cohort, check if there's any content
    return cohortName.value.trim().length > 0 || entryEvents.value.length > 0
  }

  // Compare current state with loaded snapshot
  const currentSnapshot = createStateSnapshot()
  return currentSnapshot !== loadedSnapshot.value
})

// Validation computed properties
const groupedWarningsBySeverity = computed(() => {
  const grouped: Record<ValidationSeverity, ValidationWarning[]> = {
    CRITICAL: [],
    WARNING: [],
    INFO: [],
  }

  validationWarnings.value.forEach(warning => {
    grouped[warning.severity].push(warning)
  })

  return grouped
})

const highestSeverity = computed((): ValidationSeverity | null => {
  if (validationWarnings.value.length === 0) return null
  if (groupedWarningsBySeverity.value.CRITICAL.length > 0) return 'CRITICAL'
  if (groupedWarningsBySeverity.value.WARNING.length > 0) return 'WARNING'
  return 'INFO'
})

const highestSeverityColor = computed(() => {
  const severity = highestSeverity.value
  if (severity === 'CRITICAL') return 'error'
  if (severity === 'WARNING') return 'warning'
  return 'info'
})

/**
 * Gather all unique concept sets used in this cohort
 */
const usedConceptSets = computed(() => {
  const conceptSetsMap = new Map<string, ConceptSetReference>()

  // Extract from entry events
  entryEvents.value.forEach(event => {
    if (event.conceptSet) {
      conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
    }
  })

  // Extract from additional criteria
  if (additionalCriteria.value?.events) {
    additionalCriteria.value.events.forEach(event => {
      if (event.conceptSet) {
        conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
      }
    })
  }

  // Extract from inclusion rules
  inclusionRules.value.forEach(rule => {
    rule.criteriaGroups.forEach(group => {
      group.events.forEach(event => {
        if (event.conceptSet) {
          conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
        }
      })
    })
  })

  // Extract from exit criteria (drug exposure)
  if (exitCriteria.value?.conceptSet) {
    conceptSetsMap.set(exitCriteria.value.conceptSet.name, exitCriteria.value.conceptSet)
  }

  // Extract from censoring criteria
  censoringCriteria.value.forEach(event => {
    if (event.conceptSet) {
      conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
    }
  })

  return Array.from(conceptSetsMap.values())
})

onMounted(async () => {
  // Start loading cohort definition immediately (don't await)
  if (props.id) {
    loadCohort(props.id)
  } else {
    // T123: Try to restore draft from SessionStorage
    const restored = cohortStore.restoreFromDraft()
    if (!restored) {
      // Initialize new cohort if no draft found
      cohortStore.createNewCohort()
    }
  }

  // Load resources in parallel in the background (don't block rendering)
  Promise.all([
    // Load all concept sets from the API so user can select any system concept set
    conceptSetsStore.fetchAll(),
    // Load CDM sources for generation (T116)
    webapiStore.fetchSources().then(() => {
      // Auto-select first source if available
      if (webapiStore.sourcesList.length > 0 && !selectedSourceKey.value) {
        selectedSourceKey.value = webapiStore.sourcesList[0]?.sourceKey || null
      }
    })
  ])

  // Check if we should open the generation panel (from cohort overview)
  if (route.query.generate === 'true') {
    isGenerationPanelOpen.value = true
  }

  // Add beforeunload handler to warn when closing tab/window with unsaved changes
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// Navigation guard to prevent losing unsaved changes
let navigationConfirmed = false
onBeforeRouteLeave((_to, _from, next) => {
  // If navigation was already confirmed or there are no unsaved changes, allow it
  if (!hasUnsavedChanges.value || navigationConfirmed) {
    navigationConfirmed = false // Reset for next time
    next()
    return
  }

  // Check if we're already showing a confirmation dialog
  if (isConfirmingNavigation.value) {
    next(false)
    return
  }

  isConfirmingNavigation.value = true
  const confirmed = confirm(t('common.unsavedChangesWarning', 'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.').value)
  isConfirmingNavigation.value = false

  if (confirmed) {
    navigationConfirmed = true // Remember that user confirmed
    next()
  } else {
    next(false)
  }
})

// Browser beforeunload handler to warn when closing tab/window with unsaved changes
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
    // Modern browsers require returnValue to be set
    event.returnValue = ''
    return ''
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

watch(
  () => props.id,
  (newId) => {
    if (newId) {
      isLoadingCohort.value = true
      loadCohort(newId)
    }
  }
)

async function loadCohort(id: string) {
  isLoadingCohort.value = true
  try {
    // Fetch cohort definition from WebAPI
    const cohortId = parseInt(id, 10)
    const atlasCohort = await getCohortDefinition(cohortId)

    if (!atlasCohort) {
      console.error(`Failed to load cohort ${id}`)
      isLoadingCohort.value = false
      return
    }

    // Parse expression if it's a string (stored as JSON in WebAPI)
    let expression
    if (typeof atlasCohort === 'object' && 'expression' in atlasCohort) {
      const exprValue = (atlasCohort as any).expression
      expression = typeof exprValue === 'string' ? JSON.parse(exprValue) : exprValue
    } else {
      expression = atlasCohort
    }

    // Convert Atlas JSON to internal format
    const converted = convertAtlasToInternal(expression)

    // Create cohort definition with converted data
    const cohortDef: CohortDefinition = {
      id: atlasCohort.id,
      name: atlasCohort.name,
      description: atlasCohort.description || '',
      entryEvents: converted.entryEvents || [],
      inclusionRules: converted.inclusionRules || [],
      exitCriteria: converted.exitCriteria || { strategy: 'CONTINUOUS_OBSERVATION' },
      observationPeriod: converted.observationPeriod || { priorDays: 0, postDays: 0 },
      qualifyingLimit: converted.qualifyingLimit || 'ALL',
      inclusionQualifyingLimit: converted.inclusionQualifyingLimit || 'ALL',
      additionalCriteria: converted.additionalCriteria,
      conceptSets: converted.conceptSets || [],
    }

    // Update store with loaded cohort
    cohortStore.setCohort(cohortDef)
    cohortStore.markClean()

    // Update local state
    cohortName.value = cohortDef.name
    cohortDescription.value = cohortDef.description ?? ''
    entryEvents.value = cohortDef.entryEvents
    additionalCriteria.value = cohortDef.additionalCriteria
    inclusionRules.value = cohortDef.inclusionRules
    exitCriteria.value = cohortDef.exitCriteria ?? { strategy: 'CONTINUOUS_OBSERVATION' }
    censorWindow.value = cohortDef.censorWindow ?? null
    censoringCriteria.value = cohortDef.censoringCriteria ?? []
    observationPeriod.value = cohortDef.observationPeriod || { priorDays: 0, postDays: 0 }
    qualifyingLimit.value = cohortDef.qualifyingLimit
    inclusionQualifyingLimit.value = cohortDef.inclusionQualifyingLimit ?? 'ALL'

    // Save snapshot of loaded state for change detection
    loadedSnapshot.value = createStateSnapshot()

    // Hide loading overlay immediately - cohort is now visible
    isLoadingCohort.value = false

    // Validate cohort in the background (don't await)
    validateCohort()
  } catch (error) {
    console.error(`Error loading cohort ${id}:`, error)
    isLoadingCohort.value = false
  }
}

/**
 * Validate the current cohort definition
 */
async function validateCohort() {
  if (!cohortName.value || entryEvents.value.length === 0) {
    validationWarnings.value = []
    return
  }

  try {
    isValidating.value = true

    // Extract all unique concept sets from events and inclusion rules
    const conceptSetsMap = new Map<string, ConceptSetReference>()

    // Extract from entry events
    entryEvents.value.forEach(event => {
      if (event.conceptSet) {
        conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
      }
    })

    // Extract from additional criteria
    if (additionalCriteria.value?.events) {
      additionalCriteria.value.events.forEach(event => {
        if (event.conceptSet) {
          conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
        }
      })
    }

    // Extract from inclusion rules
    inclusionRules.value.forEach(rule => {
      rule.criteriaGroups.forEach(group => {
        group.events.forEach(event => {
          if (event.conceptSet) {
            conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
          }
        })
      })
    })

    // Build cohort definition
    const cohortDef: CohortDefinition = {
      id: cohortId.value ?? undefined,
      name: cohortName.value,
      description: cohortDescription.value,
      entryEvents: entryEvents.value,
      additionalCriteria: additionalCriteria.value,
      inclusionRules: inclusionRules.value,
      exitCriteria: exitCriteria.value,
      observationPeriod: observationPeriod.value,
      qualifyingLimit: qualifyingLimit.value,
      inclusionQualifyingLimit: inclusionQualifyingLimit.value,
      conceptSets: Array.from(conceptSetsMap.values()),
    }

    // Convert to Atlas format for validation
    const atlasExpression = convertInternalToAtlas(cohortDef)

    // Call validation endpoint
    const result = await validateCohortDefinition(cohortName.value, atlasExpression)
    validationWarnings.value = result.warnings || []
  } catch (error) {
    console.error('Failed to validate cohort:', error)
    validationWarnings.value = []
  } finally {
    isValidating.value = false
  }
}

/**
 * Debounced validation trigger
 */
function triggerValidation() {
  if (validationDebounceTimer) {
    clearTimeout(validationDebounceTimer)
  }

  validationDebounceTimer = setTimeout(() => {
    validateCohort()
  }, 2000) // 2 second debounce
}

// Watch for changes to cohort definition and trigger validation
watch(
  [cohortName, entryEvents, additionalCriteria, inclusionRules, exitCriteria, observationPeriod, qualifyingLimit, inclusionQualifyingLimit],
  () => {
    triggerValidation()
  },
  { deep: true }
)

// Watch to populate editingName when dialog opens
watch(showEditNameDialog, (newValue) => {
  if (newValue) {
    editingName.value = cohortName.value
  }
})

/**
 * Save edited cohort name
 */
function saveEditedName() {
  cohortName.value = editingName.value
  showEditNameDialog.value = false
}

function handleSelectConceptSet(eventId: string) {
  selectedCriteriaContext.value = { eventId, ruleIndex: -1, groupIndex: -1, eventIndex: -1 }
  isConceptSetDialogOpen.value = true
}

function handleSelectConceptSetForCriteria(context: { ruleIndex: number; groupIndex: number; eventIndex: number }) {
  selectedCriteriaContext.value = { ...context, eventId: null }
  isConceptSetDialogOpen.value = true
}

function handleSelectConceptSetForAdditionalCriteria(eventIndex: number) {
  selectedCriteriaContext.value = { eventId: null, ruleIndex: -2, groupIndex: 0, eventIndex }
  isConceptSetDialogOpen.value = true
}

// Track which part of exit criteria needs the concept set
const exitCriteriaSelectionType = ref<'DRUG_EXPOSURE' | 'CENSORING_EVENT' | null>(null)

function handleSelectDrugConceptSet() {
  exitCriteriaSelectionType.value = 'DRUG_EXPOSURE'
  selectedCriteriaContext.value = { eventId: null, ruleIndex: -3, groupIndex: 0, eventIndex: 0 }
  isConceptSetDialogOpen.value = true
}

function handleSelectCensoringConceptSet() {
  exitCriteriaSelectionType.value = 'CENSORING_EVENT'
  selectedCriteriaContext.value = { eventId: null, ruleIndex: -3, groupIndex: 0, eventIndex: 0 }
  isConceptSetDialogOpen.value = true
}

function handleCensorWindowValidation() {
  // Handle censor window validation errors
  // Currently just logging for now, could be used for aggregated validation display
}

function addAdditionalCriteria() {
  additionalCriteria.value = {
    id: `criteria_group_${Date.now()}`,
    logicType: 'ALL',
    qualifyingLimit: 'ALL',
    events: [],
  }
}

function removeAdditionalCriteria() {
  additionalCriteria.value = undefined
}

/**
 * Called when user selects an existing concept set from the dialog
 */
async function handleConceptSetSelected(conceptSet: any) {
  if (!conceptSet || !selectedCriteriaContext.value) return

  // Fetch the full concept set with items if we only have a reference
  let fullConceptSet = conceptSet
  if (conceptSet.id && (!conceptSet.items || conceptSet.items.length === 0)) {
    await conceptSetsStore.fetchOne(conceptSet.id)
    fullConceptSet = conceptSetsStore.currentSet
  }

  // Copy the entire concept set including items into the cohort definition
  const conceptSetRef: ConceptSetReference = {
    id: fullConceptSet.id,
    name: fullConceptSet.name,
    items: fullConceptSet.items || [],
  }

  assignConceptSetToContext(conceptSetRef)
  isConceptSetDialogOpen.value = false
}

/**
 * Called when user clicks "Edit" on a concept set (from chip or dialog)
 */
async function handleEditConceptSet(conceptSet: any) {
  // Close dialog if it's open
  isConceptSetDialogOpen.value = false

  // Use the embedded concept set items directly (don't fetch from API)
  // The concept set is embedded in the cohort definition with all its items
  conceptSetsStore.currentSet = {
    ...conceptSet,
    items: conceptSet.items || []
  }
  conceptSetsStore.editorOpen = true
}

/**
 * Open concept set editor from the concept sets dialog
 */
function handleViewConceptSet(conceptSet: any) {
  // Close the concept sets dialog
  showConceptSetsDialog.value = false

  // Open the concept set editor
  handleEditConceptSet(conceptSet)
}

/**
 * Called when user clicks "Create New" in the dialog
 */
function handleCreateNewConceptSet() {
  // Close dialog and open editor in create mode
  isConceptSetDialogOpen.value = false
  conceptSetsStore.openCreateEditor()
}

/**
 * Called when a concept set is saved in the editor
 * This updates the cohort definition with the saved concept set
 */
function handleConceptSetSaved() {
  // After save, the store.currentSet should hold the saved concept set
  const conceptSet = conceptSetsStore.currentSet
  if (!conceptSet || !selectedCriteriaContext.value) return

  // Copy the entire concept set including items into the cohort definition
  const conceptSetRef: ConceptSetReference = {
    id: conceptSet.id!,
    name: conceptSet.name,
    items: conceptSet.items || [],
  }

  assignConceptSetToContext(conceptSetRef)
}

/**
 * Helper to assign a concept set to the current context (entry event or criteria)
 */
function assignConceptSetToContext(conceptSetRef: ConceptSetReference) {
  if (!selectedCriteriaContext.value) return

  // Handle entry event selection
  if (selectedCriteriaContext.value.eventId) {
    const eventIndex = entryEvents.value.findIndex(e => e.id === selectedCriteriaContext.value!.eventId)
    if (eventIndex === -1) return

    const currentEvent = entryEvents.value[eventIndex]
    if (!currentEvent) return

    entryEvents.value[eventIndex] = {
      ...currentEvent,
      conceptSet: conceptSetRef,
    }
  }
  // Handle additional criteria event selection
  else if (selectedCriteriaContext.value.ruleIndex === -2) {
    const { eventIndex } = selectedCriteriaContext.value
    if (!additionalCriteria.value) return

    const event = additionalCriteria.value.events[eventIndex]
    if (!event) return

    // Update the event's concept set
    event.conceptSet = conceptSetRef

    // Trigger reactivity
    additionalCriteria.value = { ...additionalCriteria.value }
  }
  // Handle criteria group event selection
  else if (selectedCriteriaContext.value.ruleIndex >= 0) {
    const { ruleIndex, groupIndex, eventIndex } = selectedCriteriaContext.value
    const rule = inclusionRules.value[ruleIndex]
    if (!rule) return

    const group = rule.criteriaGroups[groupIndex]
    if (!group) return

    const event = group.events[eventIndex]
    if (!event) return

    // Update the event's concept set
    event.conceptSet = conceptSetRef

    // Trigger reactivity
    inclusionRules.value = [...inclusionRules.value]
  }
  // Handle exit criteria concept set selection
  else if (selectedCriteriaContext.value.ruleIndex === -3) {
    if (exitCriteriaSelectionType.value === 'DRUG_EXPOSURE') {
      // Set concept set for drug exposure strategy
      exitCriteria.value = {
        ...exitCriteria.value,
        conceptSet: conceptSetRef
      }
    } else if (exitCriteriaSelectionType.value === 'CENSORING_EVENT') {
      // Create new censoring event with this concept set
      const newEvent: CohortEvent = {
        id: `censoring_${Date.now()}`,
        criteriaType: 'DrugExposure', // Default, user might need to change
        attributes: [],
        conceptSet: conceptSetRef
      }
      censoringCriteria.value = [...censoringCriteria.value, newEvent]
    }
    exitCriteriaSelectionType.value = null
  }

  selectedCriteriaContext.value = null
}

function handleSave() {
  if (!canSave.value) return

  const cohortDefinition: CohortDefinition = {
    id: props.id ? Number(props.id) : undefined,
    name: cohortName.value,
    description: cohortDescription.value || undefined,
    entryEvents: entryEvents.value,
    qualifyingLimit: qualifyingLimit.value,
    inclusionQualifyingLimit: inclusionQualifyingLimit.value,
    additionalCriteria: additionalCriteria.value,
    inclusionRules: inclusionRules.value,
    conceptSets: gatherConceptSets(),
    exitCriteria: exitCriteria.value,
    observationPeriod: observationPeriod.value,
  }

  cohortStore.setCohort(cohortDefinition)
  cohortStore.markClean()
  cohortStore.clearDraft() // Clear draft after successful save

  // Update snapshot after save to reflect new saved state
  loadedSnapshot.value = createStateSnapshot()

  successMessage.value = 'Cohort saved successfully'
  showSuccess.value = true

  // Navigate to cohorts list after brief delay
  setTimeout(() => {
    router.push('/cohorts')
  }, 1000)
}

function handleCancel() {
  // The onBeforeRouteLeave guard will handle the unsaved changes confirmation
  router.push('/cohorts')
}

function openGenerationPanel() {
  isGenerationPanelOpen.value = true
}

function gatherConceptSets(): ConceptSetReference[] {
  const conceptSetRefs = new Map<number | string, ConceptSetReference>()

  for (const event of entryEvents.value) {
    if (event.conceptSet) {
      conceptSetRefs.set(event.conceptSet.id, event.conceptSet)
    }
  }

  return Array.from(conceptSetRefs.values())
}

// Atlas JSON Import/Export
// @ts-expect-error - Planned feature, not yet implemented in UI
async function _handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const importedCohort = await importFromFile(file)

  if (conversionError.value) {
    errorMessage.value = `Import failed: ${conversionError.value}`
    showError.value = true
    return
  }

  if (importedCohort) {
    // Load imported data into state
    cohortName.value = importedCohort.name || ''
    cohortDescription.value = importedCohort.description || ''
    entryEvents.value = importedCohort.entryEvents || []
    additionalCriteria.value = importedCohort.additionalCriteria
    inclusionRules.value = importedCohort.inclusionRules || []
    exitCriteria.value = importedCohort.exitCriteria ?? { strategy: 'CONTINUOUS_OBSERVATION' }
    observationPeriod.value = importedCohort.observationPeriod ?? { priorDays: 0, postDays: 0 }
    qualifyingLimit.value = importedCohort.qualifyingLimit || 'ALL'
    inclusionQualifyingLimit.value = importedCohort.inclusionQualifyingLimit || 'ALL'

    successMessage.value = 'Atlas JSON imported successfully'
    showSuccess.value = true
  }

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// @ts-expect-error - Planned feature, not yet implemented in UI
function _handleExportAtlas() {
  if (!canSave.value) return

  const cohortDefinition: CohortDefinition = {
    id: props.id ? Number(props.id) : undefined,
    name: cohortName.value,
    description: cohortDescription.value || undefined,
    entryEvents: entryEvents.value,
    qualifyingLimit: qualifyingLimit.value,
    inclusionQualifyingLimit: inclusionQualifyingLimit.value,
    additionalCriteria: additionalCriteria.value,
    inclusionRules: inclusionRules.value,
    conceptSets: gatherConceptSets(),
    exitCriteria: exitCriteria.value,
    observationPeriod: observationPeriod.value,
  }

  const filename = `${cohortName.value.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cohort.json`
  downloadAtlasJSON(cohortDefinition, filename)

  if (conversionError.value) {
    errorMessage.value = `Export failed: ${conversionError.value}`
    showError.value = true
  } else {
    successMessage.value = 'Atlas JSON exported successfully'
    showSuccess.value = true
  }
}

// Generation functions (T117, T119, T120)
// @ts-expect-error - Planned feature, not yet implemented in UI
async function _handleGenerate() {
  if (!cohortId.value || !selectedSourceKey.value) {
    generationError.value = 'Please save the cohort and select a data source first'
    return
  }

  try {
    generationError.value = null

    // Start generation (T117)
    const job = await webapiStore.generateCohort(cohortId.value, selectedSourceKey.value)

    if (!job) {
      generationError.value = 'Failed to start cohort generation'
      return
    }

    successMessage.value = 'Cohort generation started'
    showSuccess.value = true
  } catch (error) {
    generationError.value = error instanceof Error ? error.message : 'Generation failed'
    console.error('Generation error:', error)
  }
}

// @ts-expect-error - Helper for planned generation feature
function _getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETE':
      return 'success'
    case 'FAILED':
      return 'error'
    case 'RUNNING':
      return 'primary'
    case 'PENDING':
      return 'warning'
    default:
      return 'grey'
  }
}

// @ts-expect-error - Helper for planned generation feature
function _getStatusIcon(status: string): string {
  switch (status) {
    case 'COMPLETE':
      return 'mdi-check-circle'
    case 'FAILED':
      return 'mdi-alert-circle'
    case 'RUNNING':
      return 'mdi-loading mdi-spin'
    case 'PENDING':
      return 'mdi-clock-outline'
    default:
      return 'mdi-help-circle'
  }
}

// @ts-expect-error - Helper for planned generation feature
function _getStatusText(status: string): string {
  switch (status) {
    case 'COMPLETE':
      return 'Complete'
    case 'FAILED':
      return 'Failed'
    case 'RUNNING':
      return 'Generating...'
    case 'PENDING':
      return 'Pending'
    default:
      return 'Unknown'
  }
}
</script>

<style scoped>
.cohort-builder {
  max-width: 1400px;
  margin: 0 auto;
}

/* Breadcrumb Navigation */
.cohort-builder__breadcrumb {
  padding: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.cohort-builder__breadcrumb-item {
  color: #666;
}

.cohort-builder__breadcrumb-item--link {
  cursor: pointer;
  transition: color 0.2s;
}

.cohort-builder__breadcrumb-item--link:hover {
  color: #1f425a;
  text-decoration: underline;
}

.cohort-builder__breadcrumb-item--active {
  color: #1f425a;
  font-weight: 500;
}

.cohort-builder__breadcrumb-separator {
  margin: 0 8px;
  color: #999;
}

.cohort-builder__breadcrumb-edit-icon {
  margin-left: 8px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
  opacity: 0.7;
}

.cohort-builder__breadcrumb-edit-icon:hover {
  color: rgb(var(--v-theme-primary));
  opacity: 1;
  transform: scale(1.1);
}

/* Top Toolbar */
.cohort-builder__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: white;
  border-bottom: 1px solid #dee2e6;
  gap: 24px;
}

.cohort-builder__toolbar-left,
.cohort-builder__toolbar-center,
.cohort-builder__toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cohort-builder__toolbar-center {
  flex: 1;
  justify-content: center;
}

.cohort-builder__cohort-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cohort-builder__cohort-name,
.cohort-builder__cohort-description {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.cohort-builder__label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.cohort-builder__name-display {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.cohort-builder__name-input,
.cohort-builder__description-input {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  border: 1px solid #e0e0e0;
  background: white;
  outline: none;
  padding: 6px 12px;
  border-radius: 4px;
  transition: all 0.2s;
  min-width: 250px;
  flex: 1;
}

.cohort-builder__description-input {
  font-weight: 400;
  font-size: 14px;
}

.cohort-builder__name-input:hover,
.cohort-builder__description-input:hover {
  border-color: #1f425a;
}

.cohort-builder__name-input:focus,
.cohort-builder__description-input:focus {
  border-color: #1f425a;
  box-shadow: 0 0 0 2px rgba(31, 66, 90, 0.1);
}

.cohort-builder__patient-count {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.cohort-builder__count {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

/* Section Panels */
.cohort-builder__section {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.cohort-builder__section-header {
  color: #dc3545;
  font-size: 18px;
  font-weight: 600;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
}

.cohort-builder__section-content {
  padding: 20px;
}

.gap-3 {
  gap: 12px;
}

.gap-2 {
  gap: 8px;
}

/* Toggle Button Styling */
:deep(.v-btn-toggle) {
  border: 1px solid #1f425a;
}

:deep(.v-btn-toggle .v-btn) {
  border-color: #1f425a !important;
  color: #1f425a;
  background-color: white;
}

:deep(.v-btn-toggle .v-btn--active) {
  background-color: #1f425a !important;
  color: white !important;
}

:deep(.v-btn-toggle .v-btn:hover:not(.v-btn--active)) {
  background-color: rgba(31, 66, 90, 0.04);
}

/* Section Layout */
.section-wrapper {
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.section-header--centered {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.section-title-container {
  flex: 1;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--v-theme-orange));
}

.section-controls {
  display: flex;
  justify-content: center;
  align-items: center;
}

.section-controls--center {
  justify-self: center;
}

.section-spacer {
  /* Empty spacer for grid layout */
}

.section-obs-period {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  font-size: 12px;
  padding-left: 32px;
}

.obs-period-label {
  font-size: 12px;
  color: #666;
  font-weight: 600;
  margin-right: 12px;
}

.obs-period-text {
  font-size: 12px;
  color: #666;
}

/* Validation Badge and Tooltip */
.cohort-builder__validation-badge {
  margin-left: 12px;
}

.validation-tooltip {
  padding: 8px 0;
}

.validation-severity-group {
  margin-bottom: 12px;
}

.validation-severity-group:last-child {
  margin-bottom: 0;
}

.validation-severity-header {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 6px;
  padding: 0 8px;
  color: white;
}

.validation-warnings-list {
  list-style: none;
  padding: 0 8px;
  margin: 0;
}

.validation-warning-item {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 4px;
  padding-left: 16px;
  position: relative;
  color: rgba(255, 255, 255, 0.95);
}

.validation-warning-item::before {
  content: '•';
  position: absolute;
  left: 4px;
  color: rgba(255, 255, 255, 0.7);
}

.validation-warning-item:last-child {
  margin-bottom: 0;
}

/* Additional Criteria Header */
.additional-criteria-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.additional-criteria-label {
  font-size: 14px;
  font-weight: 700;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
