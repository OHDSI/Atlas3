<template>
  <v-card class="attributes-editor">
    <v-card-title class="text-h6">Event Attributes</v-card-title>

    <v-card-text>
      <!-- Attribute List -->
      <v-list v-if="modelValue.length > 0" class="mb-4">
        <v-list-item
          v-for="(attribute, index) in modelValue"
          :key="index"
          class="attribute-item"
        >
          <template #prepend>
            <v-icon>mdi-filter</v-icon>
          </template>

          <v-list-item-title>
            {{ formatAttributeDisplay(attribute) }}
          </v-list-item-title>

          <template #append>
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              data-testid="edit-attribute-button"
              @click="editAttribute(index)"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              data-testid="remove-attribute-button"
              @click="removeAttribute(index)"
            />
          </template>
        </v-list-item>
      </v-list>

      <!-- Empty State -->
      <v-alert v-else type="info" variant="tonal" class="mb-4">
        No attributes added. Click "Add Attribute" to filter events by attributes.
      </v-alert>

      <!-- Add/Edit Attribute Form -->
      <v-expand-transition>
        <v-card v-if="showEditor" variant="outlined" class="mb-4">
          <v-card-text>
            <!-- Attribute Selector -->
            <v-select
              v-model="editingAttribute.attributeKey"
              :items="availableAttributes"
              item-title="label"
              item-value="id"
              label="Attribute"
              data-testid="attribute-selector"
              @update:model-value="onAttributeTypeChange"
            />

            <!-- Numeric Range Attributes -->
            <template v-if="isNumericAttribute">
              <v-select
                v-model="editingAttribute.operator"
                :items="numericOperators"
                item-title="label"
                item-value="value"
                label="Operator"
                data-testid="attribute-operator-selector"
                @update:model-value="onOperatorChange"
              />

              <v-text-field
                v-model.number="editingAttribute.value"
                type="number"
                label="Value"
                data-testid="attribute-value-input"
              />

              <v-text-field
                v-if="editingAttribute.operator === 'BETWEEN' || editingAttribute.operator === 'NOT_BETWEEN'"
                v-model.number="editingAttribute.extent"
                type="number"
                label="To Value (Extent)"
                data-testid="attribute-extent-input"
              />
            </template>

            <!-- Concept Set Attributes -->
            <template v-else-if="isConceptSetAttribute">
              <v-text-field
                v-model="editingAttribute.conceptSetName"
                label="Concept Set"
                readonly
                data-testid="attribute-concept-set-picker"
                append-icon="mdi-magnify"
                @click:append="openConceptSetPicker"
              />
            </template>

            <!-- Date Range Attributes -->
            <template v-else-if="isDateAttribute">
              <v-select
                v-model="editingAttribute.operator"
                :items="dateOperators"
                item-title="label"
                item-value="value"
                label="Operator"
                data-testid="attribute-operator-selector"
              />

              <v-text-field
                v-if="editingAttribute.operator === 'BETWEEN' || editingAttribute.operator === 'AFTER'"
                v-model="editingAttribute.startDate"
                type="date"
                label="Start Date"
                data-testid="attribute-start-date-input"
              />

              <v-text-field
                v-if="editingAttribute.operator === 'BETWEEN' || editingAttribute.operator === 'BEFORE'"
                v-model="editingAttribute.endDate"
                type="date"
                label="End Date"
                data-testid="attribute-end-date-input"
              />
            </template>

            <!-- Validation Errors -->
            <v-alert v-if="validationError" type="error" class="mt-2">
              {{ validationError }}
            </v-alert>

            <!-- Action Buttons -->
            <v-card-actions>
              <v-btn
                color="primary"
                variant="flat"
                @click="saveAttribute"
              >
                {{ editingIndex !== null ? 'Update Attribute' : 'Save Attribute' }}
              </v-btn>
              <v-btn
                variant="text"
                @click="cancelEdit"
              >
                Cancel
              </v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>
      </v-expand-transition>

      <!-- Add Attribute Button -->
      <v-btn
        v-if="!showEditor"
        color="primary"
        variant="outlined"
        prepend-icon="mdi-plus"
        data-testid="add-attribute-button"
        @click="addAttribute"
      >
        Add Attribute
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type {
  EventAttribute,
  NumericRangeAttribute,
  ConceptSetAttribute,
  DateRangeAttribute,
  NumericOperator,
  NumericAttributeKey,
  ConceptAttributeKey,
  DateAttributeKey
} from '@/models/event.types'
import type { CriteriaType } from '@/models/cohort.types'

