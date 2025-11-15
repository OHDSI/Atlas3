<template>
  <div class="event-persistence-selector">
    <div class="pa-4">
      <div class="d-flex align-center mb-3">
        <h3 class="text-h6">
          {{ t('exitCriteria.eventPersistence', 'Event Persistence').value }}
        </h3>
        <v-tooltip location="right">
          <template #activator="{ props }">
            <v-icon
              v-bind="props"
              icon="mdi-help-circle-outline"
              size="small"
              class="ml-2 text-medium-emphasis"
            />
          </template>
          <span>Controls how long events persist in the cohort</span>
        </v-tooltip>
      </div>

      <!-- Strategy-specific help text -->
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ strategyHelpText }}
      </v-alert>

      <!-- Conditional Fields for Fixed Duration -->
      <div v-if="selectedStrategy === 'FIXED_DURATION'" class="strategy-fields">
        <v-row>
          <v-col cols="6">
            <v-select
              v-model="fixedDurationDateField"
              :items="dateFieldOptions"
              :label="t('exitCriteria.fields.dateField', 'Date Field').value"
              :disabled="disabled"
              variant="outlined"
              density="compact"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="fixedDurationOffset"
              type="number"
              :label="t('exitCriteria.fields.offset', 'Offset (days)').value"
              :disabled="disabled"
              :rules="[nonNegativeRule]"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Conditional Fields for Drug Exposure -->
      <div v-if="selectedStrategy === 'CONTINUOUS_DRUG'" class="strategy-fields">
        <!-- Concept Set Selection Button/Chip -->
        <div class="mb-4">
          <v-btn
            v-if="!selectedConceptSet"
            variant="outlined"
            prepend-icon="mdi-plus"
            :disabled="disabled"
            @click="openConceptSetDialog"
          >
            {{ t('customEraStrategy.selectDrugConceptSet', 'Select Drug Concept Set').value }}
          </v-btn>
          <v-chip
            v-else
            :closable="!disabled"
            color="primary"
            variant="tonal"
            @click:close="clearConceptSet"
          >
            {{ selectedConceptSet.name }}
          </v-chip>
        </div>

        <!-- Persistence Window and Surveillance Window -->
        <v-row v-if="selectedConceptSet">
          <v-col cols="6">
            <v-text-field
              v-model.number="persistenceWindow"
              type="number"
              :label="t('exitCriteria.fields.persistenceWindow', 'Persistence Window (days)').value"
              :disabled="disabled"
              :rules="[nonNegativeRule]"
              variant="outlined"
              density="compact"
            >
              <template #append-inner>
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <v-icon
                      v-bind="props"
                      icon="mdi-information-outline"
                      size="small"
                      class="text-medium-emphasis"
                    />
                  </template>
                  <span>{{ t('exitCriteria.help.persistenceWindow', 'Maximum gap days between exposures').value }}</span>
                </v-tooltip>
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="surveillanceWindow"
              type="number"
              :label="t('exitCriteria.fields.surveillanceWindow', 'Surveillance Window (days)').value"
              :disabled="disabled"
              :rules="[nonNegativeRule]"
              variant="outlined"
              density="compact"
            >
              <template #append-inner>
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <v-icon
                      v-bind="props"
                      icon="mdi-information-outline"
                      size="small"
                      class="text-medium-emphasis"
                    />
                  </template>
                  <span>{{ t('exitCriteria.help.surveillanceWindow', 'Additional days after final exposure before cohort exit').value }}</span>
                </v-tooltip>
              </template>
            </v-text-field>
          </v-col>
        </v-row>

        <!-- Help text about missing days supply -->
        <v-alert
          v-if="selectedConceptSet"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          {{ t('exitCriteria.help.missingDaysSupply', 'If days supply is missing, system assumes 1 day per exposure').value }}
        </v-alert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useEventPersistence } from '@/composables/useEventPersistence'
import type { ExitCriteria, ExitStrategy, ConceptSetReference } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const { t } = useI18n()

interface Props {
  modelValue: ExitCriteria
  conceptSets: ConceptSetReference[]
  disabled?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ExitCriteria]
  'validation-error': [errors: ValidationError[]]
  'select-drug-concept-set': []
}>()

// Use the event persistence composable
const { state, switchStrategy, toExitCriteria } = useEventPersistence(props.modelValue)

