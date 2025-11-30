<template>
  <div class="attributes-editor">
    <!-- Attribute List - Always Visible (No Inline Editing) -->
    <div
      v-if="modelValue.length > 0"
      class="attributes-list"
    >
      <div
        v-for="(attribute, index) in modelValue"
        :key="index"
        class="attribute-container mb-2"
      >
        <template v-if="attribute">
          <!-- Attribute Title (Left Side) -->
          <div class="attribute-title">
            {{ getAttributeLabel(attribute.attributeKey) }}
          </div>

          <!-- Attribute Input (Middle) -->
          <div class="attribute-input">
            <!-- Numeric Range Attributes -->
            <template v-if="attribute.type === 'numericRange'">
              <v-select
                :model-value="attribute.operator"
                :items="numericOperators"
                item-title="label"
                item-value="value"
                density="compact"
                variant="outlined"
                hide-details
                class="operator-select"
                data-testid="attribute-operator-selector"
                @update:model-value="updateAttributeOperator(index, $event)"
              />

              <v-text-field
                :model-value="attribute.value"
                :error-messages="attributeErrors[index] || undefined"
                type="number"
                density="compact"
                variant="outlined"
                hide-details="auto"
                class="value-input"
                data-testid="attribute-value-input"
                @blur="validateNumericAttribute(index)"
                @update:model-value="updateAttributeValue(index, $event)"
              />

              <template v-if="attribute.type === 'numericRange' && (attribute.operator === 'BETWEEN')">
                <span class="and-text">{{ t('common.and') }}</span>
                <v-text-field
                  :model-value="attribute.extent"
                  type="number"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="value-input"
                  data-testid="attribute-extent-input"
                  @update:model-value="updateAttributeExtent(index, $event)"
                />
              </template>
            </template>

            <!-- Concept Set Attributes -->
            <template v-else-if="attribute.type === 'conceptSet'">
              <v-btn
                v-if="!attribute.conceptSet || !attribute.conceptSet.id"
                color="primary"
                variant="outlined"
                size="small"
                data-testid="attribute-concept-set-picker"
                @click="openConceptSetPickerForAttribute(index)"
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
                data-testid="attribute-selected-concept-set"
                style="cursor: pointer;"
                @click="openConceptSetPickerForAttribute(index)"
                @click:close="clearConceptSetAttribute(index)"
              >
                {{ attribute.conceptSet.name }}
              </v-chip>
            </template>

            <!-- Date Range Attributes -->
            <template v-else-if="attribute.type === 'dateRange'">
              <v-select
                :model-value="attribute.operator"
                :items="dateOperators"
                item-title="label"
                item-value="value"
                density="compact"
                variant="outlined"
                hide-details
                class="operator-select"
                data-testid="attribute-operator-selector"
                @update:model-value="updateAttributeOperator(index, $event)"
              />

              <v-text-field
                v-if="attribute.type === 'dateRange' && (attribute.operator === 'BETWEEN' || attribute.operator === 'AFTER')"
                :model-value="attribute.value"
                type="date"
                density="compact"
                variant="outlined"
                hide-details
                class="value-input"
                data-testid="attribute-start-date-input"
                @update:model-value="updateAttributeValue(index, $event)"
              />

              <template v-if="attribute.type === 'dateRange' && attribute.operator === 'BETWEEN'">
                <span class="and-text">{{ t('common.and') }}</span>
                <v-text-field
                  :model-value="attribute.extent"
                  type="date"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="value-input"
                  data-testid="attribute-end-date-input"
                  @update:model-value="updateAttributeExtent(index, $event)"
                />
              </template>

              <v-text-field
                v-if="attribute.type === 'dateRange' && attribute.operator === 'BEFORE'"
                :model-value="attribute.value"
                type="date"
                density="compact"
                variant="outlined"
                hide-details
                class="value-input"
                data-testid="attribute-date-input"
                @update:model-value="updateAttributeValue(index, $event)"
              />
            </template>

            <!-- Text Attributes -->
            <template v-else-if="attribute.type === 'text'">
              <v-select
                :model-value="attribute.operator"
                :items="textOperators"
                item-title="label"
                item-value="value"
                density="compact"
                variant="outlined"
                hide-details
                class="operator-select"
                data-testid="attribute-text-operator-selector"
                @update:model-value="updateAttributeOperator(index, $event)"
              />

              <v-text-field
                :model-value="attribute.value"
                :error-messages="attributeErrors[index] || undefined"
                density="compact"
                variant="outlined"
                class="value-input"
                placeholder="Enter text value..."
                data-testid="attribute-text-value-input"
                @blur="validateTextAttribute(index)"
                @update:model-value="updateAttributeValue(index, $event)"
              />
            </template>

            <!-- Boolean Attributes -->
            <template v-else-if="attribute.type === 'boolean'">
              <v-chip
                color="success"
                variant="outlined"
                size="small"
                data-testid="attribute-boolean-chip"
              >
                <v-icon
                  start
                  size="small"
                >
                  mdi-check-circle
                </v-icon>
                {{ getAttributeLabel(attribute.attributeKey) }}
              </v-chip>
            </template>

            <!-- Concept Attributes (Multiple Concepts) -->
            <template v-else-if="attribute.type === 'concept'">
              <div class="d-flex flex-wrap gap-2 align-center">
                <v-chip
                  v-for="(concept, conceptIndex) in attribute.concepts"
                  :key="concept.CONCEPT_ID"
                  closable
                  color="primary"
                  size="small"
                  data-testid="attribute-selected-concept"
                  @click:close="removeConceptFromAttribute(index, conceptIndex)"
                >
                  {{ concept.CONCEPT_NAME }}
                </v-chip>
                <v-btn
                  color="primary"
                  variant="outlined"
                  size="small"
                  data-testid="attribute-concept-picker"
                  @click="openConceptPickerForAttribute(index)"
                >
                  <v-icon class="mr-2">
                    mdi-plus
                  </v-icon>
                  {{ attribute.concepts.length > 0 ? 'Edit' : 'Select Concept' }}
                </v-btn>
              </div>
            </template>

            <!-- Temporal Relationship Attributes -->
            <template v-else-if="attribute.type === 'temporalRelationship'">
              <v-chip
                v-if="attribute.temporalWindow && (attribute.temporalWindow.startWindow || attribute.temporalWindow.endWindow)"
                color="primary"
                variant="outlined"
                size="small"
                data-testid="attribute-temporal-chip"
                style="cursor: pointer;"
                @click="openTemporalEditor(index)"
              >
                <v-icon
                  start
                  size="small"
                >
                  mdi-clock-outline
                </v-icon>
                {{ getTemporalWindowSummary(attribute.temporalWindow) }}
              </v-chip>
              <v-btn
                v-else
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-clock-plus-outline"
                data-testid="attribute-temporal-add-button"
                @click="openTemporalEditor(index)"
              >
                Add Temporal Window
              </v-btn>
            </template>

            <!-- Date Adjustment Attributes -->
            <template v-else-if="attribute.type === 'dateAdjustment'">
              <v-chip
                v-if="attribute.dateAdjustment"
                color="primary"
                variant="outlined"
                size="small"
                data-testid="attribute-date-adjustment-chip"
                style="cursor: pointer;"
                @click="openDateAdjustmentEditor(index)"
              >
                <v-icon
                  start
                  size="small"
                >
                  mdi-calendar-edit
                </v-icon>
                {{ getDateAdjustmentSummary(attribute.dateAdjustment) }}
              </v-chip>
              <v-btn
                v-else
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-calendar-plus"
                data-testid="attribute-date-adjustment-add-button"
                @click="openDateAdjustmentEditor(index)"
              >
                Add Date Adjustment
              </v-btn>
            </template>

            <!-- User Defined Period Attributes -->
            <template v-else-if="attribute.type === 'userDefinedPeriod'">
              <v-text-field
                :model-value="attribute.period.startDate"
                :error-messages="attributeErrors[index] || undefined"
                type="date"
                label="Start Date"
                density="compact"
                variant="outlined"
                class="value-input"
                data-testid="attribute-period-start-date"
                @blur="validatePeriodDates(index)"
                @update:model-value="updatePeriodStartDate(index, $event)"
              />
              <span class="and-text">{{ t('common.to', 'to') }}</span>
              <v-text-field
                :model-value="attribute.period.endDate"
                type="date"
                label="End Date"
                density="compact"
                variant="outlined"
                class="value-input"
                data-testid="attribute-period-end-date"
                @blur="validatePeriodDates(index)"
                @update:model-value="updatePeriodEndDate(index, $event)"
              />
            </template>
          </div>

          <!-- Delete Button (Right Side) -->
          <div class="attribute-actions">
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              data-testid="remove-attribute-button"
              @click="removeAttribute(index)"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Temporal Window Editor Dialog -->
    <v-dialog
      v-model="temporalEditorOpen"
      max-width="600"
      scrollable
    >
      <TemporalWindowEditor
        v-if="temporalEditorOpen && selectedTemporalIndex !== -1"
        :model-value="getTemporalWindowValue(selectedTemporalIndex)"
        @update:model-value="updateTemporalWindow"
      />
    </v-dialog>

    <!-- Date Adjustment Editor Dialog -->
    <v-dialog
      v-model="dateAdjustmentEditorOpen"
      max-width="500"
      scrollable
    >
      <DateAdjustmentEditor
        v-if="dateAdjustmentEditorOpen && selectedDateAdjustmentIndex !== -1"
        :model-value="getDateAdjustmentValue(selectedDateAdjustmentIndex)"
        @update:model-value="updateDateAdjustment"
      />
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAttributeConfig } from '@/composables/useAttributeConfig'
import TemporalWindowEditor from '@/components/cohort-builder/TemporalWindowEditor.vue'
import DateAdjustmentEditor from '@/components/cohort-builder/DateAdjustmentEditor.vue'
import {
  TEXT_OPERATORS,
  NUMERIC_OPERATORS,
  DATE_OPERATORS,
} from '@/constants/attribute-operators'
import type {
  EventAttribute,
  TemporalWindow,
  DateAdjustment
} from '@/models/event.types'
import type { CriteriaType } from '@/models/cohort.types'

