<template>
  <v-card
    variant="outlined"
    class="nested-criteria-editor"
    :style="{ marginLeft: `${depth * 16}px` }"
  >
    <v-card-text class="d-flex">
      <!-- Vertical Logic Type Label -->
      <AtlasMenu
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
              <AtlasButton
                :variant="tempLogicType === 'ALL' ? 'tonal' : 'secondary'"
                :tone="tempLogicType === 'ALL' ? undefined : 'neutral'"
                size="sm"
                class="flex-1"
                @click="tempLogicType = 'ALL'"
              >
                {{ t('options.all', 'All') }}
              </AtlasButton>
              <AtlasButton
                :variant="tempLogicType === 'ANY' ? 'tonal' : 'secondary'"
                :tone="tempLogicType === 'ANY' ? undefined : 'neutral'"
                size="sm"
                class="flex-1"
                @click="tempLogicType = 'ANY'"
              >
                {{ t('options.any', 'Any') }}
              </AtlasButton>
              <AtlasButton
                :variant="tempLogicType === 'AT_LEAST' ? 'tonal' : 'secondary'"
                :tone="tempLogicType === 'AT_LEAST' ? undefined : 'neutral'"
                size="sm"
                class="flex-1"
                @click="tempLogicType = 'AT_LEAST'"
              >
                {{ t('options.atLeast', 'At least') }}
              </AtlasButton>
              <AtlasButton
                :variant="tempLogicType === 'AT_MOST' ? 'tonal' : 'secondary'"
                :tone="tempLogicType === 'AT_MOST' ? undefined : 'neutral'"
                size="sm"
                class="flex-1"
                @click="tempLogicType = 'AT_MOST'"
              >
                {{ t('options.atMost', 'At most') }}
              </AtlasButton>
            </div>
            <AtlasTextField
              v-if="tempLogicType === 'AT_LEAST' || tempLogicType === 'AT_MOST'"
              v-model.number="tempCount"
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
              @click="showLogicTypeMenu = false"
            >
              {{ t('common.cancel', 'Cancel') }}
            </AtlasButton>
            <AtlasButton
              size="sm"
              @click="confirmLogicType"
            >
              {{ t('common.apply', 'OK') }}
            </AtlasButton>
          </v-card-actions>
        </v-card>
      </AtlasMenu>

      <!-- Main Content -->
      <div class="flex-grow-1">
        <!-- Depth Warning -->
        <AtlasAlert
          v-if="depth > 10"
          severity="warning"
          density="compact"
          class="mb-2"
        >
          <AtlasIcon>mdi-alert</AtlasIcon>
          {{ t('components.nestedCriteria.depthWarning', 'Deep nesting detected') }} ({{ depth }}
          {{ t('common.levels', 'levels') }}).
          {{
            t(
              'components.nestedCriteria.simplifyStructure',
              'Consider simplifying your criteria structure.'
            )
          }}
        </AtlasAlert>

        <!-- Header with Add Criteria and Delete buttons -->
        <div class="group-header d-flex align-center mb-2">
          <AtlasMenu>
            <template #activator="{ props: slotProps }">
              <AtlasButton
                v-bind="slotProps"
                variant="secondary"
                size="sm"
                icon="mdi-plus"
                data-testid="add-criteria-to-nested-group"
              >
                {{ t('components.criteriaGroup.addCriteria', 'Add Criteria') }}
              </AtlasButton>
            </template>
            <AtlasList>
              <AtlasListItem
                v-for="criteriaType in criteriaTypes"
                :key="criteriaType.value"
                :title="criteriaType.label"
                :subtitle="criteriaType.description"
                @click="addCriteria(criteriaType.value as CriteriaType)"
              />
            </AtlasList>
          </AtlasMenu>

          <AtlasSpacer />

          <AtlasIconButton
            icon="mdi-delete"
            v-bind="{ ariaLabel: t('components.criteriaGroup.deleteGroup', 'Delete nested group').value }"
            variant="text"
            tone="danger"
            size="sm"
            @click="$emit('remove')"
          />
        </div>

        <!-- Empty State -->
        <AtlasAlert
          v-if="localNested.events.length === 0"
          severity="info"
          density="compact"
          class="mb-2"
        >
          {{
            t(
              'components.nestedCriteria.noEvents',
              'No events in this group. Click "Add Criteria" to begin.'
            )
          }}
        </AtlasAlert>

        <!-- Events List -->
        <div
          v-if="localNested.events.length > 0"
          class="events-list"
        >
          <div
            v-for="(event, index) in localNested.events"
            :key="event.id"
            class="mb-2"
          >
            <CriteriaEventCard
              :event="event"
              section="criteriaGroup"
              show-cardinality
              show-temporal
              show-criteria-options
              :depth="depth"
              @update="onEventUpdate(index, $event)"
              @remove="removeCriteria(index)"
              @select-concept-set="selectConceptSet(index, event.id)"
            />
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasMenu, AtlasSpacer, AtlasTextField } from '@/components/ui'
import { ref, computed, watch, defineOptions } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'
import type {
  NestedCriteria,
  CohortEvent,
  CriteriaType,
  LogicType,
} from '@/models/cohort.types'
import CriteriaEventCard from './CriteriaEventCard.vue'

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
    // Allow events outside the observation period by default (discussion #110).
    ignoreObservationPeriod: true,
  }

  localNested.value.events.push(newEvent)
  emitUpdate()
}

function removeCriteria(index: number) {
  localNested.value.events.splice(index, 1)
  emitUpdate()
}

// The shared CriteriaEventCard emits the full mutated event; replace by index.
function onEventUpdate(index: number, updatedEvent: CohortEvent) {
  if (!localNested.value.events[index]) return
  localNested.value.events[index] = updatedEvent
  emitUpdate()
}

function selectConceptSet(eventIndex: number, eventId: string) {
  emit('select-concept-set', { eventIndex, eventId })
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