interface Props {
  modelValue: EventAttribute[]
  criteriaType: CriteriaType
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: EventAttribute[]]
}>()

// Editor state
const showEditor = ref(false)
const editingIndex = ref<number | null>(null)
const validationError = ref<string>('')

// Editing attribute state
const editingAttribute = ref<any>({
  attributeKey: '',
  operator: '',
  value: null,
  extent: null,
  conceptSetId: null,
  conceptSetName: '',
  startDate: '',
  endDate: '',
})

// Available attributes by criteria type
const availableAttributes = computed(() => {
  const commonAttributes = [
    { id: 'age', label: 'Age', type: 'numeric' },
    { id: 'gender', label: 'Gender', type: 'conceptSet' },
  ]

  const typeSpecificAttributes: Record<string, any[]> = {
    ConditionOccurrence: [
      { id: 'conditionType', label: 'Condition Type', type: 'conceptSet' },
      { id: 'conditionStatus', label: 'Condition Status', type: 'conceptSet' },
      { id: 'occurrenceStartDate', label: 'Occurrence Start Date', type: 'date' },
    ],
    DrugExposure: [
      { id: 'drugType', label: 'Drug Type', type: 'conceptSet' },
      { id: 'quantity', label: 'Quantity', type: 'numeric' },
      { id: 'days', label: 'Days Supply', type: 'numeric' },
      { id: 'doseValue', label: 'Dose Value', type: 'numeric' },
    ],
    Measurement: [
      { id: 'valueAsNumber', label: 'Value as Number', type: 'numeric' },
      { id: 'valueAsConcept', label: 'Value as Concept', type: 'conceptSet' },
      { id: 'rangeLow', label: 'Range Low', type: 'numeric' },
      { id: 'rangeHigh', label: 'Range High', type: 'numeric' },
      { id: 'measurementDate', label: 'Measurement Date', type: 'date' },
    ],
    ProcedureOccurrence: [
      { id: 'procedureType', label: 'Procedure Type', type: 'conceptSet' },
      { id: 'procedureDate', label: 'Procedure Date', type: 'date' },
    ],
    Observation: [
      { id: 'valueAsNumber', label: 'Value as Number', type: 'numeric' },
      { id: 'valueAsString', label: 'Value as String', type: 'text' },
      { id: 'valueAsConcept', label: 'Value as Concept', type: 'conceptSet' },
    ],
    VisitOccurrence: [
      { id: 'visitType', label: 'Visit Type', type: 'conceptSet' },
      { id: 'visitStartDate', label: 'Visit Start Date', type: 'date' },
      { id: 'visitEndDate', label: 'Visit End Date', type: 'date' },
    ],
  }

  return [
    ...commonAttributes,
    ...(typeSpecificAttributes[props.criteriaType] || []),
  ]
})

