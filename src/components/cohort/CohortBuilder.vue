<template>
  <v-container fluid>
    <!-- Toolbar with Import/Export -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-actions class="justify-space-between">
            <div>
              <v-btn
                variant="outlined"
                prepend-icon="mdi-upload"
                data-testid="import-atlas-json"
                @click="fileInputRef?.click()"
              >
                Import Atlas JSON
              </v-btn>
              <input
                ref="fileInputRef"
                type="file"
                accept=".json"
                style="display: none"
                @change="handleFileImport"
              />
              <v-btn
                variant="outlined"
                prepend-icon="mdi-download"
                class="ml-2"
                data-testid="export-atlas-json"
                :disabled="!canSave"
                @click="handleExportAtlas"
              >
                Export Atlas JSON
              </v-btn>
            </div>
            <div>
              <v-btn
                variant="text"
                @click="handleCancel"
              >
                Cancel
              </v-btn>
              <v-btn
                color="primary"
                :disabled="!canSave"
                @click="handleSave"
              >
                Save Cohort
              </v-btn>
            </div>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Generation Toolbar (T119) -->
    <v-row v-if="cohortId">
      <v-col cols="12">
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1">Cohort Generation</v-card-title>
          <v-card-text>
            <v-row align="center">
              <v-col cols="12" md="4">
                <v-select
                  v-model="selectedSourceKey"
                  :items="sourceItems"
                  :loading="isLoadingSources"
                  label="Select Data Source"
                  item-title="label"
                  item-value="value"
                  data-testid="source-selector"
                  :disabled="isGenerating"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-btn
                  color="primary"
                  :disabled="!selectedSourceKey || isGenerating"
                  :loading="isGenerating"
                  prepend-icon="mdi-play"
                  data-testid="generate-cohort-btn"
                  @click="handleGenerate"
                >
                  Generate Cohort
                </v-btn>
              </v-col>
              <v-col cols="12" md="5">
                <!-- Generation Status -->
                <div v-if="currentJob" data-testid="generation-status">
                  <v-chip
                    :color="getStatusColor(currentJob.status)"
                    :prepend-icon="getStatusIcon(currentJob.status)"
                  >
                    {{ getStatusText(currentJob.status) }}
                  </v-chip>
                  <span v-if="currentJob.personCount !== undefined" class="ml-3" data-testid="patient-count">
                    <strong>{{ currentJob.personCount.toLocaleString() }}</strong> patients
                  </span>
                  <v-progress-linear
                    v-if="isGenerating"
                    indeterminate
                    color="primary"
                    class="mt-2"
                  />
                </div>
                <!-- Error Display -->
                <v-alert
                  v-if="generationError"
                  type="error"
                  variant="tonal"
                  density="compact"
                  closable
                  data-testid="generation-error"
                  @click:close="generationError = null"
                >
                  {{ generationError }}
                  <v-btn
                    size="small"
                    variant="text"
                    class="ml-2"
                    data-testid="retry-generation-btn"
                    @click="handleGenerate"
                  >
                    Retry
                  </v-btn>
                </v-alert>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <cohort-metadata
          :name="cohortName"
          :description="cohortDescription"
          @update:name="cohortName = $event"
          @update:description="cohortDescription = $event"
        />
      </v-col>
    </v-row>

    <!-- Observation Period -->
    <v-row>
      <v-col cols="12">
        <observation-period-block
          v-model="observationPeriod"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <entry-events-list
          :events="entryEvents"
          @update:events="entryEvents = $event"
          @select-concept-set="handleSelectConceptSet"
        />
      </v-col>

      <v-col cols="12" md="4">
        <concept-set-selector />
      </v-col>
    </v-row>

    <!-- Inclusion Criteria -->
    <v-row>
      <v-col cols="12">
        <inclusion-criteria-panel
          v-model="inclusionRules"
          :qualifying-limit="qualifyingLimit"
          @update:qualifying-limit="qualifyingLimit = $event"
          @select-concept-set="handleSelectConceptSetForCriteria"
        />
      </v-col>
    </v-row>

    <!-- Exit Criteria -->
    <v-row>
      <v-col cols="12">
        <exit-criteria-panel
          v-model="exitCriteria"
        />
      </v-col>
    </v-row>

    <!-- Concept Set Selection Dialog -->
    <concept-set-selection-dialog
      v-model="isConceptSetDialogOpen"
      :event-id="selectedEventId"
      @concept-set-selected="handleConceptSetSelected"
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
          Close
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
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/conceptSets'
import { useWebAPIStore } from '@/stores/webapi'
import { useAtlasConverter } from '@/composables/useAtlasConverter'
import type {
  CohortEvent,
  ConceptSetReference,
  InclusionRule,
  ExitCriteria,
  ObservationPeriod,
  QualifyingLimit,
  CohortDefinition
} from '@/models/cohort.types'
import CohortMetadata from './CohortMetadata.vue'
import EntryEventsList from './EntryEventsList.vue'
import ConceptSetSelector from './ConceptSetSelector.vue'
import ConceptSetSelectionDialog from './ConceptSetSelectionDialog.vue'
import InclusionCriteriaPanel from '../cohort-builder/InclusionCriteriaPanel.vue'
import ExitCriteriaPanel from '../cohort-builder/ExitCriteriaPanel.vue'
import ObservationPeriodBlock from '../cohort-builder/ObservationPeriodBlock.vue'

