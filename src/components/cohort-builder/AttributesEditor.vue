<template>
  <div class="attributes-editor">
    <!-- Attribute List - Always Visible (No Inline Editing) -->
    <div
      v-if="modelValue.length > 0"
      class="attributes-list"
    >
      <div
        v-for="(attribute, index) in modelValue"
        :key="`${attribute.type}-${attribute.attributeKey}-${index}`"
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
              <AtlasSelect
                :model-value="attribute.operator"
                :items="[...numericOperators]"
                item-title="label"
                item-value="value"
                variant="outlined"
                hide-details
                class="operator-select"
                data-testid="attribute-operator-selector"
                @update:model-value="(v) => updateAttributeOperator(index, v as string)"
              />

              <AtlasTextField
                :model-value="attribute.value"
                :error="attributeErrors[index] || undefined"
                type="number"
                variant="outlined"
                hide-details="auto"
                class="value-input"
                data-testid="attribute-value-input"
                @blur="validateNumericAttribute(index)"
                @update:model-value="(v) => updateAttributeValue(index, v as string | number)"
              />

              <template
                v-if="attribute.type === 'numericRange' && attribute.operator === 'BETWEEN'"
              >
                <span class="and-text">{{ t('common.and') }}</span>
                <AtlasTextField
                  :model-value="attribute.extent"
                  type="number"
                  variant="outlined"
                  hide-details
                  class="value-input"
                  data-testid="attribute-extent-input"
                  @update:model-value="(v) => updateAttributeExtent(index, v as string | number)"
                />
              </template>
            </template>

            <!-- Concept Set Attributes -->
            <template v-else-if="attribute.type === 'conceptSet'">
              <AtlasButton
                v-if="!attribute.conceptSet || !attribute.conceptSet.id"
                variant="secondary"
                size="sm"
                data-testid="attribute-concept-set-picker"
                @click="openConceptSetPickerForAttribute(index)"
              >
                <AtlasIcon class="mr-2">
                  mdi-plus
                </AtlasIcon>
                {{ t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value }}
              </AtlasButton>
              <AtlasChip
                v-else
                closable
                tone="primary"
                data-testid="attribute-selected-concept-set"
                style="cursor: pointer"
                @click="openConceptSetPickerForAttribute(index)"
                @close="clearConceptSetAttribute(index)"
              >
                {{ attribute.conceptSet.name }}
              </AtlasChip>
              <AtlasCheckbox
                :model-value="attribute.isExclusion ?? false"
                hide-details
                :label="t('components.conceptAddBox.exclude', 'Exclude').value"
                class="ml-2"
                data-testid="attribute-exclude-checkbox"
                @update:model-value="(v) => updateAttributeExclude(index, v)"
              />
            </template>

            <!-- Date Range Attributes -->
            <template v-else-if="attribute.type === 'dateRange'">
              <AtlasSelect
                :model-value="attribute.operator"
                :items="[...dateOperators]"
                item-title="label"
                item-value="value"
                variant="outlined"
                hide-details
                class="operator-select"
                data-testid="attribute-operator-selector"
                @update:model-value="(v) => updateAttributeOperator(index, v as string)"
              />

              <AtlasTextField
                v-if="
                  attribute.type === 'dateRange' &&
                    (attribute.operator === 'BETWEEN' || attribute.operator === 'AFTER')
                "
                :model-value="attribute.value"
                type="date"
                variant="outlined"
                hide-details
                class="value-input"
                data-testid="attribute-start-date-input"
                @update:model-value="updateAttributeValue(index, $event)"
              />

              <template v-if="attribute.type === 'dateRange' && attribute.operator === 'BETWEEN'">
                <span class="and-text">{{ t('common.and') }}</span>
                <AtlasTextField
                  :model-value="attribute.extent"
                  type="date"
                  variant="outlined"
                  hide-details
                  class="value-input"
                  data-testid="attribute-end-date-input"
                  @update:model-value="updateAttributeExtent(index, $event)"
                />
              </template>

              <AtlasTextField
                v-if="attribute.type === 'dateRange' && attribute.operator === 'BEFORE'"
                :model-value="attribute.value"
                type="date"
                variant="outlined"
                hide-details
                class="value-input"
                data-testid="attribute-date-input"
                @update:model-value="updateAttributeValue(index, $event)"
              />
            </template>

            <!-- Text Attributes -->
            <template v-else-if="attribute.type === 'text'">
              <AtlasSelect
                :model-value="attribute.operator"
                :items="[...textOperators]"
                item-title="label"
                item-value="value"
                variant="outlined"
                hide-details
                class="operator-select"
                data-testid="attribute-text-operator-selector"
                @update:model-value="(v) => updateAttributeOperator(index, v as string)"
              />

              <AtlasTextField
                :model-value="attribute.value"
                :error="attributeErrors[index] || undefined"
                variant="outlined"
                class="value-input"
                :placeholder="t('components.attributesEditor.enterTextValue', 'Enter text value...').value"
                data-testid="attribute-text-value-input"
                @blur="validateTextAttribute(index)"
                @update:model-value="(v) => updateAttributeValue(index, v as string)"
              />
            </template>

            <!-- Boolean Attributes -->
            <template v-else-if="attribute.type === 'boolean'">
              <AtlasChip
                tone="success"
                variant="outlined"
                size="sm"
                prepend-icon="mdi-check-circle"
                data-testid="attribute-boolean-chip"
              >
                {{ getAttributeLabel(attribute.attributeKey) }}
              </AtlasChip>
            </template>

            <!-- Concept Attributes (Multiple Concepts) -->
            <template v-else-if="attribute.type === 'concept'">
              <div class="d-flex flex-wrap gap-2 align-center">
                <AtlasChip
                  v-for="(concept, conceptIndex) in attribute.concepts"
                  :key="concept.CONCEPT_ID"
                  closable
                  tone="primary"
                  size="sm"
                  data-testid="attribute-selected-concept"
                  @close="removeConceptFromAttribute(index, conceptIndex)"
                >
                  {{ concept.CONCEPT_NAME }}
                </AtlasChip>
                <AtlasButton
                  variant="secondary"
                  size="sm"
                  data-testid="attribute-concept-picker"
                  @click="openConceptPickerForAttribute(index)"
                >
                  <AtlasIcon class="mr-2">
                    mdi-plus
                  </AtlasIcon>
                  {{ attribute.concepts.length > 0 ? t('components.attributesEditor.edit', 'Edit').value : t('components.conceptPicker.selectConcept', 'Select Concept').value }}
                </AtlasButton>
                <AtlasCheckbox
                  :model-value="attribute.isExclusion ?? false"
                  hide-details
                  :label="t('components.conceptAddBox.exclude', 'Exclude').value"
                  class="ml-2"
                  data-testid="attribute-exclude-checkbox"
                  @update:model-value="(v) => updateAttributeExclude(index, v)"
                />
              </div>
            </template>

            <!-- Temporal Relationship Attributes -->
            <template v-else-if="attribute.type === 'temporalRelationship'">
              <TemporalFilterChip
                v-if="
                  attribute.temporalWindow &&
                    (attribute.temporalWindow.startWindow || attribute.temporalWindow.endWindow)
                "
                :label="getTemporalWindowSummary(attribute.temporalWindow)"
                :closable="false"
                data-testid="attribute-temporal-chip"
                @click="openTemporalEditor(index)"
              />
              <AtlasButton
                v-else
                variant="secondary"
                size="sm"
                icon="mdi-clock-plus-outline"
                data-testid="attribute-temporal-add-button"
                @click="openTemporalEditor(index)"
              >
                {{ t('components.criteriaGroup.addTemporalWindow', 'Add Temporal Window').value }}
              </AtlasButton>
            </template>

            <!-- Date Adjustment Attributes -->
            <template v-else-if="attribute.type === 'dateAdjustment'">
              <AtlasChip
                v-if="attribute.dateAdjustment"
                tone="primary"
                variant="outlined"
                size="sm"
                prepend-icon="mdi-calendar-edit"
                data-testid="attribute-date-adjustment-chip"
                style="cursor: pointer"
                @click="openDateAdjustmentEditor(index)"
              >
                {{ getDateAdjustmentSummary(attribute.dateAdjustment) }}
              </AtlasChip>
              <AtlasButton
                v-else
                variant="secondary"
                size="sm"
                icon="mdi-calendar-plus"
                data-testid="attribute-date-adjustment-add-button"
                @click="openDateAdjustmentEditor(index)"
              >
                {{ t('components.attributesEditor.addDateAdjustment', 'Add Date Adjustment').value }}
              </AtlasButton>
            </template>

            <!-- User Defined Period Attributes -->
            <template v-else-if="attribute.type === 'userDefinedPeriod'">
              <AtlasTextField
                :model-value="attribute.period.startDate"
                :error="attributeErrors[index] || undefined"
                type="date"
                :label="t('attributes.startDate.name', 'Start Date').value"
                variant="outlined"
                class="value-input"
                data-testid="attribute-period-start-date"
                @blur="validatePeriodDates(index)"
                @update:model-value="(v) => updatePeriodStartDate(index, v as string)"
              />
              <span class="and-text">{{ t('common.toSeparator', 'to') }}</span>
              <AtlasTextField
                :model-value="attribute.period.endDate"
                type="date"
                :label="t('attributes.endDate.name', 'End Date').value"
                variant="outlined"
                class="value-input"
                data-testid="attribute-period-end-date"
                @blur="validatePeriodDates(index)"
                @update:model-value="(v) => updatePeriodEndDate(index, v as string)"
              />
            </template>
          </div>

          <!-- Delete Button (Right Side) -->
          <div class="attribute-actions">
            <AtlasIconButton
              icon="mdi-delete"
              v-bind="{ ariaLabel: t('components.attributesEditor.removeAttribute', 'Remove attribute').value }"
              variant="text"
              size="sm"
              data-testid="remove-attribute-button"
              @click="removeAttribute(index)"
            />
          </div>
        </template>
      </div>
    </div>

    <AtlasDialog
      v-model="temporalEditorOpen"
      chromeless
      max-width="600"
      scrollable
    >
      <TemporalWindowEditor
        v-if="temporalEditorOpen && selectedTemporalIndex !== -1"
        :model-value="getTemporalWindowValue(selectedTemporalIndex)"
        @update:model-value="updateTemporalWindow"
      />
    </AtlasDialog>

    <AtlasDialog
      v-model="dateAdjustmentEditorOpen"
      chromeless
      max-width="500"
      scrollable
    >
      <DateAdjustmentEditor
        v-if="dateAdjustmentEditorOpen && selectedDateAdjustmentIndex !== -1"
        :model-value="getDateAdjustmentValue(selectedDateAdjustmentIndex)"
        @update:model-value="updateDateAdjustment"
      />
    </AtlasDialog>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasCheckbox, AtlasChip, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasSelect, AtlasTextField } from '@/components/ui'
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAttributeConfig } from '@/composables/useAttributeConfig'
import { useCriteriaSelection } from '@/composables/useCriteriaSelection'
import TemporalWindowEditor from '@/components/cohort-builder/TemporalWindowEditor.vue'
import DateAdjustmentEditor from '@/components/cohort-builder/DateAdjustmentEditor.vue'
import TemporalFilterChip from '@/components/cohort-builder/TemporalFilterChip.vue'
import { TEXT_OPERATORS, NUMERIC_OPERATORS, DATE_OPERATORS } from '@/constants/attribute-operators'
import type {
  EventAttribute,
  TemporalWindow,
  DateAdjustment,
  NumericRangeAttribute,
  DateRangeAttribute,
  TextAttribute,
  NumericOperator,
  DateOperator,
  Concept,
} from '@/models/event.types'
import type { CriteriaType } from '@/models/cohort.types'