const { t } = useI18n()

interface Props {
  modelValue: EventAttribute[]
  criteriaType: CriteriaType
  section?: string // Optional section context (e.g., 'initialEvents', 'criteriaGroup')
  hasNestedCriteria?: boolean // Whether the event already has nested criteria
}

const props = withDefaults(defineProps<Props>(), {
  section: 'criteriaGroup', // Default to criteria group context
  hasNestedCriteria: false
})

const emit = defineEmits<{
  'update:modelValue': [value: EventAttribute[]]
  'add-nested-criteria': []
  'select-concept-set-for-attribute': [attributeIndex: number]
  'select-concept-for-attribute': [attributeIndex: number, domainFilter: string | undefined]
}>()

// Convert PascalCase criteriaType to camelCase for config lookup
// e.g., 'ConditionOccurrence' -> 'conditionOccurrence'
const toCamelCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

// Use attribute configuration composable
const criteriaTypeKey = ref(toCamelCase(props.criteriaType))
const sectionRef = ref(props.section)
const { getAttributeLabel, getAttribute } = useAttributeConfig(
  criteriaTypeKey,
  sectionRef
)

// Watch for criteriaType changes and update the key
watch(() => props.criteriaType, (newType) => {
  criteriaTypeKey.value = toCamelCase(newType)
})

