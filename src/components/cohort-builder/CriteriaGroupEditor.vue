<template>
  <v-card
    variant="outlined"
    class="criteria-group-editor"
  >
    <v-card-text class="d-flex">
      <!-- Vertical Match Type Label -->
      <v-menu
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
              <v-btn
                :variant="matchTypeTemp === 'ALL' ? 'tonal' : 'outlined'"
                :color="matchTypeTemp === 'ALL' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="matchTypeTemp = 'ALL'"
              >
                {{ t('common.all', 'All') }}
              </v-btn>
              <v-btn
                :variant="matchTypeTemp === 'ANY' ? 'tonal' : 'outlined'"
                :color="matchTypeTemp === 'ANY' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="matchTypeTemp = 'ANY'"
              >
                {{ t('common.any', 'Any') }}
              </v-btn>
              <v-btn
                :variant="matchTypeTemp === 'AT_LEAST' ? 'tonal' : 'outlined'"
                :color="matchTypeTemp === 'AT_LEAST' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="matchTypeTemp = 'AT_LEAST'"
              >
                {{ t('common.atLeast', 'At least') }}
              </v-btn>
              <v-btn
                :variant="matchTypeTemp === 'AT_MOST' ? 'tonal' : 'outlined'"
                :color="matchTypeTemp === 'AT_MOST' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="matchTypeTemp = 'AT_MOST'"
              >
                {{ t('common.atMost', 'At most') }}
              </v-btn>
            </div>
            <v-text-field
              v-if="matchTypeTemp === 'AT_LEAST' || matchTypeTemp === 'AT_MOST'"
              v-model.number="matchTypeCount"
              type="number"
              :label="t('common.count', 'Count').value"
              min="1"
              density="compact"
              class="mt-3"
            />
          </v-card-text>
          <v-card-actions class="pa-2">
            <v-spacer />
            <v-btn
              variant="text"
              size="small"
              @click="showMatchTypeDialog = false"
            >
              {{ t('common.cancel', 'Cancel') }}
            </v-btn>
            <v-btn
              color="primary"
              size="small"
              @click="confirmMatchType"
            >
              {{ t('common.ok', 'OK') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>

      <!-- Main Content -->
      <div class="flex-grow-1">
        <!-- Header with Add Filter and Delete buttons -->
        <div class="group-header">
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                variant="outlined"
                prepend-icon="mdi-plus"
                size="small"
                data-testid="add-event-to-group"
              >
                Add Filter
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="criteriaType in criteriaTypes"
                :key="criteriaType.value"
                :title="criteriaType.label"
                @click="addEvent(criteriaType.value as CriteriaType)"
              />
            </v-list>
          </v-menu>

          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="primary"
            @click="$emit('remove')"
          />
        </div>

        <!-- Validation Error -->
        <v-alert
          v-if="validationError"
          type="error"
          class="mb-2"
        >
          {{ validationError }}
        </v-alert>

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
                  class="criteria-event-card mb-2"
                  data-testid="group-event-item"
                >
                  <!-- Cardinality Sidebar with Menu -->
                  <v-menu
                    :close-on-content-click="false"
                    location="end"
                  >
                    <template #activator="{ props: menuProps }">
                      <div
                        class="cardinality-sidebar"
                        :class="`cardinality-${getCardinalityType(event)}`"
                        v-bind="menuProps"
                        title="Click to change cardinality"
                      >
                        <div class="cardinality-label">
                          {{ getCardinalityDisplayForEvent(event) }}
                        </div>
                      </div>
                    </template>
                    <v-card class="cardinality-menu">
                      <v-card-text class="pa-3">
                        <div class="segmented-buttons">
                          <v-btn
                            :variant="getCardinalityType(event) === 'at_least' ? 'tonal' : 'outlined'"
                            :color="getCardinalityType(event) === 'at_least' ? 'primary' : undefined"
                            size="small"
                            class="flex-1"
                            @click="updateEventCardinality(index, 'AT_LEAST', event.cardinality?.count || 1)"
                          >
                            At least
                          </v-btn>
                          <v-btn
                            :variant="getCardinalityType(event) === 'exactly' ? 'tonal' : 'outlined'"
                            :color="getCardinalityType(event) === 'exactly' ? 'primary' : undefined"
                            size="small"
                            class="flex-1"
                            @click="updateEventCardinality(index, 'EXACTLY', event.cardinality?.count || 1)"
                          >
                            Exactly
                          </v-btn>
                          <v-btn
                            :variant="getCardinalityType(event) === 'at_most' ? 'tonal' : 'outlined'"
                            :color="getCardinalityType(event) === 'at_most' ? 'primary' : undefined"
                            size="small"
                            class="flex-1"
                            @click="updateEventCardinality(index, 'AT_MOST', event.cardinality?.count || 1)"
                          >
                            At most
                          </v-btn>
                        </div>
                        <v-text-field
                          :model-value="event.cardinality?.count || 1"
                          type="number"
                          label="Count"
                          min="1"
                          density="compact"
                          class="mt-3"
                          @update:model-value="updateEventCardinalityCount(index, Number($event))"
                        />
                      </v-card-text>
                    </v-card>
                  </v-menu>

                  <!-- Event Content -->
                  <div class="event-content">
                    <!-- Event Header -->
                    <div class="event-header">
                      <div class="event-type-label">
                        {{ getEventTypeLabel(event.criteriaType) }}
                      </div>
                      <v-btn
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        color="primary"
                        data-testid="remove-event-from-group"
                        @click="removeEvent(index)"
                      />
                    </div>

                    <!-- Event Body -->
                    <div class="event-body">
                      <!-- Concept Set Picker -->
                      <div class="concept-set-section">
                        <v-btn
                          v-if="!event.conceptSet || event.conceptSet.id === 0"
                          color="primary"
                          variant="outlined"
                          size="small"
                          data-testid="concept-set-picker"
                          @click="selectConceptSetForEvent(index)"
                        >
                          <v-icon class="mr-2">
                            mdi-plus
                          </v-icon>
                          Select Concept Set
                        </v-btn>
                        <v-chip
                          v-else
                          closable
                          color="primary"
                          data-testid="selected-concept-set"
                          style="cursor: pointer;"
                          @click="emit('edit-concept-set', event.conceptSet)"
                          @click:close="clearConceptSet(index)"
                        >
                          {{ event.conceptSet.name }}
                        </v-chip>
                      </div>

                      <!-- Temporal Window Display/Editor -->
                      <div class="temporal-window-section mt-2">
                        <v-menu
                          v-if="event.temporalWindow"
                          :close-on-content-click="false"
                          location="end"
                        >
                          <template #activator="{ props: menuProps }">
                            <v-chip
                              size="small"
                              color="secondary"
                              variant="tonal"
                              v-bind="menuProps"
                              style="cursor: pointer;"
                              closable
                              @click:close="removeTemporalWindow(index)"
                            >
                              <v-icon
                                start
                                size="small"
                              >
                                mdi-calendar-range
                              </v-icon>
                              {{ formatTemporalWindowDisplay(event.temporalWindow) }}
                            </v-chip>
                          </template>
                          <v-card
                            class="temporal-window-menu"
                            style="min-width: 500px;"
                          >
                            <v-card-text class="pa-3">
                              <TemporalWindowEditor
                                :model-value="event.temporalWindow"
                                @update:model-value="updateEventTemporalWindow(index, $event)"
                              />
                            </v-card-text>
                          </v-card>
                        </v-menu>
                        <v-btn
                          v-else
                          size="small"
                          variant="outlined"
                          prepend-icon="mdi-calendar-range"
                          @click="addTemporalWindow(index)"
                        >
                          Add Temporal Window
                        </v-btn>
                      </div>

                      <!-- Attributes Section -->
                      <div class="attributes-section mt-3">
                        <AttributesEditor
                          :model-value="event.attributes || []"
                          :criteria-type="event.criteriaType"
                          @update:model-value="updateEventAttributes(index, $event)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <v-alert
                v-else
                color="grey-lighten-4"
                variant="outlined"
              >
                <div style="color: #666;">
                  No events in group. Add events to build criteria logic.
                </div>
              </v-alert>
            </div>
          </div>
        </div>

        <!-- Nested Groups (if any) -->
        <div
          v-if="localGroup.nestedGroups && localGroup.nestedGroups.length > 0"
          class="mt-4"
        >
          <div class="text-subtitle-2 mb-2">
            Nested Groups
          </div>
          <div
            v-for="(nested, idx) in localGroup.nestedGroups"
            :key="nested.id"
            class="nested-group-item"
            data-testid="nested-group"
          >
            <CriteriaGroupEditor
              :model-value="nested"
              @update:model-value="updateNestedGroup(idx, $event)"
              @remove="removeNestedGroup(idx)"
            />
          </div>
        </div>

        <!-- Add Nested Group Button -->
        <v-btn
          class="mt-2"
          variant="outlined"
          prepend-icon="mdi-folder-plus"
          data-testid="add-nested-group"
          @click="addNestedGroup"
        >
          Add Nested Group
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import type { CriteriaGroup, CohortEvent, LogicType, CriteriaType } from '@/models/cohort.types'
import type { EventAttribute, TemporalWindow } from '@/models/event.types'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import AttributesEditor from './AttributesEditor.vue'
import TemporalWindowEditor from './TemporalWindowEditor.vue'

const { t } = useI18n()

interface Props {
  modelValue?: CriteriaGroup
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: CriteriaGroup]
  'remove': []
  'select-concept-set': [eventIndex: number]
  'edit-concept-set': [conceptSet: any]
}>()

// Composables
const { formatTemporalWindowDisplay } = useTemporalWindows()

// Local state
const localGroup = ref<CriteriaGroup>(props.modelValue || {
  id: uuidv4(),
  logicType: 'ALL',
  events: [],
})

const validationError = ref('')
const showMatchTypeDialog = ref(false)
const matchTypeTemp = ref('ALL')
const matchTypeCount = ref(1)

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localGroup.value = { ...newVal }
  }
}, { deep: true })