const { t, tv } = useI18n()

interface Props {
  modelValue: EventAttribute[]
  criteriaType: CriteriaType
  section?: string // Optional section context (e.g., 'initialEvents', 'criteriaGroup')
  hasNestedCriteria?: boolean // Whether the event already has nested criteria
}

const props = withDefaults(defineProps<Props>(), {
  section: 'criteriaGroup', // Default to criteria group context
  hasNestedCriteria: false,
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
const { getAttributeLabel, getAttribute } = useAttributeConfig(criteriaTypeKey, sectionRef)

// Watch for criteriaType changes and update the key
watch(
  () => props.criteriaType,
  newType => {
    criteriaTypeKey.value = toCamelCase(newType)
  }
)

// Watch for undefined values in modelValue and clean them up
// Also validate operators and apply defaults if missing
watch(
  () => props.modelValue,
  newValue => {
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
          const numAttr = attr as NumericRangeAttribute
          cleaned.push({ ...numAttr, operator: 'GREATER_THAN_OR_EQUAL' })
        } else {
          cleaned.push(attr)
        }
      } else if (attr.type === 'dateRange') {
        if (!attr.operator) {
          needsUpdate = true
          const dateAttr = attr as DateRangeAttribute
          cleaned.push({ ...dateAttr, operator: 'BETWEEN' })
        } else {
          cleaned.push(attr)
        }
      } else if (attr.type === 'text') {
        if (!attr.operator) {
          needsUpdate = true
          const textAttr = attr as TextAttribute
          cleaned.push({ ...textAttr, operator: 'CONTAINS' })
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
  },
  { immediate: true }
)

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

  if (attr.type === 'numericRange') {
    // Clear extent when switching from BETWEEN to single-value operators
    const isBetweenOperator = operator === 'BETWEEN' || operator === 'NOT_BETWEEN'
    const wasExtentSet = 'extent' in attr && attr.extent !== undefined
    const numAttr = attr as NumericRangeAttribute

    if (wasExtentSet && !isBetweenOperator) {
      // Switching from BETWEEN to single-value operator - clear extent
      const { extent: _extent, ...attrWithoutExtent } = numAttr
      newAttributes[index] = { ...attrWithoutExtent, operator: operator as NumericOperator }
    } else {
      newAttributes[index] = { ...numAttr, operator: operator as NumericOperator }
    }
  } else if (attr.type === 'dateRange') {
    // Clear extent when switching from BETWEEN to single-value operators
    const isBetweenOperator = operator === 'BETWEEN' || operator === 'NOT_BETWEEN'
    const wasExtentSet = 'extent' in attr && attr.extent !== undefined
    const dateAttr = attr as DateRangeAttribute

    if (wasExtentSet && !isBetweenOperator) {
      // Switching from BETWEEN to single-value operator - clear extent
      const { extent: _extent, ...attrWithoutExtent } = dateAttr
      newAttributes[index] = { ...attrWithoutExtent, operator: operator as DateOperator }
    } else {
      newAttributes[index] = { ...dateAttr, operator: operator as DateOperator }
    }
  } else if (attr.type === 'text') {
    const textAttr = attr as TextAttribute
    newAttributes[index] = { ...textAttr, operator: operator as TextAttribute['operator'] }
  }

  emit('update:modelValue', newAttributes)
}

function updateAttributeValue(index: number, value: string | number) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr) return
  newAttributes[index] = { ...attr, value } as EventAttribute
  emit('update:modelValue', newAttributes)
}