// Watch for undefined values in modelValue and clean them up
// Also validate operators and apply defaults if missing
watch(() => props.modelValue, (newValue) => {
  let needsUpdate = false
  const cleaned: EventAttribute[] = []

  for (const attr of newValue) {
    if (attr === undefined || attr === null) {
      needsUpdate = true
      continue
    }

    // Validate and apply default operators if missing
    if (attr.type === 'numericRange') {
      if (!attr.operator) {
        needsUpdate = true
        cleaned.push({ ...(attr as any), operator: 'GREATER_THAN_OR_EQUAL' } as EventAttribute)
      } else {
        cleaned.push(attr)
      }
    } else if (attr.type === 'dateRange') {
      if (!attr.operator) {
        needsUpdate = true
        cleaned.push({ ...(attr as any), operator: 'BETWEEN' } as EventAttribute)
      } else {
        cleaned.push(attr)
      }
    } else if (attr.type === 'text') {
      if (!attr.operator) {
        needsUpdate = true
        cleaned.push({ ...(attr as any), operator: 'CONTAINS' } as EventAttribute)
      } else {
        cleaned.push(attr)
      }
    } else {
      cleaned.push(attr)
    }
  }

  if (needsUpdate) {
    emit('update:modelValue', cleaned)
  }
}, { immediate: true })

// Operator lists - imported from constants for consistency
const numericOperators = NUMERIC_OPERATORS
const dateOperators = DATE_OPERATORS
const textOperators = TEXT_OPERATORS

// Attribute errors tracking
const attributeErrors = ref<Record<number, string | null>>({})

