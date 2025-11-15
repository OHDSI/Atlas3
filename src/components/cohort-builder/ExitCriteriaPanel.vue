<template>
  <div class="exit-criteria-panel">
    <!-- Legacy Conflict Warning Banner -->
    <v-alert
      v-if="hasLegacyConflict"
      type="warning"
      closable
      variant="tonal"
      class="mb-4"
    >
      {{ t('exitCriteria.warnings.legacyConflict', 'This cohort has both legacy and new exit criteria formats. Displaying Atlas format.').value }}
    </v-alert>

    <div class="panel-content">
      <!-- Event Persistence Section -->
      <div class="section mb-6">
        <EventPersistenceSelector
          v-model="localExitCriteria"
          :concept-sets="conceptSets"
          :disabled="disabled"
          @validation-error="handleEventPersistenceValidation"
          @select-drug-concept-set="$emit('select-drug-concept-set')"
        />
      </div>

      <!-- Censoring Events Section -->
      <div class="section">
        <CensoringEventsEditor
          v-model="localCensoringEvents"
          :concept-sets="conceptSets"
          :disabled="disabled"
          @add-event="handleAddCensoringEvent"
          @remove-event="handleRemoveCensoringEvent"
          @validation-error="handleCensoringEventsValidation"
          @select-censoring-concept-set="$emit('select-censoring-concept-set')"
        />
      </div>
    </div>

    <!-- Validation aggregation (errors from sub-components) -->
    <div v-if="aggregatedErrors.length > 0" class="validation-summary mt-4">
      <v-alert type="error" variant="tonal">
        <div class="text-subtitle-2 mb-2">Validation Errors:</div>
        <ul>
          <li v-for="error in aggregatedErrors" :key="error.field">
            <strong>{{ error.field }}:</strong> {{ error.message }}
          </li>
        </ul>
      </v-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import EventPersistenceSelector from './EventPersistenceSelector.vue'
import CensoringEventsEditor from './CensoringEventsEditor.vue'
import type { ExitCriteria, CohortEvent, ConceptSetReference } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const { t } = useI18n()

interface Props {
  modelValue?: ExitCriteria
  censoringCriteria?: CohortEvent[]
  conceptSets?: ConceptSetReference[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  conceptSets: () => [],
  censoringCriteria: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: ExitCriteria]
  'update:censoringCriteria': [value: CohortEvent[]]
  'validation-error': [errors: ValidationError[]]
  'select-drug-concept-set': []
  'select-censoring-concept-set': []
}>()

// Local state
const localExitCriteria = ref<ExitCriteria>(props.modelValue || { strategy: 'CONTINUOUS_OBSERVATION' })
const localCensoringEvents = ref<CohortEvent[]>([...props.censoringCriteria])

// Validation errors from sub-components
const eventPersistenceErrors = ref<ValidationError[]>([])
const censoringEventsErrors = ref<ValidationError[]>([])

// Aggregate all validation errors
const aggregatedErrors = computed(() => {
  return [
    ...eventPersistenceErrors.value,
    ...censoringEventsErrors.value
  ]
})

// Detect legacy conflict
// (Both old-style ExitCriteria and new CensoringCriteria exist)
const hasLegacyConflict = computed(() => {
  // Check if we have both legacy exitCriteria fields AND new Atlas fields
  const hasLegacyExitCriteria = props.modelValue &&
    (props.modelValue.strategy !== 'CONTINUOUS_OBSERVATION' ||
     props.modelValue.offset !== undefined ||
     props.modelValue.conceptSet !== undefined)

  const hasNewAtlasFields = (localCensoringEvents.value.length > 0)

  return hasLegacyExitCriteria && hasNewAtlasFields
})

// Validation handlers
function handleEventPersistenceValidation(errors: ValidationError[]) {
  eventPersistenceErrors.value = errors
  emitValidationErrors()
}

function handleCensoringEventsValidation(errors: ValidationError[]) {
  censoringEventsErrors.value = errors
  emitValidationErrors()
}

function emitValidationErrors() {
  emit('validation-error', aggregatedErrors.value)
}

// Event handlers
function handleAddCensoringEvent() {
  // Event already added by sub-component, just propagate
  emit('update:censoringCriteria', localCensoringEvents.value)
}

function handleRemoveCensoringEvent(index: number) {
  // Event already removed by sub-component, just propagate
  emit('update:censoringCriteria', localCensoringEvents.value)
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    localExitCriteria.value = newValue
  }
}, { deep: true })

watch(() => props.censoringCriteria, (newValue) => {
  localCensoringEvents.value = [...newValue]
}, { deep: true })

// Watch for local changes and emit updates
watch(localExitCriteria, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })

watch(localCensoringEvents, (newValue) => {
  emit('update:censoringCriteria', newValue)
}, { deep: true })
</script>

<style scoped>
.exit-criteria-panel {
  background: white;
}

.panel-content {
  padding: 16px;
}

.section {
  margin-bottom: 24px;
}

.validation-summary {
  padding: 0 16px 16px;
}
</style>