function updateAttributeExtent(index: number, extent: string | number) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr) return
  if ('extent' in attr) {
    newAttributes[index] = { ...attr, extent } as EventAttribute
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
    attributeErrors.value[index] = tv('components.attributesEditor.pleaseEnterTextValue', 'Please enter a text value')
  } else {
    attributeErrors.value[index] = null
  }
}

function validateNumericAttribute(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'numericRange') return

  if (attr.value === undefined || attr.value === null) {
    attributeErrors.value[index] = tv('components.attributesEditor.pleaseEnterNumericValue', 'Please enter a numeric value')
  } else if (attr.operator === 'BETWEEN' && !attr.extent) {
    attributeErrors.value[index] = tv('components.attributesEditor.betweenRequiresBothValues', 'BETWEEN operator requires both values')
  } else {
    attributeErrors.value[index] = null
  }
}

// Concept attribute handlers.
// When a criteria-selection service is provided (cohort builder), request the
// picker directly and apply the result here — this works at any nesting depth.
// Without a service, fall back to the legacy index-context emit chain.
const selection = useCriteriaSelection()

function openConceptPickerForAttribute(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'concept') return

  // Get the domain filter from attribute config
  const attributeConfig = getAttribute(attr.attributeKey)
  const domainFilter = attributeConfig?.domainFilter

  if (selection) {
    selection.requestConcepts(domainFilter, concepts => applyConceptsToAttribute(index, concepts))
    return
  }
  emit('select-concept-for-attribute', index, domainFilter)
}

