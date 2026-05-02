<template>
  <v-card
    variant="outlined"
    class="nested-criteria-editor"
    :style="{ marginLeft: `${depth * 16}px` }"
  >
    <v-card-text class="d-flex">
      <!-- Vertical Logic Type Label -->
      <v-menu
        v-model="showLogicTypeMenu"
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
              :data-type="localNested.logicType"
              :title="
                t('components.nestedCriteria.clickToChange', 'Click to change logic type').value
              "
            >
              {{ getLogicTypeDisplay() }}
            </div>
          </div>
        </template>
        <v-card class="match-type-menu">
          <v-card-text class="pa-3">
            <div class="segmented-buttons">
              <v-btn
                :variant="tempLogicType === 'ALL' ? 'tonal' : 'outlined'"
                :color="tempLogicType === 'ALL' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="tempLogicType = 'ALL'"
              >
                {{ t('options.all', 'All') }}
              </v-btn>
              <v-btn
                :variant="tempLogicType === 'ANY' ? 'tonal' : 'outlined'"
                :color="tempLogicType === 'ANY' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="tempLogicType = 'ANY'"
              >
                {{ t('options.any', 'Any') }}
              </v-btn>
              <v-btn
                :variant="tempLogicType === 'AT_LEAST' ? 'tonal' : 'outlined'"
                :color="tempLogicType === 'AT_LEAST' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="tempLogicType = 'AT_LEAST'"
              >
                {{ t('options.atLeast', 'At least') }}
              </v-btn>
              <v-btn
                :variant="tempLogicType === 'AT_MOST' ? 'tonal' : 'outlined'"
                :color="tempLogicType === 'AT_MOST' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="tempLogicType = 'AT_MOST'"
              >
                {{ t('options.atMost', 'At most') }}
              </v-btn>
            </div>
            <v-text-field
              v-if="tempLogicType === 'AT_LEAST' || tempLogicType === 'AT_MOST'"
              v-model.number="tempCount"
              type="number"
              :label="t('columns.count', 'Count').value"
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
              @click="showLogicTypeMenu = false"
            >
              {{ t('common.cancel', 'Cancel') }}
            </v-btn>
            <v-btn
              color="primary"
              size="small"
              @click="confirmLogicType"
            >
              {{ t('common.apply', 'OK') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-menu>

      <!-- Main Content -->
      <div class="flex-grow-1">
        <!-- Depth Warning -->
        <v-alert
          v-if="depth > 10"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          <v-icon>mdi-alert</v-icon>
          {{ t('components.nestedCriteria.depthWarning', 'Deep nesting detected') }} ({{ depth }}
          {{ t('common.levels', 'levels') }}).
          {{
            t(
              'components.nestedCriteria.simplifyStructure',
              'Consider simplifying your criteria structure.'
            )
          }}
        </v-alert>

        <!-- Header with Add Criteria and Delete buttons -->
        <div class="group-header d-flex align-center mb-2">
          <v-menu>
            <template #activator="{ props: slotProps }">
              <v-btn
                v-bind="slotProps"
                variant="outlined"
                prepend-icon="mdi-plus"
                size="small"
                data-testid="add-criteria-to-nested-group"
              >
                {{ t('components.criteriaGroup.addCriteria', 'Add Criteria') }}
              </v-btn>
            </template>
            <v-list>
              <v-list-item
                v-for="criteriaType in criteriaTypes"
                :key="criteriaType.value"
                :title="criteriaType.label"
                :subtitle="criteriaType.description"
                @click="addCriteria(criteriaType.value as CriteriaType)"
              />
            </v-list>
          </v-menu>

          <v-spacer />

          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            :title="t('components.criteriaGroup.deleteGroup', 'Delete nested group').value"
            @click="$emit('remove')"
          />
        </div>

        <!-- Empty State -->
        <v-alert
          v-if="localNested.events.length === 0"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-2"
        >
          {{
            t(
              'components.nestedCriteria.noEvents',
              'No events in this group. Click "Add Criteria" to begin.'
            )
          }}
        </v-alert>

        <!-- Events List -->
        <div
          v-if="localNested.events.length > 0"
          class="events-list"
        >
          <div
            v-for="(event, index) in localNested.events"
            :key="event.id"
            class="event-card mb-2"
          >
            <v-card
              variant="outlined"
              class="pa-2"
            >
              <div class="d-flex align-start">
                <div class="flex-grow-1">
                  <!-- Event Type Header -->
                  <div class="d-flex align-center mb-2">
                    <v-chip
                      size="small"
                      color="primary"
                      variant="tonal"
                    >
                      {{ formatEventType(event.criteriaType) }}
                    </v-chip>
                    <v-spacer />
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      variant="text"
                      @click="removeCriteria(index)"
                    />
                  </div>

                  <!-- Concept Set Picker -->
                  <div class="mb-2">
                    <v-btn
                      variant="outlined"
                      size="small"
                      prepend-icon="mdi-text-box-search"
                      block
                      @click="selectConceptSet(index, event.id)"
                    >
                      {{
                        event.conceptSet?.name ||
                          t('components.conceptAddBox.selectConceptSet', 'Select concept set...')
                      }}
                    </v-btn>
                  </div>

                  <!-- Cardinality -->
                  <div class="mb-2">
                    <v-select
                      :model-value="event.cardinality?.type || 'AT_LEAST'"
                      :label="t('components.nestedCriteria.occurrences', 'Occurrences').value"
                      :items="cardinalityTypes"
                      density="compact"
                      @update:model-value="updateCardinality(index, $event)"
                    />
                    <v-text-field
                      v-if="event.cardinality?.type !== 'EXACTLY' || true"
                      :model-value="event.cardinality?.count || 1"
                      type="number"
                      :label="t('columns.count', 'Count').value"
                      density="compact"
                      min="1"
                      class="mt-1"
                      @update:model-value="updateCardinalityCount(index, parseInt($event))"
                    />
                  </div>

                  <!-- Temporal Window Toggle -->
                  <div class="mb-2">
                    <v-switch
                      :model-value="!!event.temporalWindow"
                      :label="
                        t('components.nestedCriteria.addTemporalWindow', 'Add temporal window')
                          .value
                      "
                      density="compact"
                      color="primary"
                      hide-details
                      @update:model-value="toggleTemporalWindow(index, !!$event)"
                    />
                  </div>

                  <!-- Temporal Window Editor (if enabled) -->
                  <TemporalWindowEditor
                    v-if="event.temporalWindow"
                    :model-value="event.temporalWindow"
                    class="mt-2"
                    @update:model-value="updateTemporalWindow(index, $event)"
                  />

                  <!-- Attributes Toggle -->
                  <div class="mb-2">
                    <v-switch
                      :model-value="event.attributes && event.attributes.length > 0"
                      :label="t('components.common.addAttribute', 'Add attributes').value"
                      density="compact"
                      color="primary"
                      hide-details
                      @update:model-value="toggleAttributes(index, !!$event)"
                    />
                  </div>

                  <!-- Attributes Editor (if enabled) -->
                  <AttributesEditor
                    v-if="event.attributes && event.attributes.length > 0"
                    :model-value="event.attributes"
                    :criteria-type="event.criteriaType"
                    class="mt-2"
                    @update:model-value="updateAttributes(index, $event)"
                  />

                  <!-- Nested Criteria Toggle -->
                  <div class="mb-2">
                    <v-switch
                      :model-value="!!event.nestedCriteria"
                      :label="
                        t('components.nestedCriteria.addNestedGroup', 'Add nested group').value
                      "
                      density="compact"
                      color="primary"
                      hide-details
                      :disabled="depth >= 10"
                      @update:model-value="toggleNestedCriteria(index, !!$event)"
                    />
                  </div>

                  <!-- Recursive Nested Criteria -->
                  <NestedCriteriaEditor
                    v-if="event.nestedCriteria"
                    :key="`nested-${event.id}-${event.nestedCriteria.id}`"
                    :model-value="event.nestedCriteria"
                    :depth="depth + 1"
                    class="mt-2"
                    @update:model-value="updateNestedCriteria(index, $event)"
                    @remove="removeNestedCriteria(index)"
                    @select-concept-set="$emit('select-concept-set', $event)"
                  />
                </div>
              </div>
            </v-card>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineOptions } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'
import type {
  NestedCriteria,
  CohortEvent,
  CriteriaType,
  LogicType,
  TemporalWindow,
  EventAttribute,
} from '@/models/cohort.types'
import type { CardinalityType } from '@/models/event.types'
import TemporalWindowEditor from './TemporalWindowEditor.vue'
import AttributesEditor from './AttributesEditor.vue'

// Define component name for recursive reference
defineOptions({
  name: 'NestedCriteriaEditor',
})

interface Props {
  modelValue: NestedCriteria
  depth?: number
}

interface Emits {
  (e: 'update:modelValue', value: NestedCriteria): void
  (e: 'select-concept-set', context: { eventIndex: number; eventId: string }): void
  (e: 'remove'): void
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
})

