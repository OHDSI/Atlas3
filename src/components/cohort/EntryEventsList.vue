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
      <div
        v-if="events.length === 0"
        class="empty-state"
      >
        <v-menu>
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              color="primary"
              variant="outlined"
              size="small"
              data-testid="add-entry-event"
            >
              <v-icon class="mr-2">
                mdi-plus
              </v-icon>
              {{ t('common.addFilter', 'Add Filter') }}
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="eventType in eventTypeOptions"
              :key="eventType.value"
              :title="eventType.label"
              @click="addEvent(eventType.value)"
            />
          </v-list>
        </v-menu>
      </div>

      <div
        v-else
        class="events-with-add-button"
      >
        <v-menu>
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              color="primary"
              variant="outlined"
              size="small"
              data-testid="add-entry-event"
              class="mb-4"
            >
              <v-icon class="mr-2">
                mdi-plus
              </v-icon>
              {{ t('common.addFilter', 'Add Filter') }}
            </v-btn>
          </template>
          <v-list>
            <v-list-item
              v-for="eventType in eventTypeOptions"
              :key="eventType.value"
              :title="eventType.label"
              @click="addEvent(eventType.value)"
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
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import type { CohortEvent, CriteriaType } from '@/models/cohort.types'
import EntryEventCard from './EntryEventCard.vue'

interface Props {
  events: CohortEvent[]
}

const props = defineProps<Props>()
const { t, tv } = useI18n()

const emit = defineEmits<{
  'update:events': [events: CohortEvent[]]
  'select-concept-set': [eventId: string]
  'edit-concept-set': [conceptSet: any]
}>()

const eventTypeOptions = [
  { label: tv('cohortDefinitions.criteriaOptions.conditionOccurrence'), value: 'ConditionOccurrence' },
  { label: tv('cohortDefinitions.criteriaOptions.drugExposure'), value: 'DrugExposure' },
  { label: tv('cohortDefinitions.criteriaOptions.procedureOccurrence'), value: 'ProcedureOccurrence' },
  { label: tv('cohortDefinitions.criteriaOptions.observation'), value: 'Observation' },
  { label: tv('cohortDefinitions.criteriaOptions.measurement'), value: 'Measurement' },
  { label: tv('cohortDefinitions.criteriaOptions.visitOccurrence'), value: 'VisitOccurrence' },
  { label: tv('cohortDefinitions.criteriaOptions.deviceExposure'), value: 'DeviceExposure' },
  { label: tv('cohortDefinitions.criteriaOptions.observationPeriod'), value: 'ObservationPeriod' },
  { label: tv('cohortDefinitions.criteriaOptions.death'), value: 'Death' },
]

function addEvent(criteriaType: string) {
  const newEvent: CohortEvent = {
    id: uuidv4(),
    criteriaType: criteriaType as CriteriaType,
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

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.events-with-add-button {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
</style>

