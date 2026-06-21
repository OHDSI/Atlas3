<template>
  <v-card
    variant="outlined"
    class="criteria-group-editor"
  >
    <v-card-text class="d-flex">
      <!-- Vertical Match Type Label -->
      <AtlasMenu
        v-model="showMatchTypeDialog"
        :close-on-content-click="false"
        location="end"
        @update:model-value="onMenuOpen"
      >
        <template #activator="{ props: menuProps }">
          <div
            class="vertical-label-container"
            v-bind="menuProps"
          >
            <div
              class="vertical-label match-type-label"
              :data-type="localGroup.logicType || 'ALL'"
              title="Click to change match type"
            >
              {{ getMatchTypeDisplay() }}
            </div>
          </div>
        </template>
        <v-card class="match-type-menu">
          <v-card-text class="pa-3">
            <div class="segmented-buttons">
              <AtlasButton
                :variant="matchTypeTemp === 'ALL' ? 'tonal' : 'secondary'"
                :tone="matchTypeTemp === 'ALL' ? undefined : 'neutral'"
                size="sm"
                class="flex-1"
                @click="matchTypeTemp = 'ALL'"
              >
                {{ t('options.all', 'All') }}
              </AtlasButton>
              <AtlasButton
                :variant="matchTypeTemp === 'ANY' ? 'tonal' : 'secondary'"
                :tone="matchTypeTemp === 'ANY' ? undefined : 'neutral'"
                size="sm"
                class="flex-1"
                @click="matchTypeTemp = 'ANY'"
              >
                {{ t('options.any', 'Any') }}
              </AtlasButton>
              <AtlasButton
                :variant="matchTypeTemp === 'AT_LEAST' ? 'tonal' : 'secondary'"
                :tone="matchTypeTemp === 'AT_LEAST' ? undefined : 'neutral'"
                size="sm"
                class="flex-1"
                @click="matchTypeTemp = 'AT_LEAST'"
              >
                {{ t('options.atLeast', 'At least') }}
              </AtlasButton>
              <AtlasButton
                :variant="matchTypeTemp === 'AT_MOST' ? 'tonal' : 'secondary'"
                :tone="matchTypeTemp === 'AT_MOST' ? undefined : 'neutral'"
                size="sm"
                class="flex-1"
                @click="matchTypeTemp = 'AT_MOST'"
              >
                {{ t('options.atMost', 'At most') }}
              </AtlasButton>
            </div>
            <AtlasTextField
              v-if="matchTypeTemp === 'AT_LEAST' || matchTypeTemp === 'AT_MOST'"
              v-model.number="matchTypeCount"
              type="number"
              :label="t('columns.count', 'Count').value"
              min="1"
              class="mt-3"
            />
          </v-card-text>
          <v-card-actions class="pa-2">
            <AtlasSpacer />
            <AtlasButton
              variant="ghost"
              size="sm"
              @click="showMatchTypeDialog = false"
            >
              {{ t('common.cancel', 'Cancel') }}
            </AtlasButton>
            <AtlasButton
              size="sm"
              @click="confirmMatchType"
            >
              {{ t('common.apply', 'OK') }}
            </AtlasButton>
          </v-card-actions>
        </v-card>
      </AtlasMenu>

      <!-- Main Content -->
      <div class="flex-grow-1">
        <!-- Deep-nesting guard (carried over from the nested-criteria editor). -->
        <AtlasAlert
          v-if="depth > 10"
          type="warning"
          density="compact"
          class="mb-2"
          data-testid="depth-warning"
        >
          {{ t('components.nestedCriteria.depthWarning', 'Deep nesting detected') }} ({{ depth }})
        </AtlasAlert>
        <!-- Header with Add Filter and Delete buttons -->
        <div class="group-header">
          <AtlasMenu>
            <template #activator="{ props: slotProps }">
              <AtlasButton
                v-bind="slotProps"
                variant="secondary"
                size="sm"
                icon="mdi-plus"
                data-testid="add-event-to-group"
              >
                {{ t('components.criteriaGroup.addCriteria') }}
              </AtlasButton>
            </template>
            <AtlasList
              density="compact"
              min-width="280"
              max-height="60vh"
            >
              <AtlasTooltip
                v-for="criteriaType in criteriaTypes"
                :key="criteriaType.value"
                :text="criteriaType.description"
                location="end"
                open-delay="500"
              >
                <template #activator="{ props: tipProps }">
                  <AtlasListItem
                    v-bind="tipProps"
                    :title="criteriaType.label"
                    @click="
                      criteriaType.value === 'Group'
                        ? addNestedGroup()
                        : addEvent(criteriaType.value as CriteriaType)
                    "
                  />
                </template>
              </AtlasTooltip>
            </AtlasList>
          </AtlasMenu>

          <AtlasIconButton
            icon="mdi-delete"
            v-bind="{ ariaLabel: 'Remove group' }"
            variant="text"
            tone="primary"
            size="sm"
            @click="$emit('remove')"
          />
        </div>

        <!-- Validation Error -->
        <AtlasAlert
          v-if="validationError"
          severity="danger"
          class="mb-2"
        >
          {{ validationError }}
        </AtlasAlert>

        <!-- Events in Group -->
        <div>
          <div class="d-flex">
            <!-- Events List -->
            <div class="flex-grow-1">
              <div
                v-if="localGroup.events.length > 0"
                class="events-list"
              >
                <div
                  v-for="(event, index) in localGroup.events"
                  :key="event.id"
                  class="mb-2"
                  data-testid="group-event-item"
                >
                  <CriteriaEventCard
                    :event="event"
                    section="criteriaGroup"
                    show-cardinality
                    show-temporal
                    show-criteria-options
                    :depth="depth"
                    @update="onEventUpdate(index, $event)"
                    @remove="removeEvent(index)"
                    @select-concept-set="selectConceptSetForEvent(index)"
                    @edit-concept-set="emit('edit-concept-set', $event)"
                    @select-concept-set-nested="
                      nestedEventIndex => emit('select-concept-set', { eventIndex: index, nestedEventIndex })
                    "
                    @select-concept-set-for-attribute="
                      attributeIndex => selectConceptSetForAttribute(index, attributeIndex)
                    "
                    @select-concept-for-attribute="
                      (attributeIndex, domainFilter) =>
                        selectConceptForAttribute(index, attributeIndex, domainFilter)
                    "
                  />
                </div>
              </div>

              <AtlasAlert
                v-else
                severity="info"
                variant="outlined"
              >
                <div style="color: #666">
                  No events in group. Add events to build criteria logic.
                </div>
              </AtlasAlert>
            </div>
          </div>
        </div>

        <!-- Nested Groups (if any) -->
        <div
          v-if="localGroup.nestedGroups && localGroup.nestedGroups.length > 0"
          class="mt-4"
        >
          <div
            v-for="(nested, idx) in localGroup.nestedGroups"
            :key="nested.id"
            class="nested-group-item"
            data-testid="nested-group"
          >
            <GroupCriteriaUI
              :model-value="nested"
              :depth="depth + 1"
              @update:model-value="updateNestedGroup(idx, $event)"
              @remove="removeNestedGroup(idx)"
            />
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasIconButton, AtlasList, AtlasListItem, AtlasMenu, AtlasSpacer, AtlasTextField, AtlasTooltip } from '@/components/ui'
import { ref, watch, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'
import { useMatchType } from '@/composables/useMatchType'
import CriteriaEventCard from './CriteriaEventCard.vue'
import type {
  CriteriaGroup,
  CohortEvent,
  CriteriaType,
} from '@/models/cohort.types'
import type { Concept } from '@/models/event.types'

// Explicit name: this component references itself recursively (nested groups)
// and tests resolve it by name.
defineOptions({ name: 'GroupCriteriaUI' })

const { t } = useI18n()

interface Props {
  modelValue?: CriteriaGroup
  /** Nesting depth, for indentation and the deep-nesting warning. */
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
})
const emit = defineEmits<{
  'update:modelValue': [value: CriteriaGroup]
  remove: []
  'select-concept-set': [
    context: { eventIndex: number; eventId: string } | { eventIndex: number; nestedEventIndex: number } | number,
  ]
  'edit-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
  'select-concept': [
    context: { eventIndex: number; attributeIndex: number; domainFilter: string | undefined },
  ]
}>()