interface Props {
  id?: string
}

const props = defineProps<Props>()

const router = useRouter()
const cohortStore = useCohortStore()
const conceptSetsStore = useConceptSetsStore()
const webapiStore = useWebAPIStore()
const { importFromFile, downloadAtlasJSON, conversionError } = useAtlasConverter()

// Core cohort state
const cohortName = ref('')
const cohortDescription = ref('')
const entryEvents = ref<CohortEvent[]>([])
const inclusionRules = ref<InclusionRule[]>([])
const exitCriteria = ref<ExitCriteria | undefined>(undefined)
const observationPeriod = ref<ObservationPeriod | undefined>(undefined)
const qualifyingLimit = ref<QualifyingLimit>('ALL')

// UI state
const fileInputRef = ref<HTMLInputElement | null>(null)
const isConceptSetDialogOpen = ref(false)
const selectedEventId = ref<string | null>(null)
const selectedCriteriaContext = ref<{
  ruleIndex: number
  groupIndex: number
  eventIndex: number
} | null>(null)
const showError = ref(false)
const errorMessage = ref('')
const showSuccess = ref(false)
const successMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// Generation state (T119, T120)
const selectedSourceKey = ref<string | null>(null)
const generationError = ref<string | null>(null)

const cohortId = computed(() => props.id ? Number(props.id) : null)

const canSave = computed(() => {
  return cohortName.value.trim().length > 0 && entryEvents.value.length > 0
})

// Generation computed properties
const sourceItems = computed(() => {
  return webapiStore.sourcesList.map(source => ({
    label: `${source.sourceName} (${source.sourceKey})`,
    value: source.sourceKey,
  }))
})

const isLoadingSources = computed(() => webapiStore.isLoadingSources)

const currentJob = computed(() => {
  if (!cohortId.value) return null
  const jobs = webapiStore.getJobsByCohortId(cohortId.value)
  return jobs.length > 0 ? jobs[jobs.length - 1] : null
})

const isGenerating = computed(() => {
  return currentJob.value?.status === 'PENDING' || currentJob.value?.status === 'RUNNING'
})

onMounted(async () => {
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

  // Load CDM sources for generation (T116)
  await webapiStore.fetchSources()

  // Auto-select first source if available
  if (webapiStore.sourcesList.length > 0 && !selectedSourceKey.value) {
    selectedSourceKey.value = webapiStore.sourcesList[0]?.sourceKey || null
  }
})

watch(
  () => props.id,
  (newId) => {
    if (newId) {
      loadCohort(newId)
    }
  }
)

