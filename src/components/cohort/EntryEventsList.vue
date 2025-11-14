<template>
  <div class="events-container">
    <!-- Vertical "ALL" Label -->
    <div class="vertical-label-container">
      <div class="vertical-label">
        {{ t('options.all').value.toUpperCase() }}
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-grow-1">
      <!-- Add Filter Button -->
      <div class="add-filter-wrapper">
        <v-menu>
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="outlined"
              prepend-icon="mdi-plus"
              size="default"
              data-testid="add-entry-event"
            >
              {{ t('components.criteriaGroup.addCriteria').value }}
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="filter in availableFilters"
              :key="filter.criteriaType"
              :title="filter.name"
              :subtitle="filter.description"
              @click="handleFilterTypeSelected(filter.criteriaType)"
            />
          </v-list>
        </v-menu>
      </div>

      <entry-event-card
        v-for="event in events"
        :key="event.id"
        :event="event"
        @update="updateEvent"
        @remove="removeEvent(event.id)"
        @select-concept-set="selectConceptSetForEvent(event.id)"
        @edit-concept-set="$emit('edit-concept-set', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'
import type { CohortEvent, CriteriaType } from '@/models/cohort.types'
import EntryEventCard from './EntryEventCard.vue'

interface Props {
  events: CohortEvent[]
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  'update:events': [events: CohortEvent[]]
  'select-concept-set': [eventId: string]
  'edit-concept-set': [conceptSet: any]
}>()

// Get available filters for initial events section
const { availableFilters } = useFilterConfig(ref('initialEvents'))

/**
 * Handle filter type selection from menu
 * Creates a new event with the selected filter type
 */
function handleFilterTypeSelected(filterType: string) {
  if (!filterType) return

  const newEvent: CohortEvent = {
    id: uuidv4(),
    criteriaType: filterType as CriteriaType,
    attributes: [],
  }

  emit('update:events', [...props.events, newEvent])
}

function updateEvent(updatedEvent: CohortEvent) {
  const index = props.events.findIndex(e => e.id === updatedEvent.id)
  if (index === -1) return

  const newEvents = [...props.events]
  newEvents[index] = updatedEvent
  emit('update:events', newEvents)
}

function removeEvent(eventId: string) {
  const newEvents = props.events.filter(e => e.id !== eventId)
  emit('update:events', newEvents)
}

function selectConceptSetForEvent(eventId: string) {
  emit('select-concept-set', eventId)
}
</script>

<style scoped>
.events-container {
  display: flex;
  background: white;
}

.vertical-label-container {
  display: flex;
  align-items: center;
  width: 30px;
  border: 1px solid #1f425a;
  position: relative;
}

.vertical-label-container::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #1f425a;
}

.vertical-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-size: 14px;
  font-weight: 700;
  color: #1f425a;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding-left: 2px;
  position: relative;
  z-index: 1;
}

.flex-grow-1 {
  flex: 1;
  padding: 24px 16px;
}

.add-filter-wrapper {
  margin-bottom: 16px;
}
</style>