// Local state
const localGroup = ref<CriteriaGroup>(
  props.modelValue || {
    id: uuidv4(),
    logicType: 'ALL',
    events: [],
  }
)

const validationError = ref('')

// Match type composable
const {
  showMatchTypeDialog,
  matchTypeTemp,
  matchTypeCount,
  getMatchTypeDisplay,
  onMenuOpen,
  confirmMatchType,
} = useMatchType({
  group: localGroup,
  onUpdate: emitUpdate,
})

// Watch for external changes
watch(
  () => props.modelValue,
  newVal => {
    if (newVal) {
      // Deep clone to preserve nested reactivity
      localGroup.value = JSON.parse(JSON.stringify(newVal))
    }
  },
  { deep: true }
)

// Use configuration-driven filter list (supports all 16 filter types)
const { availableFilters } = useFilterConfig(ref('criteriaGroup'))

const criteriaTypes = computed(() => {
  return availableFilters.value.map(filter => ({
    value: filter.criteriaType,
    label: filter.name,
    description: filter.description,
  }))
})

const selectedEventIndex = ref<number | null>(null)
const selectedAttributeIndex = ref<number>(-1)
const selectedConceptDomainFilter = ref<string | undefined>(undefined)

// Methods

function addEvent(criteriaType: CriteriaType) {
  // Create a new event with the selected criteria type
  const newEvent: CohortEvent = {
    id: uuidv4(),
    criteriaType,
    conceptSet: { id: null as unknown as number, name: 'Select concept set...' },
    attributes: [],
    // Allow events outside the observation period by default (discussion #110):
    // the common correlated-criteria use cases (exclusions, complications,
    // post-index drugs) don't require the event to share an observation period.
    ignoreObservationPeriod: true,
  }

  localGroup.value.events.push(newEvent)
  emitUpdate()
}