// Methods for direct attribute updates
function updateAttributeOperator(index: number, operator: string) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr) return

  if (attr.type === 'numericRange' || attr.type === 'dateRange') {
    // Clear extent when switching from BETWEEN to single-value operators
    const isBetweenOperator = operator === 'BETWEEN' || operator === 'NOT_BETWEEN'
    const wasExtentSet = 'extent' in attr && attr.extent !== undefined

    if (wasExtentSet && !isBetweenOperator) {
      // Switching from BETWEEN to single-value operator - clear extent
      const { extent, ...attrWithoutExtent } = attr
      newAttributes[index] = { ...attrWithoutExtent, operator: operator as any }
    } else {
      newAttributes[index] = { ...attr, operator: operator as any }
    }
  } else if (attr.type === 'text') {
    newAttributes[index] = { ...attr, operator: operator as any }
  }

  emit('update:modelValue', newAttributes)
}

function updateAttributeValue(index: number, value: any) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr) return
  newAttributes[index] = { ...attr, value } as EventAttribute
  emit('update:modelValue', newAttributes)
}

function updateAttributeExtent(index: number, extent: any) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr) return
  if ('extent' in attr) {
    newAttributes[index] = { ...attr, extent }
  }
  emit('update:modelValue', newAttributes)
}

function removeAttribute(index: number) {
  const newAttributes = [...props.modelValue]
  newAttributes.splice(index, 1)
  emit('update:modelValue', newAttributes)
}

function validateTextAttribute(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'text') return

  if (!attr.value || attr.value.trim() === '') {
    attributeErrors.value[index] = 'Please enter a text value'
  } else {
    attributeErrors.value[index] = null
  }
}

function validateNumericAttribute(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'numericRange') return

  if (attr.value === undefined || attr.value === null) {
    attributeErrors.value[index] = 'Please enter a numeric value'
  } else if (attr.operator === 'BETWEEN' && !attr.extent) {
    attributeErrors.value[index] = 'BETWEEN operator requires both values'
  } else {
    attributeErrors.value[index] = null
  }
}

// Concept attribute handlers
function openConceptPickerForAttribute(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'concept') return

  // Get the domain filter from attribute config
  const attributeConfig = getAttribute(attr.attributeKey)
  const domainFilter = attributeConfig?.domainFilter

  emit('select-concept-for-attribute', index, domainFilter)
}

function removeConceptFromAttribute(attributeIndex: number, conceptIndex: number) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[attributeIndex]
  if (!attr || attr.type !== 'concept') return

  const newConcepts = [...attr.concepts]
  newConcepts.splice(conceptIndex, 1)
  newAttributes[attributeIndex] = { ...attr, concepts: newConcepts }
  emit('update:modelValue', newAttributes)
}

function openConceptSetPickerForAttribute(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'conceptSet') return

  emit('select-concept-set-for-attribute', index)
}

function clearConceptSetAttribute(index: number) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr || attr.type !== 'conceptSet') return

  newAttributes[index] = { ...attr, conceptSet: { id: '', name: '' } }
  emit('update:modelValue', newAttributes)
}

// Temporal relationship attribute state
const temporalEditorOpen = ref(false)
const selectedTemporalIndex = ref<number>(-1)

function openTemporalEditor(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'temporalRelationship') return

  selectedTemporalIndex.value = index
  temporalEditorOpen.value = true
}

function updateTemporalWindow(temporalWindow: TemporalWindow) {
  if (selectedTemporalIndex.value === -1) return

  const newAttributes = [...props.modelValue]
  const attr = newAttributes[selectedTemporalIndex.value]
  if (!attr || attr.type !== 'temporalRelationship') return

  newAttributes[selectedTemporalIndex.value] = { ...attr, temporalWindow }
  emit('update:modelValue', newAttributes)

  temporalEditorOpen.value = false
  selectedTemporalIndex.value = -1
}

function getTemporalWindowValue(index: number): TemporalWindow | undefined {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'temporalRelationship') return undefined
  return attr.temporalWindow
}

function getTemporalWindowSummary(temporalWindow?: TemporalWindow): string {
  if (!temporalWindow) return 'Not configured'

  const parts: string[] = []

  if (temporalWindow.startWindow) {
    const { days, beforeAfter } = temporalWindow.startWindow
    const daysStr = days === null ? 'all time' : `${days} days`
    const dirStr = beforeAfter === 'AFTER' ? 'after' : 'before'
    parts.push(`Start: ${daysStr} ${dirStr}`)
  }

  if (temporalWindow.endWindow) {
    const { days, beforeAfter } = temporalWindow.endWindow
    const daysStr = days === null ? 'all time' : `${days} days`
    const dirStr = beforeAfter === 'AFTER' ? 'after' : 'before'
    parts.push(`End: ${daysStr} ${dirStr}`)
  }

  return parts.length > 0 ? parts.join(', ') : 'Not configured'
}