const emit = defineEmits<Emits>()

const { t, tv } = useI18n()
const { availableFilters } = useFilterConfig(ref('criteriaGroup'))

// Local state - deep clone the model value to avoid reactivity issues
const localNested = ref<NestedCriteria>({
  id: props.modelValue.id,
  logicType: props.modelValue.logicType,
  count: props.modelValue.count,
  events: props.modelValue.events.map(e => ({ ...e })),
})
const showLogicTypeMenu = ref(false)
const tempLogicType = ref<LogicType>(props.modelValue.logicType)
const tempCount = ref<number>(props.modelValue.count || 1)

// Computed
const criteriaTypes = computed(() => {
  return availableFilters.value.map(filter => ({
    value: filter.criteriaType,
    label: filter.name,
    description: filter.description,
  }))
})

const cardinalityTypes = computed(() => [
  { value: 'AT_LEAST', title: t('options.atLeast', 'At least') },
  { value: 'EXACTLY', title: t('options.exactly', 'Exactly') },
  { value: 'AT_MOST', title: t('options.atMost', 'At most') },
])

// Watch for external changes
watch(
  () => props.modelValue,
  newValue => {
    // Deep clone to avoid reactivity issues with nested structures
    localNested.value = {
      id: newValue.id,
      logicType: newValue.logicType,
      count: newValue.count,
      events: newValue.events.map(e => ({ ...e })),
    }
  },
  { deep: true, flush: 'sync' }
)

