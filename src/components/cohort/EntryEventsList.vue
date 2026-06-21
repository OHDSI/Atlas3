<template>
  <!-- Entry events are an implicit OR. We show a greyed, non-interactive "ANY"
       label (discussion #100) so the match semantics are visible without
       offering a control that doesn't apply to entry events — unlike inclusion
       rules, where the equivalent label is clickable. -->
  <div class="events-container">
    <div class="events-container__layout">
      <div
        class="entry-any-label"
        data-testid="entry-any-label"
        aria-disabled="true"
        :title="t('components.cohortExpressionEditor.entryEventsAnyHint', 'Entry events are matched with ANY (or)').value"
      >
        {{ t('options.any', 'ANY') }}
      </div>
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

          <!-- Continuous-observation pill + anchored popover editor. Clicking the
             pill opens the editor in a menu anchored to it (no page-dimming
             modal), keeping the user in context (discussion #99). Orange/warning
             outlined to match the other timeframe pills. Pushed to the right
             edge via margin-left:auto. -->
          <AtlasMenu
            :close-on-content-click="false"
            location="bottom end"
            offset="8"
          >
            <template #activator="{ props: chipProps }">
              <AtlasChip
                v-bind="chipProps"
                class="obs-period-chip"
                tone="warning"
                variant="outlined"
                size="sm"
              >
                <AtlasIcon
                  start
                  size="small"
                >
                  mdi-clock-outline
                </AtlasIcon>
                <!-- Short version for small screens -->
                <span class="d-md-none">
                  {{ observationPeriod.priorDays }}d / {{ observationPeriod.postDays }}d
                </span>
                <!-- Full version for larger screens -->
                <span class="d-none d-md-inline">
                  {{ t('components.cohortExpressionEditor.continuousObservationLabel', 'Continuous observation') }}:
                  {{ observationPeriod.priorDays }}d {{ t('options.before', 'before') }} ·
                  {{ observationPeriod.postDays }}d {{ t('options.after', 'after') }}
                </span>
              </AtlasChip>
            </template>

            <AtlasCard
              class="obs-period-popover"
              padding="md"
            >
              <div class="obs-period-popover__title">
                <AtlasIcon
                  size="small"
                  class="obs-period-popover__icon"
                >
                  mdi-clock-outline
                </AtlasIcon>
                {{ t('components.cohortExpressionEditor.continuousObservationTitle', 'Continuous observation window') }}
              </div>
              <div class="obs-period-popover__fields">
                <AtlasTextField
                  :model-value="observationPeriod.priorDays"
                  :label="t('components.cohortExpressionEditor.continuousObservationBefore', 'Days before').value"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                  min="0"
                  @update:model-value="updateObservationPeriod('priorDays', $event)"
                />
                <AtlasTextField
                  :model-value="observationPeriod.postDays"
                  :label="t('components.cohortExpressionEditor.continuousObservationAfter', 'Days after').value"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                  min="0"
                  @update:model-value="updateObservationPeriod('postDays', $event)"
                />
              </div>
              <p class="obs-period-popover__help">
                {{ t('components.cohortExpressionEditor.continuousObservationHelp', 'People without this much continuous observation around the index date are excluded from the cohort.') }}
              </p>
            </AtlasCard>
          </AtlasMenu>
        </div>

        <CriteriaEventCard
          v-for="event in events"
          :key="event.id"
          :event="event"
          section="initialEvents"
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
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasCard, AtlasChip, AtlasIcon, AtlasList, AtlasListItem, AtlasMenu, AtlasTextField } from '@/components/ui'
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'
import type { CohortEvent, CriteriaType, ObservationPeriod } from '@/models/cohort.types'
import CriteriaEventCard from '@/components/cohort-builder/CriteriaEventCard.vue'

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
  'select-concept-set-nested': [eventId: string, nestedEventIndex: number]
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

.events-container__layout {
  display: flex;
  align-items: stretch;
}

.events-container__body {
  flex: 1;
  min-width: 0;
  padding: 12px 20px 16px;
}

/* Greyed, non-interactive "ANY" label (discussion #100). Mirrors the
   inclusion-rule vertical match-type label but neutral and not clickable —
   entry events are always an implicit OR. */
.entry-any-label {
  position: relative;
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.5px;
  color: rgb(var(--v-theme-on-surface-variant));
  background: rgb(var(--v-theme-surface-variant), 0.5);
  border-right: 1px solid rgb(var(--v-theme-outline-variant));
  user-select: none;
  cursor: default;
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

/* Anchored popover editor (discussion #99) — replaces the page-dimming modal. */
.obs-period-popover {
  width: 320px;
  max-width: 90vw;
}

.obs-period-popover__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.obs-period-popover__icon {
  color: rgb(var(--v-theme-orange, 230 126 34));
}

.obs-period-popover__fields {
  display: flex;
  gap: 12px;
}

.obs-period-popover__help {
  margin: 12px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
