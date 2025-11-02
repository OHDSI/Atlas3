<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-calendar-multiple</v-icon>
      <span>Entry Events</span>
      <v-spacer />
      <v-btn
        color="primary"
        variant="outlined"
        size="small"
        data-testid="add-entry-event"
        @click="addEvent"
      >
        <v-icon class="mr-2">mdi-plus</v-icon>
        Add Event
      </v-btn>
    </v-card-title>

    <v-card-text>
      <p v-if="events.length === 0" class="text-body-2 text-medium-emphasis">
        No entry events defined. Click "Add Event" to create the first entry event.
      </p>

      <entry-event-card
        v-for="event in events"
        :key="event.id"
        :event="event"
        @update="updateEvent"
        @remove="removeEvent(event.id)"
        @select-concept-set="selectConceptSetForEvent(event.id)"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import type { CohortEvent } from '@/models/cohort.types'
import EntryEventCard from './EntryEventCard.vue'

interface Props {
  events: CohortEvent[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:events': [events: CohortEvent[]]
  'select-concept-set': [eventId: string]
}>()

function addEvent() {
  const newEvent: CohortEvent = {
    id: uuidv4(),
    criteriaType: 'ConditionOccurrence',
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
