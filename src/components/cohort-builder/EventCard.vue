<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useFilterConfig } from '@/composables/useFilterConfig'
import type { CohortEvent } from '@/models/cohort.types'
import type { EventAttribute } from '@/models/event.types'
import { useCardinality } from '@/composables/useCardinality'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import CardinalityEditor from './CardinalityEditor.vue'
import TemporalWindowEditor from './TemporalWindowEditor.vue'
import AttributesEditor from './AttributesEditor.vue'

const props = withDefaults(defineProps<{
  event: CohortEvent
  index?: number
  section?: string
}>(), {
  index: 0,
  section: 'criteriaGroup' // Default section context
})

const emit = defineEmits<{
  remove: []
  update: [event: CohortEvent]
}>()

const { formatCardinalityDisplay, defaultCardinality } = useCardinality()
const { formatTemporalWindowDisplay } = useTemporalWindows()

// Use configuration-driven filter list (supports all 16 filter types)
const sectionRef = ref(props.section)
const { availableFilters } = useFilterConfig(sectionRef)

// Expand/collapse state
const expanded = ref(false)
const showCardinalityEditor = ref(false)
const showTemporalWindowEditor = ref(false)
const showAttributesEditor = ref(false)

// Format criteria type for display using configuration
const criteriaTypeLabel = computed(() => {
  const filter = availableFilters.value.find(f => f.criteriaType === props.event.criteriaType)
  return filter?.name || props.event.criteriaType
})

// Check if event has cardinality
const hasCardinality = computed(() => props.event.cardinality !== undefined)

// Check if event has temporal windows
const hasTemporalWindows = computed(() => props.event.temporalWindow !== undefined)

// Check if event has attributes
const hasAttributes = computed(() => props.event.attributes && props.event.attributes.length > 0)

// Format displays
const cardinalityDisplay = computed(() => {
  if (!props.event.cardinality) return null
  return formatCardinalityDisplay(props.event.cardinality)
})

const temporalWindowDisplay = computed(() => {
  if (!props.event.temporalWindow) return null
  return formatTemporalWindowDisplay(props.event.temporalWindow)
})

// Handlers
const toggleExpanded = () => {
  expanded.value = !expanded.value
}

const addCardinality = async () => {
  // Initialize cardinality with default value BEFORE showing editor
  // This prevents race condition between watcher and user input
  updateCardinality(defaultCardinality())
  // Wait for Vue to update props before showing editor
  await nextTick()
  showCardinalityEditor.value = true
}

const addTemporalWindow = () => {
  showTemporalWindowEditor.value = true
}

const addAttributes = () => {
  showAttributesEditor.value = true
}

const updateCardinality = (cardinality: CohortEvent['cardinality']) => {
  emit('update', {
    ...props.event,
    cardinality,
  })
}

const updateTemporalWindows = (temporalWindow: CohortEvent['temporalWindow']) => {
  emit('update', {
    ...props.event,
    temporalWindow,
  })
}

const updateAttributes = (attributes: EventAttribute[]) => {
  emit('update', {
    ...props.event,
    attributes,
  })
}

const removeCardinality = () => {
  const updated = { ...props.event }
  delete updated.cardinality
  emit('update', updated)
  showCardinalityEditor.value = false
}

const removeTemporalWindow = () => {
  const updated = { ...props.event }
  delete updated.temporalWindow
  emit('update', updated)
  showTemporalWindowEditor.value = false
}

const removeEvent = () => {
  emit('remove')
}
</script>