function loadCohort(_id: string) {
  const cohort = cohortStore.currentCohort
  if (cohort) {
    cohortName.value = cohort.name
    cohortDescription.value = cohort.description ?? ''
    entryEvents.value = cohort.entryEvents
    inclusionRules.value = cohort.inclusionRules || []
    exitCriteria.value = cohort.exitCriteria
    observationPeriod.value = cohort.observationPeriod
    qualifyingLimit.value = cohort.qualifyingLimit || 'ALL'
  }
}

function handleSelectConceptSet(eventId: string) {
  selectedEventId.value = eventId
  selectedCriteriaContext.value = null
  isConceptSetDialogOpen.value = true
}

function handleSelectConceptSetForCriteria(context: { ruleIndex: number; groupIndex: number; eventIndex: number }) {
  selectedCriteriaContext.value = context
  selectedEventId.value = null
  isConceptSetDialogOpen.value = true
}

function handleConceptSetSelected(conceptSetId: number | string) {
  const conceptSet = conceptSetsStore.conceptSets.get(conceptSetId)
  if (!conceptSet) return

  const conceptSetRef: ConceptSetReference = {
    id: conceptSet.id,
    name: conceptSet.name,
  }

  // Handle entry event selection
  if (selectedEventId.value) {
    const eventIndex = entryEvents.value.findIndex(e => e.id === selectedEventId.value)
    if (eventIndex === -1) return

    const currentEvent = entryEvents.value[eventIndex]
    if (!currentEvent) return

    entryEvents.value[eventIndex] = {
      id: currentEvent.id,
      criteriaType: currentEvent.criteriaType,
      conceptSet: conceptSetRef,
      cardinality: currentEvent.cardinality,
      temporalWindow: currentEvent.temporalWindow,
      attributes: currentEvent.attributes,
      nestedCriteria: currentEvent.nestedCriteria,
    }

    selectedEventId.value = null
  }
  // Handle criteria group event selection
  else if (selectedCriteriaContext.value) {
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

    selectedCriteriaContext.value = null
  }

  isConceptSetDialogOpen.value = false
}

function handleSave() {
  if (!canSave.value) return

  const cohortDefinition: CohortDefinition = {
    id: props.id ? Number(props.id) : undefined,
    name: cohortName.value,
    description: cohortDescription.value || undefined,
    entryEvents: entryEvents.value,
    qualifyingLimit: qualifyingLimit.value,
    inclusionRules: inclusionRules.value,
    conceptSets: gatherConceptSets(),
    exitCriteria: exitCriteria.value,
    observationPeriod: observationPeriod.value,
  }

  cohortStore.setCohort(cohortDefinition)
  cohortStore.markClean()
  cohortStore.clearDraft() // Clear draft after successful save

  successMessage.value = 'Cohort saved successfully'
  showSuccess.value = true

  // Navigate to cohorts list after brief delay
  setTimeout(() => {
    router.push('/cohorts')
  }, 1000)
}

function handleCancel() {
  router.push('/cohorts')
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
async function handleFileImport(event: Event) {
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
    inclusionRules.value = importedCohort.inclusionRules || []
    exitCriteria.value = importedCohort.exitCriteria
    observationPeriod.value = importedCohort.observationPeriod
    qualifyingLimit.value = importedCohort.qualifyingLimit || 'ALL'

    successMessage.value = 'Atlas JSON imported successfully'
    showSuccess.value = true
  }

  // Reset file input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function handleExportAtlas() {
  if (!canSave.value) return

  const cohortDefinition: CohortDefinition = {
    id: props.id ? Number(props.id) : undefined,
    name: cohortName.value,
    description: cohortDescription.value || undefined,
    entryEvents: entryEvents.value,
    qualifyingLimit: qualifyingLimit.value,
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
async function handleGenerate() {
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

function getStatusColor(status: string): string {
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

function getStatusIcon(status: string): string {
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

function getStatusText(status: string): string {
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