// Date adjustment attribute state
const dateAdjustmentEditorOpen = ref(false)
const selectedDateAdjustmentIndex = ref<number>(-1)

function openDateAdjustmentEditor(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'dateAdjustment') return

  selectedDateAdjustmentIndex.value = index
  dateAdjustmentEditorOpen.value = true
}

function updateDateAdjustment(dateAdjustment: DateAdjustment) {
  if (selectedDateAdjustmentIndex.value === -1) return

  const newAttributes = [...props.modelValue]
  const attr = newAttributes[selectedDateAdjustmentIndex.value]
  if (!attr || attr.type !== 'dateAdjustment') return

  newAttributes[selectedDateAdjustmentIndex.value] = { ...attr, dateAdjustment }
  emit('update:modelValue', newAttributes)

  dateAdjustmentEditorOpen.value = false
  selectedDateAdjustmentIndex.value = -1
}

function getDateAdjustmentValue(index: number): DateAdjustment | undefined {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'dateAdjustment') return undefined
  return attr.dateAdjustment
}

function getDateAdjustmentSummary(dateAdjustment?: DateAdjustment): string {
  if (!dateAdjustment) return 'Not configured'

  const startRef = dateAdjustment.startWith === 'START_DATE' ? 'Start' : 'End'
  const endRef = dateAdjustment.endWith === 'START_DATE' ? 'Start' : 'End'

  return `Start: ${startRef} + ${dateAdjustment.startOffset}d, End: ${endRef} + ${dateAdjustment.endOffset}d`
}

// User defined period attribute handlers
function updatePeriodStartDate(index: number, startDate: string) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr || attr.type !== 'userDefinedPeriod') return

  newAttributes[index] = {
    ...attr,
    period: { ...attr.period, startDate }
  }
  emit('update:modelValue', newAttributes)
}

function updatePeriodEndDate(index: number, endDate: string) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr || attr.type !== 'userDefinedPeriod') return

  newAttributes[index] = {
    ...attr,
    period: { ...attr.period, endDate }
  }
  emit('update:modelValue', newAttributes)
}

function validatePeriodDates(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'userDefinedPeriod') return

  const startDate = new Date(attr.period.startDate)
  const endDate = new Date(attr.period.endDate)

  if (!attr.period.startDate || !attr.period.endDate) {
    attributeErrors.value[index] = 'Both start and end dates are required'
  } else if (endDate <= startDate) {
    attributeErrors.value[index] = 'End date must be after start date'
  } else {
    attributeErrors.value[index] = null
  }
}
</script>

<style scoped>
.attributes-editor {
  margin-top: 8px;
}

.attributes-list {
  margin-bottom: 12px;
}

.attribute-container {
  display: flex;
  border-radius: 6px;
  border: 1px solid rgb(var(--v-theme-primary));
  overflow: hidden;
}

.attribute-title {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  flex: 1;
  max-width: 20%;
  color: rgb(var(--v-theme-primary));
  background: #ebf2fa;
  font-size: 13px;
  font-weight: 500;
  border-right: 1px solid rgb(var(--v-theme-primary));
}

.attribute-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  flex: 2;
  border-right: 1px solid rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}

.attribute-input .operator-select {
  min-width: 180px;
  max-width: 180px;
}

.attribute-input .value-input {
  min-width: 70px;
  max-width: 100px;
}

.attribute-input .and-text {
  font-size: 12px;
  color: rgb(var(--v-theme-primary));
}

/* Make controls even more compact */
.attribute-input :deep(.v-field) {
  font-size: 13px;
}

.attribute-input :deep(.v-field__input) {
  padding: 4px 8px;
  min-height: 32px;
}

.attribute-input :deep(.v-field__append-inner) {
  padding-top: 4px;
  padding-bottom: 4px;
}

.attribute-input :deep(.v-select__selection-text) {
  font-size: 13px;
}

.attribute-actions {
  display: flex;
  align-items: center;
  background: #ebf2fa;
  padding: 0 4px;
}

.attribute-actions .v-btn {
  transition: all 0.2s ease;
}

.attribute-actions .v-btn:hover {
  background: #d8e6f5;
}
</style>
