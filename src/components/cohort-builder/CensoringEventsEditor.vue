<template>
  <div class="censoring-events-editor">
    <div class="censoring-events-editor__body">
      <!-- Header: eyebrow + accent rule + description -->
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

      <!-- Add Censoring Event button with dropdown menu -->
      <div class="mt-4">
        <AtlasMenu>
          <template #activator="{ props: slotProps }">
            <AtlasButton
              v-bind="slotProps"
              variant="secondary"
              icon="mdi-plus"
              size="sm"
              :disabled="disabled"
              data-testid="add-censoring-event"
            >
              {{ t('components.cohortExpressionEditor.addCensoringEvent', 'Add Censoring Event').value }}
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
      </div>

      <!-- Event list using CriteriaEventCard v-for (same pattern as EntryEventsList) -->
      <div
        v-if="modelValue.length > 0"
        class="events-list mt-4"
      >
        <CriteriaEventCard
          v-for="event in modelValue"
          :key="event.id"
          :event="event"
          section="censoringEvents"
          @update="updateEvent"
          @remove="removeEvent(event.id)"
          @select-concept-set="selectConceptSetForEvent(event.id)"
          @select-concept-set-nested="
            nestedEventIndex => emit('select-concept-set-nested', event.id, nestedEventIndex)
          "
          @select-concept-set-for-attribute="
            attributeIndex => $emit('select-concept-set-for-attribute', event.id, attributeIndex)
          "
          @select-concept-for-attribute="
            (attributeIndex, domainFilter) =>
              $emit('select-concept-for-attribute', event.id, attributeIndex, domainFilter)
          "
          @edit-concept-set="$emit('edit-concept-set', $event)"
          @select-source-concept="$emit('select-source-concept', event.id)"
        />
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="censoring-events__hint mt-4"
      >
        <AtlasIcon
          icon="mdi-information-outline"
          size="16"
          class="censoring-events__hint-icon"
        />
        <span>{{
          t(
            'components.censoringEventsEditor.noEventsHint',
            'No censoring events defined. Cohort membership will not be affected by additional events.'
          ).value
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'
import type { CohortEvent, CriteriaType } from '@/models/cohort.types'
import CriteriaEventCard from '@/components/cohort-builder/CriteriaEventCard.vue'

interface Props {
  modelValue: CohortEvent[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const { t } = useI18n()

// Get available filters for censoring events section
const { availableFilters } = useFilterConfig(ref('censoringEvents'))

const emit = defineEmits<{
  'update:modelValue': [value: CohortEvent[]]
  'select-concept-set-nested': [eventId: string, nestedEventIndex: number]
  'select-concept-set-for-attribute': [eventId: string, attributeIndex: number]
  'select-concept-for-attribute': [
    eventId: string,
    attributeIndex: number,
    domainFilter: string | undefined,
  ]
  'edit-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
  'select-source-concept': [eventId: string]
}>()

/**
 * Handle criteria type selection from dropdown menu
 * Creates a new censoring event with the selected criteria type
 */
function handleFilterTypeSelected(filterType: string) {
  if (!filterType) return

  const newEvent: CohortEvent = {
    id: uuidv4(),
    criteriaType: filterType as CriteriaType,
    attributes: [],
  }

  emit('update:modelValue', [...props.modelValue, newEvent])
}

/**
 * Update existing censoring event
 */
function updateEvent(updatedEvent: CohortEvent) {
  const index = props.modelValue.findIndex(e => e.id === updatedEvent.id)
  if (index === -1) return

  const newEvents = [...props.modelValue]
  newEvents[index] = updatedEvent
  emit('update:modelValue', newEvents)
}

/**
 * Remove censoring event by ID
 */
function removeEvent(eventId: string) {
  emit('update:modelValue', props.modelValue.filter(e => e.id !== eventId))
}

/**
 * Delegate concept set selection to parent
 * Parent (ExitCriteriaPanel/CohortBuilder) listens for CriteriaEventCard event
 * and opens the concept set modal via context tracking
 */
function selectConceptSetForEvent(_eventId: string) {
  // Event is forwarded from CriteriaEventCard; parent handles modal
}
</script>


<style scoped>
.censoring-events-editor {
  display: block;
  background: rgb(var(--v-theme-surface));
}

.censoring-events-editor__body {
  padding: 12px 20px 16px;
}

.censoring-events-editor__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.text-eyebrow {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgb(var(--v-theme-primary));
}

.censoring-events-editor__heading-rule {
  flex: 1;
  height: 1px;
  background: rgb(var(--v-theme-outline-variant));
}

.censoring-events-editor__lede {
  margin: 0 0 16px;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.censoring-events__hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 4px;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.censoring-events__hint-icon {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>

