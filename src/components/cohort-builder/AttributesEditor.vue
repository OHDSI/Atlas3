<template>
  <div class="attributes-editor">
    <!-- Attribute List - Always Visible (No Inline Editing) -->
    <div v-if="modelValue.length > 0" class="attributes-list">
      <div
        v-for="(attribute, index) in modelValue"
        :key="index"
        class="attribute-container mb-3"
      >
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
              type="number"
              density="compact"
              variant="outlined"
              hide-details
              class="value-input"
              data-testid="attribute-value-input"
              @update:model-value="updateAttributeValue(index, $event)"
            />

            <template v-if="attribute.operator === 'BETWEEN' || attribute.operator === 'NOT_BETWEEN'">
              <span class="and-text">and</span>
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
            <v-text-field
              :model-value="attribute.conceptSet.name"
              readonly
              density="compact"
              variant="outlined"
              hide-details
              data-testid="attribute-concept-set-picker"
              append-icon="mdi-magnify"
              @click:append="openConceptSetPicker"
            />
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
              v-if="attribute.operator === 'BETWEEN' || attribute.operator === 'AFTER'"
              :model-value="attribute.value"
              type="date"
              density="compact"
              variant="outlined"
              hide-details
              class="value-input"
              data-testid="attribute-start-date-input"
              @update:model-value="updateAttributeValue(index, $event)"
            />

            <v-text-field
              v-if="attribute.operator === 'BETWEEN' || attribute.operator === 'BEFORE'"
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
      </div>
    </div>

    <!-- Add Attribute Button -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          color="primary"
          variant="outlined"
          size="small"
          prepend-icon="mdi-plus"
          data-testid="add-attribute-button"
        >
          Add Attribute
        </v-btn>
      </template>
      <v-list>
        <v-list-item
          v-for="attr in availableAttributes"
          :key="attr.id"
          :title="attr.label"
          @click="addAttributeOfType(attr.id, attr.type)"
        />
      </v-list>
    </v-menu>
  </div>
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

// No editing state needed - attributes are always visible

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

// Methods for direct attribute updates
function updateAttributeOperator(index: number, operator: string) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if (attr.type === 'numericRange' || attr.type === 'dateRange') {
    newAttributes[index] = { ...attr, operator: operator as any }
  }
  emit('update:modelValue', newAttributes)
}

function updateAttributeValue(index: number, value: any) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  newAttributes[index] = { ...attr, value }
  emit('update:modelValue', newAttributes)
}

function updateAttributeExtent(index: number, extent: any) {
  const newAttributes = [...props.modelValue]
  const attr = newAttributes[index]
  if ('extent' in attr) {
    newAttributes[index] = { ...attr, extent }
  }
  emit('update:modelValue', newAttributes)
}

function addAttributeOfType(attributeKey: string, attributeType: string) {
  // Create a default attribute based on the type
  let newAttribute: any
  if (attributeType === 'numeric') {
    newAttribute = {
      type: 'numericRange',
      attributeKey,
      operator: 'GREATER_THAN_OR_EQUAL',
      value: 0,
    }
  } else if (attributeType === 'conceptSet') {
    newAttribute = {
      type: 'conceptSet',
      attributeKey,
      conceptSet: { id: '', name: '' },
    }
  } else if (attributeType === 'date') {
    newAttribute = {
      type: 'dateRange',
      attributeKey,
      operator: 'AFTER',
      value: new Date().toISOString().split('T')[0],
    }
  } else if (attributeType === 'text') {
    newAttribute = {
      type: 'text',
      attributeKey,
      operator: 'CONTAINS',
      value: '',
    }
  }

  // Add the new attribute to the list
  const updatedAttributes = [...props.modelValue, newAttribute]
  emit('update:modelValue', updatedAttributes)
}

function removeAttribute(index: number) {
  const newAttributes = [...props.modelValue]
  newAttributes.splice(index, 1)
  emit('update:modelValue', newAttributes)
}

function getAttributeLabel(attributeKey: string): string {
  const attr = availableAttributes.value.find(a => a.id === attributeKey)
  return attr?.label || attributeKey
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
  padding: 15px;
  flex: 1;
  max-width: 20%;
  color: rgb(var(--v-theme-primary));
  background: #ebf2fa;
  font-size: 15px;
  font-weight: 500;
  border-right: 1px solid rgb(var(--v-theme-primary));
}

.attribute-input {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 15px;
  flex: 2;
  border-right: 1px solid rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-primary));
}

.attribute-input .operator-select {
  min-width: 200px;
  max-width: 200px;
}

.attribute-input .value-input {
  min-width: 80px;
  max-width: 120px;
}

.attribute-input .and-text {
  font-size: 14px;
  color: rgb(var(--v-theme-primary));
}

.attribute-actions {
  display: flex;
  align-items: center;
  background: #ebf2fa;
  padding: 0 8px;
}

.attribute-actions .v-btn {
  transition: all 0.2s ease;
}

.attribute-actions .v-btn:hover {
  background: #d8e6f5;
}
</style>
