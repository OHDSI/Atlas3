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
              <v-btn
                :variant="matchTypeTemp === 'ALL' ? 'tonal' : 'outlined'"
                :color="matchTypeTemp === 'ALL' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="matchTypeTemp = 'ALL'"
              >
                {{ t('options.all', 'All') }}
              </v-btn>
              <v-btn
                :variant="matchTypeTemp === 'ANY' ? 'tonal' : 'outlined'"
                :color="matchTypeTemp === 'ANY' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="matchTypeTemp = 'ANY'"
              >
                {{ t('options.any', 'Any') }}
              </v-btn>
              <v-btn
                :variant="matchTypeTemp === 'AT_LEAST' ? 'tonal' : 'outlined'"
                :color="matchTypeTemp === 'AT_LEAST' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="matchTypeTemp = 'AT_LEAST'"
              >
                {{ t('options.atLeast', 'At least') }}
              </v-btn>
              <v-btn
                :variant="matchTypeTemp === 'AT_MOST' ? 'tonal' : 'outlined'"
                :color="matchTypeTemp === 'AT_MOST' ? 'primary' : undefined"
                size="small"
                class="flex-1"
                @click="matchTypeTemp = 'AT_MOST'"
              >
                {{ t('options.atMost', 'At most') }}
              </v-btn>
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
                  class="criteria-event-card mb-2"
                  data-testid="group-event-item"
                >
                  <!-- Cardinality Sidebar with Menu -->
                  <AtlasMenu
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
                            :variant="
                              getCardinalityType(event) === 'at_least' ? 'tonal' : 'outlined'
                            "
                            :color="
                              getCardinalityType(event) === 'at_least' ? 'primary' : undefined
                            "
                            size="small"
                            class="flex-1"
                            @click="
                              updateEventCardinality(
                                index,
                                'AT_LEAST',
                                event.cardinality?.count || 1
                              )
                            "
                          >
                            At least
                          </v-btn>
                          <v-btn
                            :variant="
                              getCardinalityType(event) === 'exactly' ? 'tonal' : 'outlined'
                            "
                            :color="getCardinalityType(event) === 'exactly' ? 'primary' : undefined"
                            size="small"
                            class="flex-1"
                            @click="
                              updateEventCardinality(
                                index,
                                'EXACTLY',
                                event.cardinality?.count || 1
                              )
                            "
                          >
                            Exactly
                          </v-btn>
                          <v-btn
                            :variant="
                              getCardinalityType(event) === 'at_most' ? 'tonal' : 'outlined'
                            "
                            :color="getCardinalityType(event) === 'at_most' ? 'primary' : undefined"
                            size="small"
                            class="flex-1"
                            @click="
                              updateEventCardinality(
                                index,
                                'AT_MOST',
                                event.cardinality?.count || 1
                              )
                            "
                          >
                            At most
                          </v-btn>
                        </div>
                        <AtlasTextField
                          :model-value="event.cardinality?.count || 1"
                          type="number"
                          label="Count"
                          min="1"
                          class="mt-3"
                          @update:model-value="(v) => updateEventCardinalityCount(index, Number(v))"
                        />
                      </v-card-text>
                    </v-card>
                  </AtlasMenu>

                  <!-- Event Content -->
                  <div class="event-content">
                    <!-- Event Header -->
                    <div class="event-header">
                      <div class="event-type-label">
                        {{ getEventTypeLabel(event.criteriaType) }}
                      </div>
                      <div class="event-header-actions">
                        <AtlasMenu>
                          <template #activator="{ props: menuProps }">
                            <v-btn
                              v-bind="menuProps"
                              prepend-icon="mdi-plus"
                              size="small"
                              variant="text"
                              color="primary"
                              data-testid="add-attribute-button"
                            >
                              {{ t('components.common.addAttribute') }}
                            </v-btn>
                          </template>
                          <AtlasList>
                            <AtlasListItem
                              v-for="attr in getAvailableAttributesForEvent(event)"
                              :key="attr.key"
                              :title="attr.label"
                              :subtitle="attr.description"
                              :disabled="attr.type === 'nested' && !!event.nestedCriteria"
                              @click="addAttributeToEvent(index, attr.key, attr.type)"
                            />
                          </AtlasList>
                        </AtlasMenu>
                        <AtlasIconButton
                          icon="mdi-delete"
                          v-bind="{ ariaLabel: 'Remove event' }"
                          variant="text"
                          tone="primary"
                          size="sm"
                          data-testid="remove-event-from-group"
                          @click="removeEvent(index)"
                        />
                      </div>
                    </div>

                    <!-- Event Body -->
                    <div class="event-body">
                      <!-- Concept Set and Temporal Window Row -->
                      <div class="concept-temporal-row">
                        <!-- Concept Set Picker -->
                        <div class="concept-set-section">
                          <EventConceptSetField
                            :concept-set="
                              event.conceptSet && event.conceptSet.id !== 0
                                ? event.conceptSet
                                : undefined
                            "
                            @select="selectConceptSetForEvent(index)"
                            @edit="emit('edit-concept-set', $event)"
                            @clear="clearConceptSet(index)"
                          />
                        </div>

                        <!-- Temporal Window Display/Editor -->
                        <div class="temporal-window-section">
                          <AtlasMenu
                            v-if="event.temporalWindow"
                            :close-on-content-click="false"
                            location="end"
                          >
                            <template #activator="{ props: menuProps }">
                              <TemporalFilterChip
                                v-bind="menuProps"
                                :label="formatTemporalWindowDisplay(event.temporalWindow)"
                                @close="removeTemporalWindow(index)"
                              />
                            </template>
                            <v-card
                              class="temporal-window-menu"
                              style="min-width: 500px"
                            >
                              <v-card-text class="pa-3">
                                <TemporalWindowEditor
                                  :model-value="event.temporalWindow"
                                  @update:model-value="updateEventTemporalWindow(index, $event)"
                                />
                              </v-card-text>
                            </v-card>
                          </AtlasMenu>
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
                      </div>

                      <!-- Attributes Section -->
                      <div class="attributes-section mt-3">
                        <AttributesEditor
                          :model-value="event.attributes || []"
                          :criteria-type="event.criteriaType"
                          :has-nested-criteria="!!event.nestedCriteria"
                          @update:model-value="updateEventAttributes(index, $event)"
                          @add-nested-criteria="addNestedCriteria(index)"
                          @select-concept-set-for-attribute="
                            selectConceptSetForAttribute(index, $event)
                          "
                          @select-concept-for-attribute="
                            (attributeIndex, domainFilter) =>
                              selectConceptForAttribute(index, attributeIndex, domainFilter)
                          "
                        />
                      </div>

                      <!-- Nested Criteria Section -->
                      <div
                        v-if="event.nestedCriteria"
                        class="nested-criteria-section mt-3"
                      >
                        <NestedCriteriaEditor
                          :model-value="event.nestedCriteria"
                          :depth="1"
                          @update:model-value="updateEventNestedCriteria(index, $event)"
                          @remove="removeEventNestedCriteria(index)"
                          @select-concept-set="$emit('select-concept-set', $event)"
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
                <div style="color: #666">
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
import NestedCriteriaEditor from './NestedCriteriaEditor.vue'
import type {
  CriteriaGroup,
  CohortEvent,
  CriteriaType,
  NestedCriteria,
} from '@/models/cohort.types'
import type {
  EventAttribute,
  TemporalWindow,
  NumericAttributeKey,
  ConceptAttributeKey,
  DateAttributeKey,
  TextAttributeKey,
  BooleanAttributeKey,
  TemporalAttributeKey,
  DateAdjustmentAttributeKey,
  UserDefinedPeriodAttributeKey,
  Concept,
} from '@/models/event.types'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import { useAttributeConfig } from '@/composables/useAttributeConfig'
import AttributesEditor from './AttributesEditor.vue'
import EventConceptSetField from './EventConceptSetField.vue'
import TemporalWindowEditor from './TemporalWindowEditor.vue'
import TemporalFilterChip from './TemporalFilterChip.vue'

