<template>
  <div class="events-container">
    <!-- Vertical "ALL" Label -->
    <div class="vertical-label-container">
      <div class="vertical-label">
        {{ tv('options.all').toUpperCase() }}
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-grow-1">
      <!-- Add Filter Button and Observation Period -->
      <div class="add-filter-wrapper">
        <v-menu>
          <template #activator="{ props: slotProps }">
            <v-btn
              v-bind="slotProps"
              variant="outlined"
              prepend-icon="mdi-plus"
              size="small"
              data-testid="add-entry-event"
            >
              {{ t('components.criteriaGroup.addCriteria') }}
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

        <!-- Observation Period Chip -->
        <v-chip
          class="obs-period-chip"
          color="orange"
          variant="outlined"
          size="small"
          @click="showObsPeriodDialog = true"
        >
          <v-icon
            start
            size="small"
          >
            mdi-clock-outline
          </v-icon>
          <!-- Short version for small screens -->
          <span class="d-md-none">
            {{ observationPeriod.priorDays }} {{ t('options.before', 'before') }} {{ observationPeriod.postDays }} {{ t('options.after', 'after') }}
          </span>
          <!-- Full version for larger screens -->
          <span class="d-none d-md-inline">
            {{ observationPeriod.priorDays }} {{ t('common.days', 'days') }} {{ t('options.before', 'before') }} {{ t('common.and', 'and') }} {{ observationPeriod.postDays }} {{ t('common.days', 'days') }} {{ t('options.after', 'after') }} {{ t('components.cohortExpressionEditor.eventIndexDate', 'the event index date') }}
          </span>
        </v-chip>
      </div>

      <!-- Observation Period Dialog -->
      <v-dialog
        v-model="showObsPeriodDialog"
        max-width="500"
      >
        <v-card>
          <v-card-title>{{ t('components.cohortExpressionEditor.cohortEntryEventsText_6', 'Observation Period') }}</v-card-title>
          <v-card-text>
            <div class="obs-period-dialog-content">
              <div class="obs-period-field">
                <label>{{ t('components.cohortExpressionEditor.cohortEntryEventsText_3') }}</label>
                <v-text-field
                  :model-value="observationPeriod.priorDays"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  min="0"
                  @update:model-value="updateObservationPeriod('priorDays', $event)"
                />
              </div>
              <div class="obs-period-field">
                <label>{{ t('components.cohortExpressionEditor.cohortEntryEventsText_4') }}</label>
                <v-text-field
                  :model-value="observationPeriod.postDays"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  min="0"
                  @update:model-value="updateObservationPeriod('postDays', $event)"
                />
              </div>
              <div class="obs-period-info">
                {{ t('components.cohortExpressionEditor.cohortEntryEventsText_5') }}
              </div>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="showObsPeriodDialog = false">
              {{ t('common.close', 'Close') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <entry-event-card
        v-for="event in events"
        :key="event.id"
        :event="event"
        @update="updateEvent"
        @remove="removeEvent(event.id)"
        @select-concept-set="selectConceptSetForEvent(event.id)"
        @select-concept-set-for-attribute="(attributeIndex) => $emit('select-concept-set-for-attribute', event.id, attributeIndex)"
        @select-concept-for-attribute="(attributeIndex, domainFilter) => $emit('select-concept-for-attribute', event.id, attributeIndex, domainFilter)"
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
import type { CohortEvent, CriteriaType, ObservationPeriod } from '@/models/cohort.types'
import EntryEventCard from './EntryEventCard.vue'

interface Props {
  events: CohortEvent[]
  observationPeriod: ObservationPeriod
}

const props = defineProps<Props>()
const { t, tv } = useI18n()

const emit = defineEmits<{
  'update:events': [events: CohortEvent[]]
  'update:observation-period': [period: ObservationPeriod]
  'select-concept-set': [eventId: string]
  'select-concept-set-for-attribute': [eventId: string, attributeIndex: number]
  'select-concept-for-attribute': [eventId: string, attributeIndex: number, domainFilter: string | undefined]
  'edit-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
}>()

// Get available filters for initial events section
const { availableFilters } = useFilterConfig(ref('initialEvents'))

// Dialog state
const showObsPeriodDialog = ref(false)

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

function updateObservationPeriod(field: 'priorDays' | 'postDays', value: string | number) {
  emit('update:observation-period', {
    ...props.observationPeriod,
    [field]: Number(value) || 0
  })
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
  border: 1px solid #616161;
  position: relative;
}

.vertical-label-container::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #616161;
}

.vertical-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-size: 14px;
  font-weight: 700;
  color: #616161;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding-left: 8px;
  position: relative;
  z-index: 1;
}

.flex-grow-1 {
  flex: 1;
  padding: 24px 16px;
}

.add-filter-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.obs-period-chip {
  cursor: pointer;
  font-size: 12px;
}

.obs-period-dialog-content {
  padding: 16px 0;
}

.obs-period-field {
  margin-bottom: 16px;
}

.obs-period-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.obs-period-info {
  font-size: 12px;
  color: #666;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-top: 16px;
}
</style>