// Criteria types for event type selector
const criteriaTypes = [
  { value: 'ConditionOccurrence', label: 'Condition Occurrence' },
  { value: 'DrugExposure', label: 'Drug Exposure' },
  { value: 'ProcedureOccurrence', label: 'Procedure Occurrence' },
  { value: 'Measurement', label: 'Measurement' },
  { value: 'Observation', label: 'Observation' },
  { value: 'DeviceExposure', label: 'Device Exposure' },
  { value: 'VisitOccurrence', label: 'Visit Occurrence' },
  { value: 'Death', label: 'Death' },
  { value: 'Specimen', label: 'Specimen' },
  { value: 'DrugEra', label: 'Drug Era' },
  { value: 'ConditionEra', label: 'Condition Era' },
  { value: 'DoseEra', label: 'Dose Era' },
]

const selectedEventIndex = ref<number | null>(null)

// Methods

function getEventTypeLabel(criteriaType: string): string {
  const type = criteriaTypes.find(t => t.value === criteriaType)
  return type?.label || criteriaType
}

function addEvent(criteriaType: CriteriaType) {
  // Create a new event with the selected criteria type
  const newEvent: CohortEvent = {
    id: uuidv4(),
    criteriaType,
    conceptSet: { id: 0, name: 'Select concept set...' },
    attributes: [],
  }

  localGroup.value.events.push(newEvent)
  emitUpdate()
}

