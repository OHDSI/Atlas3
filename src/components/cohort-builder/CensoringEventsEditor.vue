<template>
  <div class="censoring-events-editor">
    <div class="censoring-events-editor__body">
      <!-- The "Censoring Events:" h3 was removed — its information
           is duplicated by the eyebrow + the explanatory line below.
           Eyebrow + a one-line description carries the same meaning
           with less vertical weight. -->
      <div class="censoring-events-editor__heading">
        <span class="text-eyebrow">{{
          t('components.cohortExpressionEditor.censoringEvents', 'Censoring events').value
        }}</span>
        <span class="censoring-events-editor__heading-rule" />
      </div>
      <p class="censoring-events-editor__lede">
        {{
          t(
            'components.cohortExpressionEditor.censoringEventsDescription',
            'Exit cohort when any of these events occur.'
          ).value
        }}
      </p>

      <div>
        <!-- Empty state — quiet inline hint (matches event
             persistence + data sources hint style). -->
        <div
          v-if="localEvents.length === 0"
          class="censoring-events__hint"
        >
          <AtlasIcon
            icon="mdi-information-outline"
            size="16"
            class="censoring-events__hint-icon"
          />
          <span>No censoring events defined. Cohort membership will not be affected by additional
            events.</span>
        </div>

        <!-- Event list -->
        <div
          v-else
          class="events-list"
        >
          <v-card
            v-for="(event, index) in localEvents"
            :key="event.id"
            class="event-card mb-3"
            variant="outlined"
          >
            <v-card-text>
              <AtlasRow align="center">
                <AtlasCol
                  cols="1"
                  class="text-center"
                >
                  <span class="text-h6 text-medium-emphasis">{{ index + 1 }}</span>
                </AtlasCol>
                <AtlasCol cols="10">
                  <div class="event-info">
                    <div class="event-type text-subtitle-1">
                      {{ formatCriteriaType(event.criteriaType) }}
                    </div>
                    <div
                      v-if="event.conceptSet"
                      class="event-concept-set text-body-2"
                    >
                      <AtlasChip
                        size="sm"
                        tone="primary"
                      >
                        {{ event.conceptSet.name }}
                      </AtlasChip>
                    </div>
                    <!-- Warning for invalid concept set reference -->
                    <AtlasAlert
                      v-if="hasInvalidConceptSet(event)"
                      severity="warning"
                      density="compact"
                      class="mt-2"
                    >
                      {{
                        t(
                          'exitCriteria.validation.conceptSetNotFound',
                          'Concept set not found in this cohort'
                        ).value
                      }}
                    </AtlasAlert>
                  </div>
                </AtlasCol>
                <AtlasCol
                  cols="1"
                  class="text-right"
                >
                  <v-btn
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    color="error"
                    :disabled="disabled"
                    @click="removeEvent(index)"
                  />
                </AtlasCol>
              </AtlasRow>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <div class="mt-4">
        <AtlasButton
          variant="secondary"
          icon="mdi-plus"
          :disabled="disabled"
          @click="addEvent"
        >
          {{
            t('components.cohortExpressionEditor.addCensoringEvent', 'Add Censoring Event...').value
          }}
        </AtlasButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasChip, AtlasCol, AtlasIcon, AtlasRow } from '@/components/ui'
import { ref, watch } from 'vue'
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
    LocationRegion: 'Location Region',
  }
  return typeMap[type] || type
}

// Check if event has invalid concept set reference
function hasInvalidConceptSet(event: CohortEvent): boolean {
  if (!event.conceptSet) {
    return false
  }
  // Check if concept set exists in available concept sets
  return !props.conceptSets.some(
    cs => cs.id === event.conceptSet?.id || cs.name === event.conceptSet?.name
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
        message: t(
          'exitCriteria.validation.conceptSetNotFound',
          'Concept set not found in this cohort'
        ).value,
        severity: 'warning',
      })
    }
  })

  emit('validation-error', errors)
}

// Watch for external changes (shallow watch to prevent reactive loops)
// Deep watching is unnecessary here since we're copying the entire array
watch(
  () => props.modelValue,
  newValue => {
    localEvents.value = [...newValue]
    validateEvents()
  }
)

// Initial validation
validateEvents()
</script>

<style scoped>
.censoring-events-editor {
  margin: 0;
}

.censoring-events-editor__body {
  padding: 12px 16px;
  border-top: 1px dashed rgb(var(--v-theme-outline-variant, 224, 224, 224));
}

.censoring-events-editor__heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.censoring-events-editor__heading-rule {
  display: inline-block;
  width: 24px;
  height: 2px;
  background: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.censoring-events-editor__lede {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0 0 8px;
  line-height: 1.5;
}

/* Quiet inline hint — matches event persistence + data sources. */
.censoring-events__hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.censoring-events__hint-icon {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  flex-shrink: 0;
  margin-top: 2px;
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