function removeEvent(index: number) {
  localGroup.value.events.splice(index, 1)
  emitUpdate()
}

// The shared CriteriaEventCard emits the full mutated event (cardinality,
// temporal window, attributes, nested criteria, concept-set clear); replace
// the event at this index and bubble the group update up.
function onEventUpdate(index: number, updatedEvent: CohortEvent) {
  if (!localGroup.value.events[index]) return
  localGroup.value.events[index] = updatedEvent
  emitUpdate()
}

function addNestedGroup() {
  if (!localGroup.value.nestedGroups) {
    localGroup.value.nestedGroups = []
  }

  localGroup.value.nestedGroups.push({
    id: uuidv4(),
    logicType: 'ALL',
    events: [],
  })

  emitUpdate()
}

function updateNestedGroup(index: number, group: CriteriaGroup) {
  if (localGroup.value.nestedGroups) {
    localGroup.value.nestedGroups[index] = group
    emitUpdate()
  }
}

function removeNestedGroup(index: number) {
  if (localGroup.value.nestedGroups) {
    localGroup.value.nestedGroups.splice(index, 1)
    emitUpdate()
  }
}

function emitUpdate() {
  emit('update:modelValue', localGroup.value)
}

function selectConceptSetForEvent(index: number) {
  selectedEventIndex.value = index
  selectedAttributeIndex.value = -1 // Reset attribute index
  emit('select-concept-set', index)
}

function selectConceptSetForAttribute(eventIndex: number, attributeIndex: number) {
  selectedEventIndex.value = eventIndex
  selectedAttributeIndex.value = attributeIndex
  selectedConceptDomainFilter.value = undefined
  emit('select-concept-set', eventIndex)
}

function selectConceptForAttribute(
  eventIndex: number,
  attributeIndex: number,
  domainFilter: string | undefined
) {
  selectedEventIndex.value = eventIndex
  selectedAttributeIndex.value = attributeIndex
  selectedConceptDomainFilter.value = domainFilter
  emit('select-concept', { eventIndex, attributeIndex, domainFilter })
}

// Method to update event's concept set (called by parent)
function updateEventConceptSet(index: number, conceptSet: { id: number; name: string }) {
  if (localGroup.value.events[index]) {
    // Check if we're updating an attribute's concept set or the event's concept set
    if (selectedAttributeIndex.value >= 0) {
      // Update attribute's concept set
      const event = localGroup.value.events[index]
      if (event && event.attributes && event.attributes[selectedAttributeIndex.value]) {
        const attr = event.attributes[selectedAttributeIndex.value]
        if (attr && attr.type === 'conceptSet') {
          event.attributes[selectedAttributeIndex.value] = {
            ...attr,
            conceptSet: conceptSet,
          }
        }
      }
      selectedAttributeIndex.value = -1 // Reset after update
    } else {
      // Update event's concept set
      localGroup.value.events[index].conceptSet = conceptSet
    }
    emitUpdate()
  }
}

// Method to update concept attribute (called by parent)
function updateConceptAttribute(index: number, concepts: Concept[]) {
  if (localGroup.value.events[index]) {
    const event = localGroup.value.events[index]
    if (event && event.attributes && selectedAttributeIndex.value >= 0) {
      const attr = event.attributes[selectedAttributeIndex.value]
      if (attr && attr.type === 'concept') {
        // Dedupe by CONCEPT_ID — adding "MALE" twice has no semantic
        // value (circe treats `Gender IN (8507, 8507)` identically to
        // a single 8507) and the chip UI shows duplicate pills.
        const existingConcepts = attr.concepts || []
        const seen = new Set(existingConcepts.map(c => c.CONCEPT_ID))
        const merged = [...existingConcepts]
        for (const c of concepts) {
          if (!seen.has(c.CONCEPT_ID)) {
            merged.push(c)
            seen.add(c.CONCEPT_ID)
          }
        }
        event.attributes[selectedAttributeIndex.value] = {
          ...attr,
          concepts: merged,
        }
      }
      selectedAttributeIndex.value = -1 // Reset after update
      selectedConceptDomainFilter.value = undefined
      emitUpdate()
    }
  }
}

