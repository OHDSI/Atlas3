<template>
  <v-card variant="outlined" class="criteria-group-editor">
    <v-card-text>
      <!-- Logic Type Selector -->
      <v-select
        v-model="localGroup.logicType"
        :items="logicTypes"
        item-title="label"
        item-value="value"
        label="Logic Type"
        data-testid="logic-type-selector"
        @update:model-value="onLogicTypeChange"
      />

      <!-- Count Input (for AT_LEAST/AT_MOST) -->
      <v-text-field
        v-if="requiresCount"
        v-model.number="localGroup.count"
        type="number"
        :label="countLabel"
        min="1"
        data-testid="logic-count-input"
      />

      <!-- Validation Error -->
      <v-alert v-if="validationError" type="error" class="mb-2">
        {{ validationError }}
      </v-alert>

      <!-- Events in Group -->
      <div class="mt-4">
        <div class="text-subtitle-2 mb-2">Events in Group</div>

        <div v-if="localGroup.events.length > 0" class="events-list">
          <v-card
            v-for="(event, index) in localGroup.events"
            :key="event.id"
            variant="outlined"
            class="mb-2"
            data-testid="group-event-item"
          >
            <v-card-text>
              <!-- Event Type Selector -->
              <v-select
                v-model="event.criteriaType"
                :items="criteriaTypes"
                item-title="label"
                item-value="value"
                label="Event Type"
                data-testid="event-type-selector"
                @update:model-value="emitUpdate"
              />

              <!-- Concept Set Picker -->
              <v-btn
                v-if="!event.conceptSet || event.conceptSet.id === 0"
                color="primary"
                variant="outlined"
                block
                class="mt-2"
                data-testid="concept-set-picker"
                @click="selectConceptSetForEvent(index)"
              >
                <v-icon class="mr-2">mdi-plus</v-icon>
                Select Concept Set
              </v-btn>
              <v-chip
                v-else
                closable
                class="mt-2"
                data-testid="selected-concept-set"
                @click:close="clearConceptSet(index)"
              >
                {{ event.conceptSet.name }}
              </v-chip>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                data-testid="remove-event-from-group"
                @click="removeEvent(index)"
              />
            </v-card-actions>
          </v-card>
        </div>

        <v-alert v-else type="info" variant="tonal">
          No events in group. Add events to build criteria logic.
        </v-alert>
      </div>
      <!-- Add Event Button -->
      <v-btn
        class="mt-2"
        variant="outlined"
        prepend-icon="mdi-plus"
        data-testid="add-event-to-group"
        @click="addEvent"
      >
        Add Event
      </v-btn>

      <!-- Nested Groups (if any) -->
      <div v-if="localGroup.nestedGroups && localGroup.nestedGroups.length > 0" class="mt-4">
        <div class="text-subtitle-2 mb-2">Nested Groups</div>
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
    </v-card-text>

    <v-card-actions>
      <v-btn color="primary" @click="save">Save Criteria Group</v-btn>
      <v-btn variant="text" @click="$emit('remove')">Remove Group</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { CriteriaGroup, CohortEvent } from '@/models/cohort.types'

interface Props {
  modelValue?: CriteriaGroup
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: CriteriaGroup]
  'remove': []
  'select-concept-set': [eventIndex: number]
}>()

// Local state
const localGroup = ref<CriteriaGroup>(props.modelValue || {
  id: uuidv4(),
  logicType: 'ALL',
  events: [],
})

const validationError = ref('')

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    localGroup.value = { ...newVal }
  }
}, { deep: true })

// Logic types
const logicTypes = [
  { value: 'ALL', label: 'ALL - All events must occur' },
  { value: 'ANY', label: 'ANY - At least one event must occur' },
  { value: 'AT_LEAST', label: 'AT LEAST - Minimum count of events' },
  { value: 'AT_MOST', label: 'AT MOST - Maximum count of events' },
]

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

// Computed
const requiresCount = computed(() => {
  return localGroup.value.logicType === 'AT_LEAST' || localGroup.value.logicType === 'AT_MOST'
})

const countLabel = computed(() => {
  return localGroup.value.logicType === 'AT_LEAST' ? 'Minimum Count' : 'Maximum Count'
})

// Methods
function onLogicTypeChange() {
  if (!requiresCount.value) {
    delete localGroup.value.count
  } else if (!localGroup.value.count) {
    localGroup.value.count = 1
  }
}

function addEvent() {
  // Emit event to parent to open event picker
  // For now, create a placeholder event
  const newEvent: CohortEvent = {
    id: uuidv4(),
    criteriaType: 'ConditionOccurrence',
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

function validate(): boolean {
  validationError.value = ''

  if (requiresCount.value && !localGroup.value.count) {
    validationError.value = `Count is required for ${localGroup.value.logicType} logic`
    return false
  }

  if (requiresCount.value && localGroup.value.count! < 1) {
    validationError.value = 'Count must be at least 1'
    return false
  }

  return true
}

function save() {
  if (validate()) {
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

// Expose method for parent to call
defineExpose({
  updateEventConceptSet,
})
</script>

<style scoped>
.criteria-group-editor {
  margin-bottom: 16px;
}

.nested-group-item {
  margin-left: 24px;
  margin-bottom: 12px;
  border-left: 3px solid #1976d2;
  padding-left: 12px;
}
</style>