// Local state for UI binding
const selectedStrategy = ref<ExitStrategy>(state.strategy)
const fixedDurationDateField = ref(state.fixedDuration.dateField)
const fixedDurationOffset = ref(state.fixedDuration.offset)
const drugConceptSetId = ref(state.drugExposure.conceptSetId)
const persistenceWindow = ref(state.drugExposure.persistenceWindow)
const surveillanceWindow = ref(state.drugExposure.surveillanceWindow)

// Date field options
const dateFieldOptions = [
  { value: 'START_DATE', title: t('exitCriteria.fields.startDate', 'Start Date').value },
  { value: 'END_DATE', title: t('exitCriteria.fields.endDate', 'End Date').value }
]

// Selected concept set for drug exposure
const selectedConceptSet = computed(() => {
  if (!drugConceptSetId.value) return null
  return props.conceptSets.find(cs => cs.id.toString() === drugConceptSetId.value)
})

// Strategy-specific help text
const strategyHelpText = computed(() => {
  switch (selectedStrategy.value) {
    case 'CONTINUOUS_OBSERVATION':
      return t('exitCriteria.help.continuousObservation', 'Event persists until observation period ends').value
    case 'FIXED_DURATION':
      return t('exitCriteria.help.fixedDuration', 'Event persists for a specified number of days from start or end date').value
    case 'CONTINUOUS_DRUG':
      return t('exitCriteria.help.drugExposure', 'Event persists based on continuous drug exposure with allowable gaps between exposures').value
    default:
      return ''
  }
})

// Validation rules
const nonNegativeRule = (value: number) => {
  if (value < 0) {
    return t('exitCriteria.validation.offsetNonNegative', 'Offset values must be non-negative').value
  }
  return true
}

// Handle strategy change
function handleStrategyChange(newStrategy: ExitStrategy) {
  switchStrategy(newStrategy)
  emitUpdate()
}

// Open concept set selection dialog for drug exposure
function openConceptSetDialog() {
  emit('select-drug-concept-set')
}

// Clear selected concept set
function clearConceptSet() {
  drugConceptSetId.value = null
  emitUpdate()
}

// Emit updated value
function emitUpdate() {
  // Update state values
  state.strategy = selectedStrategy.value
  state.fixedDuration.dateField = fixedDurationDateField.value
  state.fixedDuration.offset = fixedDurationOffset.value
  state.drugExposure.conceptSetId = drugConceptSetId.value
  state.drugExposure.persistenceWindow = persistenceWindow.value
  state.drugExposure.surveillanceWindow = surveillanceWindow.value

  // Convert to ExitCriteria
  const exitCriteria = toExitCriteria(props.conceptSets)
  emit('update:modelValue', exitCriteria)

  // Validate and emit errors
  validateFields()
}

// Validate fields based on strategy
function validateFields() {
  const errors: ValidationError[] = []

  if (selectedStrategy.value === 'FIXED_DURATION') {
    if (fixedDurationOffset.value === undefined) {
      errors.push({
        field: 'exitCriteria.offset',
        message: t('exitCriteria.validation.offsetRequired', 'Offset is required for fixed duration strategy').value,
        severity: 'error'
      })
    }
  }

  if (selectedStrategy.value === 'CONTINUOUS_DRUG') {
    if (!drugConceptSetId.value) {
      errors.push({
        field: 'exitCriteria.conceptSet',
        message: t('exitCriteria.validation.conceptSetRequired', 'Drug concept set required for this strategy').value,
        severity: 'warning'
      })
    }
  }

  emit('validation-error', errors)
}

// Watch for changes and emit updates
watch([fixedDurationDateField, fixedDurationOffset, drugConceptSetId, persistenceWindow, surveillanceWindow], () => {
  emitUpdate()
})

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  selectedStrategy.value = newValue.strategy
  if (newValue.strategy === 'FIXED_DURATION') {
    fixedDurationDateField.value = newValue.dateField || 'START_DATE'
    fixedDurationOffset.value = newValue.offset || 0
  } else if (newValue.strategy === 'CONTINUOUS_DRUG') {
    drugConceptSetId.value = newValue.conceptSet?.id.toString() || null
    persistenceWindow.value = newValue.persistenceWindow || 30
    surveillanceWindow.value = newValue.surveillanceWindow || 7
  }
}, { deep: true })
</script>

<style scoped>
.event-persistence-selector {
  margin: 16px 0;
}

.strategy-selector {
  display: flex;
  justify-content: center;
}

.strategy-fields {
  margin-top: 16px;
}
</style>
