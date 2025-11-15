<template>
  <div class="censoring-events-editor">
    <div class="pa-4">
      <h3 class="text-h6 mb-2">
        {{ t('exitCriteria.censoringEvents', 'Censoring Events').value }}
      </h3>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Exit cohort when any of these events occur
      </p>

      <div>
        <!-- Empty state -->
        <v-alert
          v-if="localEvents.length === 0"
          type="info"
          variant="tonal"
          density="compact"
        >
          No censoring events defined. Cohort membership will not be affected by additional events.
        </v-alert>

        <!-- Event list -->
        <div v-else class="events-list">
          <v-card
            v-for="(event, index) in localEvents"
            :key="event.id"
            class="event-card mb-3"
            variant="outlined"
          >
            <v-card-text>
              <v-row align="center">
                <v-col cols="1" class="text-center">
                  <span class="text-h6 text-medium-emphasis">{{ index + 1 }}</span>
                </v-col>
                <v-col cols="10">
                  <div class="event-info">
                    <div class="event-type text-subtitle-1">
                      {{ formatCriteriaType(event.criteriaType) }}
                    </div>
                    <div v-if="event.conceptSet" class="event-concept-set text-body-2">
                      <v-chip size="small" variant="tonal" color="primary">
                        {{ event.conceptSet.name }}
                      </v-chip>
                    </div>
                    <!-- Warning for invalid concept set reference -->
                    <v-alert
                      v-if="hasInvalidConceptSet(event)"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mt-2"
                    >
                      {{ t('exitCriteria.validation.conceptSetNotFound', 'Concept set not found in this cohort').value }}
                    </v-alert>
                  </div>
                </v-col>
                <v-col cols="1" class="text-right">
                  <v-btn
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    color="error"
                    :disabled="disabled"
                    @click="removeEvent(index)"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <div class="mt-4">
        <v-btn
          variant="outlined"
          prepend-icon="mdi-plus"
          :disabled="disabled"
          @click="addEvent"
        >
          {{ t('exitCriteria.actions.addCensoringEvent', 'Add Censoring Event').value }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import type { CohortEvent, ConceptSetReference, CriteriaType } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const { t } = useI18n()

interface Props {
  modelValue: CohortEvent[]
  conceptSets: ConceptSetReference[]
  disabled?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: CohortEvent[]]
  'add-event': []
  'remove-event': [index: number]
  'validation-error': [errors: ValidationError[]]
  'select-censoring-concept-set': []
}>()

// Local state
const localEvents = ref<CohortEvent[]>([...props.modelValue])

// Format criteria type for display
function formatCriteriaType(type: CriteriaType): string {
  const typeMap: Record<CriteriaType, string> = {
    ConditionOccurrence: 'Condition Occurrence',
    ConditionEra: 'Condition Era',
    DrugExposure: 'Drug Exposure',
    DrugEra: 'Drug Era',
    DoseEra: 'Dose Era',
    ProcedureOccurrence: 'Procedure Occurrence',
    Measurement: 'Measurement',
    Observation: 'Observation',
    ObservationPeriod: 'Observation Period',
    DeviceExposure: 'Device Exposure',
    VisitOccurrence: 'Visit Occurrence',
    VisitDetail: 'Visit Detail',
    Death: 'Death',
    Specimen: 'Specimen',
    PayerPlanPeriod: 'Payer Plan Period',
    LocationRegion: 'Location Region'
  }
  return typeMap[type] || type
}

// Check if event has invalid concept set reference
function hasInvalidConceptSet(event: CohortEvent): boolean {
  if (!event.conceptSet) {
    return false
  }
  // Check if concept set exists in available concept sets
  return !props.conceptSets.some(cs =>
    cs.id === event.conceptSet?.id || cs.name === event.conceptSet?.name
  )
}

// Add new censoring event
function addEvent() {
  // Open concept set selector dialog for censoring events
  emit('select-censoring-concept-set')
}

// Remove event
function removeEvent(index: number) {
  localEvents.value.splice(index, 1)
  emit('update:modelValue', localEvents.value)
  emit('remove-event', index)
  validateEvents()
}

// Validate all events
function validateEvents() {
  const errors: ValidationError[] = []

  localEvents.value.forEach((event, index) => {
    if (hasInvalidConceptSet(event)) {
      errors.push({
        field: `censoringEvents[${index}].conceptSet`,
        message: t('exitCriteria.validation.conceptSetNotFound', 'Concept set not found in this cohort').value,
        severity: 'warning'
      })
    }
  })

  emit('validation-error', errors)
}

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  localEvents.value = [...newValue]
  validateEvents()
}, { deep: true })

// Initial validation
validateEvents()
</script>

<style scoped>
.censoring-events-editor {
  margin: 16px 0;
}

.events-list {
  margin-top: 8px;
}

.event-card {
  transition: box-shadow 0.2s;
}

.event-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.event-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-type {
  font-weight: 500;
}
</style>