// Emit changes to parent
function emitUpdate() {
  emit('update:modelValue', localNested.value)
}

// Logic Type Methods
function onMenuOpen(isOpen: boolean) {
  if (isOpen) {
    tempLogicType.value = localNested.value.logicType
    tempCount.value = localNested.value.count || 1
  }
}

function confirmLogicType() {
  localNested.value.logicType = tempLogicType.value

  if (tempLogicType.value === 'AT_LEAST' || tempLogicType.value === 'AT_MOST') {
    localNested.value.count = tempCount.value
  } else {
    delete localNested.value.count
  }

  showLogicTypeMenu.value = false
  emitUpdate()
}

function getLogicTypeDisplay(): string {
  const { logicType, count } = localNested.value
  switch (logicType) {
    case 'AT_LEAST':
      return `${tv('options.atLeast', 'At least')} ${count || 1}`
    case 'AT_MOST':
      return `${tv('options.atMost', 'At most')} ${count || 1}`
    case 'ALL':
      return tv('options.all', 'ALL')
    case 'ANY':
      return tv('options.any', 'ANY')
    default:
      return logicType
  }
}

// Criteria Management
function addCriteria(criteriaType: CriteriaType) {
  const newEvent: CohortEvent = {
    id: uuidv4(),
    criteriaType,
    conceptSet: {
      id: 0,
      name: t('components.conceptAddBox.selectConceptSet', 'Select concept set...').value,
    },
    attributes: [],
  }

  localNested.value.events.push(newEvent)
  emitUpdate()
}

function removeCriteria(index: number) {
  localNested.value.events.splice(index, 1)
  emitUpdate()
}

function selectConceptSet(eventIndex: number, eventId: string) {
  emit('select-concept-set', { eventIndex, eventId })
}

// Cardinality
function updateCardinality(index: number, type: CardinalityType) {
  const event = localNested.value.events[index]
  if (!event) return
  if (!event.cardinality) {
    event.cardinality = { type, count: 1, countingMethod: 'ALL' }
  } else {
    event.cardinality.type = type
  }
  emitUpdate()
}

function updateCardinalityCount(index: number, count: number) {
  const event = localNested.value.events[index]
  if (!event) return
  if (!event.cardinality) {
    event.cardinality = { type: 'AT_LEAST', count, countingMethod: 'ALL' }
  } else {
    event.cardinality.count = count
  }
  emitUpdate()
}

// Temporal Window
function toggleTemporalWindow(index: number, enabled: boolean) {
  const event = localNested.value.events[index]
  if (!event) return
  if (enabled) {
    event.temporalWindow = {
      startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
      endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
    }
  } else {
    delete event.temporalWindow
  }
  emitUpdate()
}

function updateTemporalWindow(index: number, temporalWindow: TemporalWindow) {
  const event = localNested.value.events[index]
  if (!event) return
  event.temporalWindow = temporalWindow
  emitUpdate()
}

// Attributes
function toggleAttributes(index: number, enabled: boolean) {
  const event = localNested.value.events[index]
  if (!event) return
  if (enabled) {
    // Initialize with empty array to enable AttributesEditor
    // Users can then add specific attributes via the "Add Attribute" button
    event.attributes = []
  } else {
    // Disable attributes by setting to undefined
    event.attributes = undefined
  }
  emitUpdate()
}

function updateAttributes(index: number, attributes: EventAttribute[]) {
  const event = localNested.value.events[index]
  if (!event) return
  event.attributes = attributes
  emitUpdate()
}

// Nested Criteria
function toggleNestedCriteria(index: number, enabled: boolean) {
  const event = localNested.value.events[index]
  if (!event) return
  if (enabled) {
    event.nestedCriteria = {
      id: uuidv4(),
      logicType: 'ALL',
      events: [],
    }
  } else {
    delete event.nestedCriteria
  }
  emitUpdate()
}

function updateNestedCriteria(index: number, nested: NestedCriteria) {
  const event = localNested.value.events[index]
  if (!event) return
  event.nestedCriteria = nested
  emitUpdate()
}

function removeNestedCriteria(index: number) {
  const event = localNested.value.events[index]
  if (!event) return
  delete event.nestedCriteria
  emitUpdate()
}

// Format event type using configuration-driven labels
function formatEventType(type: CriteriaType): string {
  const filter = availableFilters.value.find(f => f.criteriaType === type)
  return filter?.name || type
}
</script>

<style scoped>
.nested-criteria-editor {
  position: relative;
  border-left: 3px solid #e0e0e0;
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

.segmented-buttons {
  display: flex;
  gap: 4px;
}

.match-type-menu {
  min-width: 300px;
}

.group-header {
  gap: 8px;
}

.events-list {
  max-height: 600px;
  overflow-y: auto;
}

.event-card {
  transition: all 0.2s;
}

.event-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