function applyConceptsToAttribute(index: number, concepts: Concept[]) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr || attr.type !== 'concept') return

  // Dedupe by CONCEPT_ID — circe treats `Gender IN (8507, 8507)` identically
  // to a single 8507 and the chip UI would show duplicate pills.
  const existing = attr.concepts || []
  const seen = new Set(existing.map(c => c.CONCEPT_ID))
  const merged = [...existing]
  for (const c of concepts) {
    if (!seen.has(c.CONCEPT_ID)) {
      merged.push(c)
      seen.add(c.CONCEPT_ID)
    }
  }
  newAttributes[index] = { ...attr, concepts: merged }
  emit('update:modelValue', newAttributes)
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

  if (selection) {
    selection.requestConceptSet(conceptSet => {
      const newAttributes = [...props.modelValue]
      const target = newAttributes[index]
      if (!target || target.type !== 'conceptSet') return
      newAttributes[index] = {
        ...target,
        conceptSet: { id: conceptSet.id as number, name: conceptSet.name },
      }
      emit('update:modelValue', newAttributes)
    })
    return
  }
  emit('select-concept-set-for-attribute', index)
}

function clearConceptSetAttribute(index: number) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr || attr.type !== 'conceptSet') return

  newAttributes[index] = { ...attr, conceptSet: { id: '', name: '' } }
  emit('update:modelValue', newAttributes)
}

