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
import TemporalFilterChip from './TemporalFilterChip.vue'
import { AtlasCard } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    event: CohortEvent
    index?: number
    section?: string
  }>(),
  {
    index: 0,
    section: 'criteriaGroup', // Default section context
  }
)

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
  <AtlasCard
    class="event-card mb-2"
    padding="none"
  >
    <!-- Header — no generic mdi-medical-bag, criteria-type label
         is the primary line, concept-set name is the secondary
         line. Expand/delete sit aligned to the right. -->
    <div class="event-card__header">
      <div class="event-card__title-block">
        <div class="event-card__type">
          {{ criteriaTypeLabel }}
        </div>
        <div class="event-card__concept-set">
          <template v-if="event.conceptSet?.name">
            {{ event.conceptSet.name }}
            <span
              v-if="event.conceptSet?.conceptCount"
              class="event-card__concept-set-count"
            >
              · {{ event.conceptSet.conceptCount }} concepts
            </span>
          </template>
          <template v-else>
            <span class="event-card__concept-set--placeholder">No concept set</span>
          </template>
        </div>
      </div>
      <v-btn
        icon="mdi-chevron-down"
        variant="text"
        size="small"
        :class="{ 'rotate-180': expanded }"
        :aria-label="expanded ? 'Collapse' : 'Expand'"
        @click="toggleExpanded"
      />
      <v-btn
        icon="mdi-delete-outline"
        variant="text"
        size="small"
        color="error"
        :aria-label="'Remove event'"
        @click="removeEvent"
      />
    </div>

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
        <TemporalFilterChip
          v-if="hasTemporalWindows"
          :label="temporalWindowDisplay ?? ''"
          :closable="false"
        />
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
  </AtlasCard>
</template>

<style scoped>
.event-card {
  /* SurfaceCard provides surface + radius + shadow. */
}

.event-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
}

.event-card__title-block {
  flex: 1;
  min-width: 0;
}

.event-card__type {
  font-size: 14px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  line-height: 1.3;
}

.event-card__concept-set {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.4;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-card__concept-set-count {
  opacity: 0.85;
}

.event-card__concept-set--placeholder {
  font-style: italic;
  opacity: 0.7;
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}
</style>