// Operator lists
const numericOperators = [
  { value: 'GREATER_THAN', label: 'Greater Than (>)' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Greater Than or Equal (>=)' },
  { value: 'LESS_THAN', label: 'Less Than (<)' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Less Than or Equal (<=)' },
  { value: 'EQUAL', label: 'Equal (=)' },
  { value: 'NOT_EQUAL', label: 'Not Equal (!=)' },
  { value: 'BETWEEN', label: 'Between' },
  { value: 'NOT_BETWEEN', label: 'Not Between' },
]

const dateOperators = [
  { value: 'BETWEEN', label: 'Between' },
  { value: 'BEFORE', label: 'Before' },
  { value: 'AFTER', label: 'After' },
]

// Computed attribute type checks
const isNumericAttribute = computed(() => {
  const attr = availableAttributes.value.find(a => a.id === editingAttribute.value.attributeKey)
  return attr?.type === 'numeric'
})

const isConceptSetAttribute = computed(() => {
  const attr = availableAttributes.value.find(a => a.id === editingAttribute.value.attributeKey)
  return attr?.type === 'conceptSet'
})

const isDateAttribute = computed(() => {
  const attr = availableAttributes.value.find(a => a.id === editingAttribute.value.attributeKey)
  return attr?.type === 'date'
})

// Methods
function addAttribute() {
  showEditor.value = true
  editingIndex.value = null
  resetEditingAttribute()
}

function editAttribute(index: number) {
  showEditor.value = true
  editingIndex.value = index
  const attr = props.modelValue[index]
  if (!attr) return

  // Load attribute into editor
  editingAttribute.value.attributeKey = attr.attributeKey

  if (attr.type === 'numericRange') {
    const numericAttr = attr as NumericRangeAttribute
    editingAttribute.value.operator = numericAttr.operator
    editingAttribute.value.value = numericAttr.value
    editingAttribute.value.extent = numericAttr.extent
  } else if (attr.type === 'conceptSet') {
    const conceptAttr = attr as ConceptSetAttribute
    editingAttribute.value.conceptSetId = conceptAttr.conceptSet.id
    editingAttribute.value.conceptSetName = conceptAttr.conceptSet.name
  } else if (attr.type === 'dateRange') {
    const dateAttr = attr as DateRangeAttribute
    editingAttribute.value.operator = dateAttr.operator
    editingAttribute.value.value = dateAttr.value
    editingAttribute.value.extent = dateAttr.extent
  }
}

function removeAttribute(index: number) {
  const newAttributes = [...props.modelValue]
  newAttributes.splice(index, 1)
  emit('update:modelValue', newAttributes)
}

function saveAttribute() {
  validationError.value = ''

  // Validate
  const validation = validateAttribute()
  if (!validation.isValid) {
    validationError.value = validation.error
    return
  }

  // Build attribute object
  const attr = buildAttributeObject()

  // Update or add
  const newAttributes = [...props.modelValue]
  if (editingIndex.value !== null) {
    newAttributes[editingIndex.value] = attr
  } else {
    newAttributes.push(attr)
  }

  emit('update:modelValue', newAttributes)
  cancelEdit()
}

function cancelEdit() {
  showEditor.value = false
  editingIndex.value = null
  validationError.value = ''
  resetEditingAttribute()
}

function resetEditingAttribute() {
  editingAttribute.value = {
    attributeKey: '',
    operator: '',
    value: null,
    extent: null,
    conceptSetId: null,
    conceptSetName: '',
    startDate: '',
    endDate: '',
  }
}

function onAttributeTypeChange() {
  // Reset operator and values when attribute type changes
  editingAttribute.value.operator = ''
  editingAttribute.value.value = null
  editingAttribute.value.extent = null
}

function onOperatorChange() {
  // Reset extent when operator changes away from BETWEEN
  if (editingAttribute.value.operator !== 'BETWEEN' && editingAttribute.value.operator !== 'NOT_BETWEEN') {
    editingAttribute.value.extent = null
  }
}

function validateAttribute(): { isValid: boolean; error: string } {
  if (!editingAttribute.value.attributeKey) {
    return { isValid: false, error: 'Please select an attribute' }
  }

  if (isNumericAttribute.value) {
    if (!editingAttribute.value.operator) {
      return { isValid: false, error: 'Please select an operator' }
    }
    if (editingAttribute.value.value === null || editingAttribute.value.value === '') {
      return { isValid: false, error: 'Please enter a value' }
    }
    if ((editingAttribute.value.operator === 'BETWEEN' || editingAttribute.value.operator === 'NOT_BETWEEN')
        && (editingAttribute.value.extent === null || editingAttribute.value.extent === '')) {
      return { isValid: false, error: 'Extent value required for BETWEEN operator' }
    }
  } else if (isConceptSetAttribute.value) {
    if (!editingAttribute.value.conceptSetId) {
      return { isValid: false, error: 'Please select a concept set' }
    }
  } else if (isDateAttribute.value) {
    if (!editingAttribute.value.operator) {
      return { isValid: false, error: 'Please select an operator' }
    }
    if (editingAttribute.value.operator === 'BETWEEN' && (!editingAttribute.value.startDate || !editingAttribute.value.endDate)) {
      return { isValid: false, error: 'Start and end dates required for BETWEEN operator' }
    }
  }

  return { isValid: true, error: '' }
}

function buildAttributeObject(): EventAttribute {
  if (isNumericAttribute.value) {
    return {
      type: 'numericRange',
      attributeKey: editingAttribute.value.attributeKey as NumericAttributeKey,
      operator: editingAttribute.value.operator as NumericOperator,
      value: editingAttribute.value.value,
      extent: editingAttribute.value.extent,
    } as NumericRangeAttribute
  } else if (isConceptSetAttribute.value) {
    return {
      type: 'conceptSet',
      attributeKey: editingAttribute.value.attributeKey as ConceptAttributeKey,
      conceptSet: {
        id: editingAttribute.value.conceptSetId,
        name: editingAttribute.value.conceptSetName,
      },
    } as ConceptSetAttribute
  } else if (isDateAttribute.value) {
    return {
      type: 'dateRange',
      attributeKey: editingAttribute.value.attributeKey as DateAttributeKey,
      operator: editingAttribute.value.operator,
      value: editingAttribute.value.startDate || editingAttribute.value.value,
      extent: editingAttribute.value.endDate || editingAttribute.value.extent,
    } as DateRangeAttribute
  }

  throw new Error('Unknown attribute type')
}

function getAttributeLabel(attributeKey: string): string {
  const attr = availableAttributes.value.find(a => a.id === attributeKey)
  return attr?.label || attributeKey
}

function formatAttributeDisplay(attribute: EventAttribute): string {
  const label = getAttributeLabel(attribute.attributeKey)

  if (attribute.type === 'numericRange') {
    const operatorSymbol: Record<string, string> = {
      GREATER_THAN: '>',
      GREATER_THAN_OR_EQUAL: '>=',
      LESS_THAN: '<',
      LESS_THAN_OR_EQUAL: '<=',
      EQUAL: '=',
      NOT_EQUAL: '!=',
    }

    if (attribute.operator === 'BETWEEN') {
      return `${label}: ${attribute.value} to ${attribute.extent}`
    } else {
      return `${label} ${operatorSymbol[attribute.operator]} ${attribute.value}`
    }
  } else if (attribute.type === 'conceptSet') {
    return `${label}: ${attribute.conceptSet.name}`
  } else if (attribute.type === 'dateRange') {
    if (attribute.operator === 'BETWEEN') {
      return `${label}: ${attribute.value} to ${attribute.extent}`
    } else if (attribute.operator === 'LESS_THAN') {
      return `${label} before ${attribute.value}`
    } else if (attribute.operator === 'GREATER_THAN') {
      return `${label} after ${attribute.value}`
    }
  }

  return label
}

function openConceptSetPicker() {
  // TODO: Implement concept set picker dialog
  // For now, use a mock concept set
  editingAttribute.value.conceptSetId = 8507
  editingAttribute.value.conceptSetName = 'Male'
}
</script>

<style scoped>
.attributes-editor {
  margin-top: 16px;
}

.attribute-item {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
}
</style>