const { t } = useI18n()

interface Props {
  modelValue?: CriteriaGroup
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: CriteriaGroup]
  remove: []
  'select-concept-set': [context: { eventIndex: number; eventId: string } | number]
  'edit-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
  'select-concept': [
    context: { eventIndex: number; attributeIndex: number; domainFilter: string | undefined },
  ]
}>()

// Composables
const { formatTemporalWindowDisplay } = useTemporalWindows()

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

function getEventTypeLabel(criteriaType: string): string {
  const type = criteriaTypes.value.find(t => t.value === criteriaType)
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

function addNestedCriteria(index: number) {
  const event = localGroup.value.events[index]
  if (event) {
    event.nestedCriteria = {
      id: uuidv4(),
      logicType: 'ALL',
      events: [],
    }
    emitUpdate()
  }
}

function updateEventNestedCriteria(index: number, nested: NestedCriteria) {
  const event = localGroup.value.events[index]
  if (event) {
    event.nestedCriteria = nested
    emitUpdate()
  }
}

function removeEventNestedCriteria(index: number) {
  const event = localGroup.value.events[index]
  if (event) {
    delete event.nestedCriteria
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

function clearConceptSet(index: number) {
  if (localGroup.value.events[index]) {
    localGroup.value.events[index].conceptSet = { id: 0, name: 'Select concept set...' }
    emitUpdate()
  }
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

function getCardinalityType(event: CohortEvent): string {
  if (!event.cardinality) return 'at_least'
  return event.cardinality.type.toLowerCase()
}

function getCardinalityDisplayForEvent(event: CohortEvent): string {
  if (!event.cardinality) return `${t('options.atLeast', 'At least').value} 1`
  const typeMap: Record<string, string> = {
    AT_LEAST: t('options.atLeast', 'At least').value,
    EXACTLY: t('options.exactly', 'Exactly').value,
    AT_MOST: t('options.atMost', 'At most').value,
  }
  const type = typeMap[event.cardinality.type] || t('options.atLeast', 'At least').value
  return `${type} ${event.cardinality.count ?? 1}`
}

function updateEventCardinality(index: number, type: string, count: number) {
  const event = localGroup.value.events[index]
  if (event) {
    event.cardinality = {
      type: type as 'AT_LEAST' | 'EXACTLY' | 'AT_MOST',
      count: count,
      countingMethod: 'ALL',
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

// Helper to convert PascalCase to camelCase for config lookup
function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

// Refs for getting available attributes (moved to component scope to avoid creating refs in functions)
const attributeCriteriaTypeKey = ref('')
const attributeSectionRef = ref('criteriaGroup')

// Get available attributes for a specific event
function getAvailableAttributesForEvent(event: CohortEvent) {
  attributeCriteriaTypeKey.value = toCamelCase(event.criteriaType)
  const { attributes } = useAttributeConfig(attributeCriteriaTypeKey, attributeSectionRef)
  return attributes.value
}

// Add attribute to event
function addAttributeToEvent(eventIndex: number, attributeKey: string, attributeType: string) {
  const event = localGroup.value.events[eventIndex]
  if (!event) return

  // Handle nested criteria type specially - emit event instead of adding attribute
  if (attributeType === 'nested') {
    addNestedCriteria(eventIndex)
    return
  }

  // Create a default attribute based on the type
  let newAttribute: EventAttribute | null = null
  if (attributeType === 'numericRange') {
    newAttribute = {
      type: 'numericRange',
      attributeKey: attributeKey as NumericAttributeKey,
      operator: 'GREATER_THAN_OR_EQUAL',
      value: 0,
    }
  } else if (attributeType === 'conceptSet') {
    newAttribute = {
      type: 'conceptSet',
      attributeKey: attributeKey as ConceptAttributeKey,
      conceptSet: { id: '', name: '' },
    }
  } else if (attributeType === 'concept') {
    newAttribute = {
      type: 'concept',
      attributeKey: attributeKey as ConceptAttributeKey,
      concepts: [] as Concept[],
    }
  } else if (attributeType === 'dateRange') {
    newAttribute = {
      type: 'dateRange',
      attributeKey: attributeKey as DateAttributeKey,
      operator: 'AFTER',
      value: new Date().toISOString().split('T')[0] ?? '',
    }
  } else if (attributeType === 'text') {
    newAttribute = {
      type: 'text',
      attributeKey: attributeKey as TextAttributeKey,
      operator: 'CONTAINS',
      value: '',
    }
  } else if (attributeType === 'boolean') {
    newAttribute = {
      type: 'boolean',
      attributeKey: attributeKey as BooleanAttributeKey,
      value: true,
    }
  } else if (attributeType === 'temporalRelationship') {
    newAttribute = {
      type: 'temporalRelationship',
      attributeKey: attributeKey as TemporalAttributeKey,
      temporalWindow: {
        startWindow: {
          days: 0,
          beforeAfter: 'AFTER',
          referencePoint: 'INDEX_START',
        },
      },
    }
  } else if (attributeType === 'dateAdjustment') {
    newAttribute = {
      type: 'dateAdjustment',
      attributeKey: attributeKey as DateAdjustmentAttributeKey,
      dateAdjustment: {
        startWith: 'START_DATE',
        startOffset: 0,
        endWith: 'END_DATE',
        endOffset: 0,
      },
    }
  } else if (attributeType === 'userDefinedPeriod') {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 86400000) // +1 day in milliseconds
    newAttribute = {
      type: 'userDefinedPeriod',
      attributeKey: attributeKey as UserDefinedPeriodAttributeKey,
      period: {
        startDate: today.toISOString().split('T')[0] || '',
        endDate: tomorrow.toISOString().split('T')[0] || '',
      },
    }
  }

  // Add the new attribute to the event
  if (!newAttribute) return
  if (!event.attributes) {
    event.attributes = []
  }
  event.attributes.push(newAttribute)
  emitUpdate()
}

// Method to update concept attribute (called by parent)
function updateConceptAttribute(index: number, concepts: Concept[]) {
  if (localGroup.value.events[index]) {
    const event = localGroup.value.events[index]
    if (event && event.attributes && selectedAttributeIndex.value >= 0) {
      const attr = event.attributes[selectedAttributeIndex.value]
      if (attr && attr.type === 'concept') {
        // Add selected concepts to the existing array (support multi-select)
        const existingConcepts = attr.concepts || []
        const newConcepts = [...existingConcepts, ...concepts]
        event.attributes[selectedAttributeIndex.value] = {
          ...attr,
          concepts: newConcepts,
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
