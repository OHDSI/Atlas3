<template>
  <!-- Vertical "ALL" sticker retired (matches the inclusion-rules
       panel). Section header toggle is the source of truth. -->
  <div class="events-container">
    <div class="events-container__body">
      <!-- Toolbar: add-criteria menu + observation-period pill -->
      <div class="add-filter-wrapper">
        <AtlasMenu>
          <template #activator="{ props: slotProps }">
            <AtlasButton
              v-bind="slotProps"
              variant="secondary"
              icon="mdi-plus"
              size="sm"
              data-testid="add-entry-event"
            >
              {{ t('components.criteriaGroup.addCriteria') }}
            </AtlasButton>
          </template>
          <AtlasList>
            <AtlasListItem
              v-for="filter in availableFilters"
              :key="filter.criteriaType"
              :title="filter.name"
              :subtitle="filter.description"
              @click="handleFilterTypeSelected(filter.criteriaType)"
            />
          </AtlasList>
        </AtlasMenu>

        <!-- Observation Period chip — orange/warning outlined to match
             the other timeframe pills (TemporalFilterChip). Pushed to
             the right edge of the toolbar via margin-left:auto. -->
        <AtlasChip
          class="obs-period-chip"
          tone="warning"
          variant="outlined"
          size="sm"
          @click="showObsPeriodDialog = true"
        >
          <AtlasIcon
            start
            size="small"
          >
            mdi-clock-outline
          </AtlasIcon>
          <!-- Short version for small screens -->
          <span class="d-md-none">
            {{ observationPeriod.priorDays }} {{ t('options.before', 'before') }}
            {{ observationPeriod.postDays }} {{ t('options.after', 'after') }}
          </span>
          <!-- Full version for larger screens -->
          <span class="d-none d-md-inline">
            {{ observationPeriod.priorDays }} {{ t('common.days', 'days') }}
            {{ t('options.before', 'before') }} {{ t('common.and', 'and') }}
            {{ observationPeriod.postDays }} {{ t('common.days', 'days') }}
            {{ t('options.after', 'after') }}
            {{ t('components.cohortExpressionEditor.eventIndexDate', 'the event index date') }}
          </span>
        </AtlasChip>
      </div>

      <!-- Observation Period Dialog -->
      <AtlasDialog
        v-model="showObsPeriodDialog"
        eyebrow="COHORT"
        :title="t('components.cohortExpressionEditor.cohortEntryEventsText_6', 'Observation Period').value"
        max-width="500"
        @close="showObsPeriodDialog = false"
      >
        <div class="obs-period-dialog-content">
          <div class="obs-period-field">
            <AtlasTextField
              :model-value="observationPeriod.priorDays"
              :label="t('components.cohortExpressionEditor.cohortEntryEventsText_3').value"
              type="number"
              variant="outlined"
              hide-details
              min="0"
              @update:model-value="updateObservationPeriod('priorDays', $event)"
            />
          </div>
          <div class="obs-period-field">
            <AtlasTextField
              :model-value="observationPeriod.postDays"
              :label="t('components.cohortExpressionEditor.cohortEntryEventsText_4').value"
              type="number"
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
        <template #actions>
          <AtlasButton @click="showObsPeriodDialog = false">
            {{ t('common.close', 'Close') }}
          </AtlasButton>
        </template>
      </AtlasDialog>

      <entry-event-card
        v-for="event in events"
        :key="event.id"
        :event="event"
        @update="updateEvent"
        @remove="removeEvent(event.id)"
        @select-concept-set="selectConceptSetForEvent(event.id)"
        @select-concept-set-for-attribute="
          attributeIndex => $emit('select-concept-set-for-attribute', event.id, attributeIndex)
        "
        @select-concept-for-attribute="
          (attributeIndex, domainFilter) =>
            $emit('select-concept-for-attribute', event.id, attributeIndex, domainFilter)
        "
        @edit-concept-set="$emit('edit-concept-set', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasDialog, AtlasIcon, AtlasList, AtlasListItem, AtlasMenu, AtlasTextField } from '@/components/ui'
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
const { t } = useI18n()

const emit = defineEmits<{
  'update:events': [events: CohortEvent[]]
  'update:observation-period': [period: ObservationPeriod]
  'select-concept-set': [eventId: string]
  'select-concept-set-for-attribute': [eventId: string, attributeIndex: number]
  'select-concept-for-attribute': [
    eventId: string,
    attributeIndex: number,
    domainFilter: string | undefined,
  ]
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
    [field]: Number(value) || 0,
  })
}
</script>

<style scoped>
.events-container {
  display: block;
  background: rgb(var(--v-theme-surface));
}

.events-container__body {
  flex: 1;
  padding: 12px 20px 16px;
}

.add-filter-wrapper {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 12px;
  flex-wrap: wrap;
}

.obs-period-chip {
  cursor: pointer;
  font-size: 12px;
  margin-left: auto;
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