<template>
  <v-card
    class="event-card mb-3"
    elevation="1"
  >
    <!-- Header -->
    <v-card-title class="d-flex align-center pa-3">
      <v-icon
        class="mr-2"
        size="small"
      >
        mdi-medical-bag
      </v-icon>
      <div class="flex-grow-1">
        <div class="text-subtitle-1">
          {{ criteriaTypeLabel }}
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ event.conceptSet?.name || 'No concept set' }}
          <span
            v-if="event.conceptSet?.conceptCount"
            class="ml-1"
          >
            ({{ event.conceptSet.conceptCount }} concepts)
          </span>
        </div>
      </div>
      <v-btn
        icon="mdi-chevron-down"
        variant="text"
        size="small"
        :class="{ 'rotate-180': expanded }"
        @click="toggleExpanded"
      />
      <v-btn
        icon="mdi-delete"
        variant="text"
        size="small"
        color="error"
        @click="removeEvent"
      />
    </v-card-title>

    <!-- Summary Chips -->
    <v-card-text
      v-if="hasCardinality || hasTemporalWindows || hasAttributes"
      class="pt-0 pb-2"
    >
      <div class="d-flex flex-wrap ga-2">
        <v-chip
          v-if="hasCardinality"
          size="small"
          color="primary"
          variant="tonal"
        >
          <v-icon
            start
            size="small"
          >
            mdi-counter
          </v-icon>
          {{ cardinalityDisplay }}
        </v-chip>
        <v-chip
          v-if="hasTemporalWindows"
          size="small"
          color="secondary"
          variant="tonal"
        >
          <v-icon
            start
            size="small"
          >
            mdi-calendar-range
          </v-icon>
          {{ temporalWindowDisplay }}
        </v-chip>
        <v-chip
          v-if="hasAttributes"
          size="small"
          color="accent"
          variant="tonal"
        >
          <v-icon
            start
            size="small"
          >
            mdi-filter
          </v-icon>
          {{ event.attributes!.length }} attribute{{ event.attributes!.length > 1 ? 's' : '' }}
        </v-chip>
      </div>
    </v-card-text>

    <!-- Expanded Details -->
    <v-expand-transition>
      <div v-show="expanded">
        <v-divider />
        <v-card-text>
          <!-- Action Buttons -->
          <div class="d-flex flex-wrap ga-2 mb-4">
            <v-btn
              v-if="!hasCardinality"
              size="small"
              variant="outlined"
              prepend-icon="mdi-counter"
              @click="addCardinality"
            >
              Add Cardinality
            </v-btn>
            <v-btn
              v-if="!hasTemporalWindows"
              size="small"
              variant="outlined"
              prepend-icon="mdi-calendar-range"
              @click="addTemporalWindow"
            >
              Add Temporal Window
            </v-btn>
            <v-btn
              v-if="!hasAttributes"
              size="small"
              variant="outlined"
              prepend-icon="mdi-filter"
              @click="addAttributes"
            >
              Add Attributes
            </v-btn>
          </div>

          <!-- Cardinality Editor -->
          <div
            v-if="hasCardinality || showCardinalityEditor"
            class="mb-4"
          >
            <div class="d-flex align-center mb-2">
              <div class="text-subtitle-2 flex-grow-1">
                Cardinality
              </div>
              <v-btn
                v-if="hasCardinality"
                icon="mdi-close"
                variant="text"
                size="x-small"
                @click="removeCardinality"
              />
            </div>
            <CardinalityEditor
              :model-value="event.cardinality"
              @update:model-value="updateCardinality"
            />
          </div>

          <!-- Temporal Window Editor -->
          <div
            v-if="hasTemporalWindows || showTemporalWindowEditor"
            class="mb-4"
          >
            <div class="d-flex align-center mb-2">
              <div class="text-subtitle-2 flex-grow-1">
                Temporal Windows
              </div>
              <v-btn
                v-if="hasTemporalWindows"
                icon="mdi-close"
                variant="text"
                size="x-small"
                @click="removeTemporalWindow"
              />
            </div>
            <TemporalWindowEditor
              :model-value="event.temporalWindow"
              @update:model-value="updateTemporalWindows"
            />
          </div>

          <!-- Attributes Editor -->
          <div
            v-if="hasAttributes || showAttributesEditor"
            class="mb-4"
          >
            <AttributesEditor
              :model-value="event.attributes || []"
              :criteria-type="event.criteriaType"
              :section="section"
              @update:model-value="updateAttributes"
            />
          </div>

          <!-- Event Details -->
          <v-divider class="my-4" />
          <div class="text-caption text-medium-emphasis">
            <div class="mb-1">
              <strong>Event ID:</strong> {{ event.id }}
            </div>
            <div class="mb-1">
              <strong>Criteria Type:</strong> {{ event.criteriaType }}
            </div>
            <div class="mb-1">
              <strong>Concept Set ID:</strong> {{ event.conceptSet?.id || 'N/A' }}
            </div>
            <div
              v-if="event.restrictVisit"
              class="mb-1"
            >
              <v-icon
                size="small"
                color="info"
              >
                mdi-information
              </v-icon>
              Event must occur in same visit as index
            </div>
            <div
              v-if="event.ignoreObservationPeriod"
              class="mb-1"
            >
              <v-icon
                size="small"
                color="warning"
              >
                mdi-alert
              </v-icon>
              Event can occur outside observation period
            </div>
          </div>
        </v-card-text>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<style scoped>
.event-card {
  transition: all 0.3s ease;
}

.event-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}
</style>