// Expose methods for parent to call
defineExpose({
  updateEventConceptSet,
  updateConceptAttribute,
})
</script>

<style scoped>
.criteria-group-editor {
  margin-bottom: 16px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.nested-group-item {
  margin-bottom: 12px;
}

.vertical-label-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  margin-left: -16px;
  margin-top: -16px;
  margin-bottom: -16px;
  width: 30px;
  position: relative;
  border-radius: 0 0 0 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vertical-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-weight: 700;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding-left: 8px;
  position: relative;
  z-index: 1;
  cursor: pointer;
  width: 100%;
  text-align: center;
}

.match-type-label {
  font-size: 14px;
}

/* ALL - Navy */
.vertical-label-container:has(.match-type-label[data-type='ALL']) {
  border: 1px solid #1f425a;
}
.vertical-label-container:has(.match-type-label[data-type='ALL'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #1f425a;
  border-radius: 0 0 0 6px;
}
.match-type-label[data-type='ALL'] {
  color: #1f425a;
}

/* ANY - Orange */
.vertical-label-container:has(.match-type-label[data-type='ANY']) {
  border: 1px solid #eb6622;
}
.vertical-label-container:has(.match-type-label[data-type='ANY'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #eb6622;
  border-radius: 0 0 0 6px;
}
.match-type-label[data-type='ANY'] {
  color: #eb6622;
}

/* AT_LEAST - Light Blue */
.vertical-label-container:has(.match-type-label[data-type='AT_LEAST']) {
  border: 1px solid #69aed5;
}
.vertical-label-container:has(.match-type-label[data-type='AT_LEAST'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #69aed5;
  border-radius: 0 0 0 6px;
}
.match-type-label[data-type='AT_LEAST'] {
  color: #69aed5;
}

/* AT_MOST - Darker Blue */
.vertical-label-container:has(.match-type-label[data-type='AT_MOST']) {
  border: 1px solid #336b91;
}
.vertical-label-container:has(.match-type-label[data-type='AT_MOST'])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #336b91;
  border-radius: 0 0 0 6px;
}
.match-type-label[data-type='AT_MOST'] {
  color: #336b91;
}

.cardinality-label {
  font-size: 10px;
  color: #69aed5;
  border: 1px solid #69aed5;
}

.vertical-label-container:has(.cardinality-label)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #69aed5;
  border-radius: 0 0 0 6px;
}

.segmented-buttons {
  display: flex;
  gap: 4px;
}

.flex-1 {
  flex: 1;
}

.cardinality-menu,
.match-type-menu {
  min-width: 350px;
}

/* Criteria Event Card with Cardinality Sidebar */
.criteria-event-card {
  display: flex;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.criteria-event-card .cardinality-sidebar {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  border-right: 1px solid #1f425a;
}

.criteria-event-card .cardinality-at_least {
  background: linear-gradient(to right, #1f425a 30%, #ebf2fa 30%);
}

.criteria-event-card .cardinality-exactly {
  background: linear-gradient(to right, #2e7d32 30%, #e8f5e9 30%);
}

.criteria-event-card .cardinality-at_most {
  background: linear-gradient(to right, #c62828 30%, #ffebee 30%);
}

.criteria-event-card .cardinality-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-size: 13px;
  font-weight: 600;
  color: #1f425a;
  position: relative;
  z-index: 1;
  white-space: nowrap;
  border: none;
  padding-left: 8px;
}

.criteria-event-card .cardinality-exactly .cardinality-label {
  color: #2e7d32;
}

.criteria-event-card .cardinality-at_most .cardinality-label {
  color: #c62828;
}

.criteria-event-card .event-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.criteria-event-card .event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.criteria-event-card .event-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.criteria-event-card .event-type-label {
  font-size: 14px;
  font-weight: 600;
  color: #1f425a;
}

.criteria-event-card .event-body {
  padding: 16px;
}

.criteria-event-card .concept-temporal-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.criteria-event-card .concept-set-section {
  flex: 0 0 auto;
}

.criteria-event-card .temporal-window-section {
  flex: 0 0 auto;
}

.criteria-event-card .attributes-section {
  margin-top: 16px;
}
</style>