function removeEvent(index: number) {
  localGroup.value.events.splice(index, 1)
  emitUpdate()
}

function updateEventAttributes(index: number, attributes: EventAttribute[]) {
  const event = localGroup.value.events[index]
  if (event) {
    event.attributes = attributes
    emitUpdate()
  }
}

function addTemporalWindow(index: number) {
  const event = localGroup.value.events[index]
  if (event) {
    event.temporalWindow = {
      startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
      endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
    }
    emitUpdate()
  }
}

function updateEventTemporalWindow(index: number, temporalWindow: TemporalWindow) {
  const event = localGroup.value.events[index]
  if (event) {
    event.temporalWindow = temporalWindow
    emitUpdate()
  }
}

function removeTemporalWindow(index: number) {
  const event = localGroup.value.events[index]
  if (event) {
    delete event.temporalWindow
    emitUpdate()
  }
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
  emit('select-concept-set', index)
}

function clearConceptSet(index: number) {
  if (localGroup.value.events[index]) {
    localGroup.value.events[index].conceptSet = { id: 0, name: 'Select concept set...' }
    emitUpdate()
  }
}

// Method to update event's concept set (called by parent)
function updateEventConceptSet(index: number, conceptSet: { id: number; name: string }) {
  if (localGroup.value.events[index]) {
    localGroup.value.events[index].conceptSet = conceptSet
    emitUpdate()
  }
}