function updateAttributeExclude(index: number, value: boolean | null) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr || (attr.type !== 'concept' && attr.type !== 'conceptSet')) return

  newAttributes[index] = { ...attr, isExclusion: !!value }
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
  // Apply live and keep the dialog open — the editor emits on every field
  // change, so closing here would slam the dialog shut on the first edit.
  // The user dismisses via Esc / outside click, like the popover editors.
}

function getTemporalWindowValue(index: number): TemporalWindow | undefined {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'temporalRelationship') return undefined
  return attr.temporalWindow
}

function getTemporalWindowSummary(temporalWindow?: TemporalWindow): string {
  if (!temporalWindow) return tv('components.attributesEditor.notConfigured', 'Not configured')

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

  return parts.length > 0 ? parts.join(', ') : tv('components.attributesEditor.notConfigured', 'Not configured')
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
  // Apply live and keep the dialog open (see updateTemporalWindow).
}

function getDateAdjustmentValue(index: number): DateAdjustment | undefined {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'dateAdjustment') return undefined
  return attr.dateAdjustment
}

function getDateAdjustmentSummary(dateAdjustment?: DateAdjustment): string {
  if (!dateAdjustment) return tv('components.attributesEditor.notConfigured', 'Not configured')

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
    period: { ...attr.period, startDate },
  }
  emit('update:modelValue', newAttributes)
}

function updatePeriodEndDate(index: number, endDate: string) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (!attr || attr.type !== 'userDefinedPeriod') return

  newAttributes[index] = {
    ...attr,
    period: { ...attr.period, endDate },
  }
  emit('update:modelValue', newAttributes)
}

function validatePeriodDates(index: number) {
  const attr = props.modelValue[index]
  if (!attr || attr.type !== 'userDefinedPeriod') return

  const startDate = new Date(attr.period.startDate)
  const endDate = new Date(attr.period.endDate)

  if (!attr.period.startDate || !attr.period.endDate) {
    attributeErrors.value[index] = tv('components.attributesEditor.bothDatesRequired', 'Both start and end dates are required')
  } else if (endDate <= startDate) {
    attributeErrors.value[index] = tv('components.attributesEditor.endDateAfterStart', 'End date must be after start date')
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

/* #ebf2fa/#d8e6f5 have no exact-match token; light stays byte-identical,
 * dark uses a primary tint over the dark surface. */
.v-theme--dark .attribute-title,
.v-theme--dark .attribute-actions {
  background: color-mix(in srgb, var(--atlas-color-primary) 14%, var(--atlas-color-surface));
}
.v-theme--dark .attribute-actions .v-btn:hover {
  background: color-mix(in srgb, var(--atlas-color-primary) 24%, var(--atlas-color-surface));
}
</style>
