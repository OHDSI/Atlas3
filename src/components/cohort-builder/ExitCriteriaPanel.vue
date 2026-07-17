<template>
  <div class="exit-criteria-panel">
    <!-- Legacy Conflict Warning — quieter inline warning row,
         matches the rest of the modernised design. -->
    <div
      v-if="hasLegacyConflict"
      class="exit-criteria-panel__warning"
    >
      <AtlasIcon
        icon="mdi-alert-outline"
        size="18"
        class="exit-criteria-panel__warning-icon"
      />
      <span>{{
        t(
          'exitCriteria.warnings.legacyConflict',
          'This cohort has both legacy and new exit criteria formats. Displaying Atlas format.'
        ).value
      }}</span>
    </div>

    <div class="panel-content">
      <!-- Event Persistence Section -->
      <div class="section mb-6">
        <EventPersistenceSelector
          v-model="localExitCriteria"
          :concept-sets="conceptSets"
          :disabled="disabled"
          @validation-error="handleEventPersistenceValidation"
          @select-drug-concept-set="$emit('select-drug-concept-set')"
          @edit-drug-concept-set="$emit('edit-drug-concept-set', $event)"
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

    <!-- Validation aggregation — quiet inline error block with
         icon + tinted-error text; replaces the heavy v-alert
         tonal full-width fill so it fits the design language. -->
    <div
      v-if="aggregatedErrors.length > 0"
      class="exit-criteria-panel__validation"
    >
      <div class="exit-criteria-panel__validation-header">
        <AtlasIcon
          icon="mdi-alert-circle-outline"
          size="18"
          class="exit-criteria-panel__validation-icon"
        />
        <span class="exit-criteria-panel__validation-title">
          {{ t('common.validationErrors', 'Validation errors').value }}
        </span>
      </div>
      <ul class="exit-criteria-panel__validation-list">
        <li
          v-for="error in aggregatedErrors"
          :key="error.field"
        >
          <strong>{{ error.field }}:</strong> {{ error.message }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon } from '@/components/ui'
import { ref, computed } from 'vue'
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
  modelValue: undefined,
  conceptSets: () => [],
  censoringCriteria: () => [],
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: ExitCriteria]
  'update:censoringCriteria': [value: CohortEvent[]]
  'validation-error': [errors: ValidationError[]]
  'select-drug-concept-set': []
  'select-censoring-concept-set': []
  'edit-drug-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
}>()

// Use computed properties with getters/setters instead of bidirectional watchers
// This prevents the infinite reactive loop that was causing "Maximum recursive updates exceeded"
const localExitCriteria = computed<ExitCriteria>({
  get: () => props.modelValue || { strategy: 'CONTINUOUS_OBSERVATION' },
  set: value => emit('update:modelValue', value),
})

const localCensoringEvents = computed<CohortEvent[]>({
  get: () => props.censoringCriteria || [],
  set: value => emit('update:censoringCriteria', value),
})

// Validation errors from sub-components
const eventPersistenceErrors = ref<ValidationError[]>([])
const censoringEventsErrors = ref<ValidationError[]>([])

// Aggregate all validation errors
const aggregatedErrors = computed(() => {
  return [...eventPersistenceErrors.value, ...censoringEventsErrors.value]
})

// Detect legacy conflict
// (Both old-style ExitCriteria and new CensoringCriteria exist)
const hasLegacyConflict = computed(() => {
  // Check if we have both legacy exitCriteria fields AND new Atlas fields
  const hasLegacyExitCriteria =
    props.modelValue &&
    (props.modelValue.strategy !== 'CONTINUOUS_OBSERVATION' ||
      props.modelValue.offset !== undefined ||
      props.modelValue.conceptSet !== undefined)

  const hasNewAtlasFields = localCensoringEvents.value.length > 0

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

function handleRemoveCensoringEvent(_index: number) {
  // Event already removed by sub-component, just propagate
  emit('update:censoringCriteria', localCensoringEvents.value)
}
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

/* Legacy-conflict warning — soft amber accent matching the
 * validation-error block pattern. */
.exit-criteria-panel__warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 12px 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(var(--v-theme-warning, 255, 193, 7), 0.08);
  border-left: 3px solid rgb(var(--v-theme-warning, 255, 193, 7));
  font-size: 13px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface));
}

.exit-criteria-panel__warning-icon {
  color: rgb(var(--v-theme-warning, 255, 193, 7));
  flex-shrink: 0;
  margin-top: 1px;
}

.exit-criteria-panel__validation {
  margin: 12px 16px 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(var(--v-theme-error), 0.06);
  border-left: 3px solid rgb(var(--v-theme-error));
}

.exit-criteria-panel__validation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.exit-criteria-panel__validation-icon {
  color: rgb(var(--v-theme-error));
}

.exit-criteria-panel__validation-title {
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-error));
}

.exit-criteria-panel__validation-list {
  margin: 0 0 0 26px;
  padding: 0;
  list-style: disc;
  font-size: 13px;
  line-height: 1.55;
  color: rgb(var(--v-theme-on-surface));
}
.exit-criteria-panel__validation-list li {
  margin-bottom: 2px;
}
</style>
