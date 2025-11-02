<template>
  <v-card data-testid="entry-event-card" :elevation="isExpanded ? 4 : 2" class="mb-3">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-calendar-check</v-icon>
      <span>{{ eventTypeLabel }}</span>
      <v-spacer />

      <!-- Summary chips when collapsed -->
      <div v-if="!isExpanded" class="d-flex ga-2 mr-2">
        <v-chip v-if="hasCardinality" size="small" color="primary" variant="tonal">
          {{ cardinalityDisplay }}
        </v-chip>
        <v-chip v-if="hasTemporalWindows" size="small" color="secondary" variant="tonal">
          {{ temporalWindowDisplay }}
        </v-chip>
      </div>

      <v-btn
        icon
        size="small"
        variant="text"
        @click="toggleExpanded"
      >
        <v-icon>{{ isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </v-btn>
      <v-btn
        icon
        size="small"
        variant="text"
        color="error"
        @click="emit('remove')"
      >
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </v-card-title>

    <v-expand-transition>
      <v-card-text v-show="isExpanded">
        <v-select
          :model-value="event.criteriaType"
          label="Event Type"
          :items="eventTypeOptions"
          item-title="label"
          item-value="value"
          variant="outlined"
          density="comfortable"
          data-testid="event-type-selector"
          @update:model-value="updateCriteriaType"
        />

        <div v-if="event.conceptSet" class="mt-3">
          <v-chip
            closable
            color="primary"
            @click:close="removeConceptSet"
          >
            {{ event.conceptSet.name }}
          </v-chip>
        </div>

        <v-btn
          v-else
          color="primary"
          variant="outlined"
          class="mt-3"
          data-testid="concept-set-picker"
          @click="emit('select-concept-set')"
        >
          <v-icon class="mr-2">mdi-plus</v-icon>
          Select Concept Set
        </v-btn>

        <!-- Cardinality Section -->
        <v-divider class="my-4" />
        <div class="mb-3">
          <div class="d-flex align-center mb-2">
            <span class="text-subtitle-2">Cardinality</span>
            <v-spacer />
            <v-btn
              v-if="!showCardinalityEditor && !hasCardinality"
              size="small"
              variant="outlined"
              prepend-icon="mdi-counter"
              @click="addCardinality"
            >
              Add Cardinality
            </v-btn>
          </div>

          <div v-if="showCardinalityEditor || hasCardinality">
            <CardinalityEditor
              :model-value="event.cardinality"
              @update:model-value="updateCardinality"
            />
            <v-btn
              v-if="hasCardinality"
              size="small"
              variant="text"
              color="error"
              class="mt-2"
              @click="removeCardinality"
            >
              Remove Cardinality
            </v-btn>
          </div>
        </div>

        <!-- Temporal Window Section -->
        <v-divider class="my-4" />
        <div class="mb-3">
          <div class="d-flex align-center mb-2">
            <span class="text-subtitle-2">Temporal Windows</span>
            <v-spacer />
            <v-btn
              v-if="!showTemporalWindowEditor && !hasTemporalWindows"
              size="small"
              variant="outlined"
              prepend-icon="mdi-calendar-range"
              @click="showTemporalWindowEditor = true"
            >
              Add Temporal Window
            </v-btn>
          </div>

          <div v-if="showTemporalWindowEditor || hasTemporalWindows">
            <TemporalWindowEditor
              :model-value="event.temporalWindow"
              @update:model-value="updateTemporalWindows"
            />
            <v-btn
              v-if="hasTemporalWindows"
              size="small"
              variant="text"
              color="error"
              class="mt-2"
              @click="removeTemporalWindow"
            >
              Remove Temporal Window
            </v-btn>
          </div>
        </div>

        <!-- Attributes Section -->
        <v-divider class="my-4" />
        <div class="mb-3">
          <div class="d-flex align-center mb-2">
            <span class="text-subtitle-2">Attributes</span>
            <v-spacer />
            <v-btn
              v-if="!showAttributesEditor && !hasAttributes"
              size="small"
              variant="outlined"
              prepend-icon="mdi-filter"
              @click="addAttributes"
            >
              Add Attributes
            </v-btn>
          </div>

          <div v-if="showAttributesEditor || hasAttributes">
            <AttributesEditor
              :model-value="event.attributes || []"
              :criteria-type="event.criteriaType"
              @update:model-value="updateAttributes"
            />
          </div>
        </div>
      </v-card-text>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CohortEvent, CriteriaType } from '@/models/cohort.types'
import type { EventAttribute } from '@/models/event.types'
import { useUIStore } from '@/stores/ui'
import { useCardinality } from '@/composables/useCardinality'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import CardinalityEditor from '@/components/cohort-builder/CardinalityEditor.vue'
import TemporalWindowEditor from '@/components/cohort-builder/TemporalWindowEditor.vue'
import AttributesEditor from '@/components/cohort-builder/AttributesEditor.vue'

interface Props {
  event: CohortEvent
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update': [event: CohortEvent]
  'remove': []
  'select-concept-set': []
}>()

const uiStore = useUIStore()
const { formatCardinalityDisplay, defaultCardinality } = useCardinality()
const { formatTemporalWindowDisplay } = useTemporalWindows()

const showCardinalityEditor = ref(false)
const showTemporalWindowEditor = ref(false)
const showAttributesEditor = ref(false)

const isExpanded = computed(() => uiStore.expandedEventCards.has(props.event.id))

function toggleExpanded() {
  uiStore.toggleEventCard(props.event.id)
}

const eventTypeOptions = [
  { label: 'Condition Occurrence', value: 'ConditionOccurrence' as CriteriaType },
  { label: 'Drug Exposure', value: 'DrugExposure' as CriteriaType },
  { label: 'Procedure Occurrence', value: 'ProcedureOccurrence' as CriteriaType },
  { label: 'Observation', value: 'Observation' as CriteriaType },
  { label: 'Measurement', value: 'Measurement' as CriteriaType },
  { label: 'Visit Occurrence', value: 'VisitOccurrence' as CriteriaType },
]

const eventTypeLabel = computed(() => {
  const option = eventTypeOptions.find(opt => opt.value === props.event.criteriaType)
  return option?.label ?? 'Entry Event'
})

const hasCardinality = computed(() => props.event.cardinality !== undefined)
const hasTemporalWindows = computed(() => props.event.temporalWindow !== undefined)
const hasAttributes = computed(() => props.event.attributes && props.event.attributes.length > 0)

const cardinalityDisplay = computed(() => {
  if (!props.event.cardinality) return null
  return formatCardinalityDisplay(props.event.cardinality)
})

const temporalWindowDisplay = computed(() => {
  if (!props.event.temporalWindow) return null
  return formatTemporalWindowDisplay(props.event.temporalWindow)
})

function updateCriteriaType(newType: CriteriaType) {
  emit('update', {
    ...props.event,
    criteriaType: newType,
  })
}

function removeConceptSet() {
  emit('update', {
    ...props.event,
    conceptSet: undefined,
  })
}

function addCardinality() {
  // Initialize cardinality with default value BEFORE showing editor
  // This prevents race condition with user input
  updateCardinality(defaultCardinality())
  showCardinalityEditor.value = true
}

function updateCardinality(cardinality: CohortEvent['cardinality']) {
  emit('update', {
    ...props.event,
    cardinality,
  })
}

function removeCardinality() {
  const updated = { ...props.event }
  delete updated.cardinality
  emit('update', updated)
  showCardinalityEditor.value = false
}

function updateTemporalWindows(temporalWindow: CohortEvent['temporalWindow']) {
  emit('update', {
    ...props.event,
    temporalWindow,
  })
}

function removeTemporalWindow() {
  const updated = { ...props.event }
  delete updated.temporalWindow
  emit('update', updated)
  showTemporalWindowEditor.value = false
}

function addAttributes() {
  showAttributesEditor.value = true
}

function updateAttributes(attributes: EventAttribute[]) {
  emit('update', {
    ...props.event,
    attributes,
  })
}
</script>

<style scoped>
.v-card {
  transition: all 0.2s ease;
}
</style>