// Display helpers
function getMatchTypeDisplay(): string {
  switch (localGroup.value.logicType) {
    case 'ALL': return t('common.all', 'All').value
    case 'ANY': return t('common.any', 'Any').value
    case 'AT_LEAST': return `${t('common.atLeast', 'At least').value} ${localGroup.value.count || 1}`
    case 'AT_MOST': return `${t('common.atMost', 'At most').value} ${localGroup.value.count || 1}`
    default: return t('common.all', 'All').value
  }
}

function onMenuOpen(isOpen: boolean) {
  if (isOpen) {
    matchTypeTemp.value = localGroup.value.logicType || 'ALL'
    matchTypeCount.value = localGroup.value.count || 1
  }
}

function confirmMatchType() {
  localGroup.value.logicType = matchTypeTemp.value as LogicType
  if (matchTypeTemp.value === 'AT_LEAST' || matchTypeTemp.value === 'AT_MOST') {
    localGroup.value.count = matchTypeCount.value
  } else {
    delete localGroup.value.count
  }
  showMatchTypeDialog.value = false
  emitUpdate()
}

function getCardinalityType(event: CohortEvent): string {
  if (!event.cardinality) return 'at_least'
  return event.cardinality.type.toLowerCase()
}

function getCardinalityDisplayForEvent(event: CohortEvent): string {
  if (!event.cardinality) return `${t('common.atLeast', 'At least').value} 1`
  const typeMap: Record<string, string> = {
    'AT_LEAST': t('common.atLeast', 'At least').value,
    'EXACTLY': t('common.exactly', 'Exactly').value,
    'AT_MOST': t('common.atMost', 'At most').value
  }
  const type = typeMap[event.cardinality.type] || t('common.atLeast', 'At least').value
  return `${type} ${event.cardinality.count ?? 1}`
}

function updateEventCardinality(index: number, type: string, count: number) {
  const event = localGroup.value.events[index]
  if (event) {
    event.cardinality = {
      type: type as 'AT_LEAST' | 'EXACTLY' | 'AT_MOST',
      count: count,
      countingMethod: 'ALL'
    }
    emitUpdate()
  }
}

function updateEventCardinalityCount(index: number, count: number) {
  const event = localGroup.value.events[index]
  if (event && event.cardinality) {
    event.cardinality.count = count
    emitUpdate()
  }
}

// Expose method for parent to call
defineExpose({
  updateEventConceptSet,
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
  margin-left: 24px;
  margin-bottom: 12px;
  border-left: 3px solid #1976d2;
  padding-left: 12px;
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
.vertical-label-container:has(.match-type-label[data-type="ALL"]) {
  border: 1px solid #1f425a;
}
.vertical-label-container:has(.match-type-label[data-type="ALL"])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #1f425a;
  border-radius: 0 0 0 6px;
}
.match-type-label[data-type="ALL"] {
  color: #1f425a;
}

/* ANY - Orange */
.vertical-label-container:has(.match-type-label[data-type="ANY"]) {
  border: 1px solid #eb6622;
}
.vertical-label-container:has(.match-type-label[data-type="ANY"])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #eb6622;
  border-radius: 0 0 0 6px;
}
.match-type-label[data-type="ANY"] {
  color: #eb6622;
}

/* AT_LEAST - Light Blue */
.vertical-label-container:has(.match-type-label[data-type="AT_LEAST"]) {
  border: 1px solid #69aed5;
}
.vertical-label-container:has(.match-type-label[data-type="AT_LEAST"])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #69aed5;
  border-radius: 0 0 0 6px;
}
.match-type-label[data-type="AT_LEAST"] {
  color: #69aed5;
}

/* AT_MOST - Darker Blue */
.vertical-label-container:has(.match-type-label[data-type="AT_MOST"]) {
  border: 1px solid #336b91;
}
.vertical-label-container:has(.match-type-label[data-type="AT_MOST"])::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #336b91;
  border-radius: 0 0 0 6px;
}
.match-type-label[data-type="AT_MOST"] {
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

.criteria-event-card .event-type-label {
  font-size: 14px;
  font-weight: 600;
  color: #1f425a;
}

.criteria-event-card .event-body {
  padding: 16px;
}

.criteria-event-card .concept-set-section {
  margin-bottom: 16px;
}

.criteria-event-card .attributes-section {
  margin-top: 16px;
}
</style>

