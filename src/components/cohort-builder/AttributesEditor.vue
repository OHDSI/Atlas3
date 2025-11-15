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
              v-if="attribute.type === 'dateRange' && (attribute.operator === 'BETWEEN' || attribute.operator === 'GREATER_THAN')"
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
              v-if="attribute.type === 'dateRange' && (attribute.operator === 'BETWEEN' || attribute.operator === 'LESS_THAN')"
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
          {{ t('components.common.addAttribute') }}
        </v-btn>
      </template>
      <v-list>
        <v-list-item
          v-for="attr in availableAttributes"
          :key="attr.key"
          :title="attr.label"
          :subtitle="attr.description"
          @click="addAttributeOfType(attr.key, attr.type)"
        />
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAttributeConfig } from '@/composables/useAttributeConfig'
import type {
  EventAttribute
} from '@/models/event.types'
import type { CriteriaType } from '@/models/cohort.types'

const { t } = useI18n()

interface Props {
  modelValue: EventAttribute[]
  criteriaType: CriteriaType
  section?: string // Optional section context (e.g., 'initialEvents', 'criteriaGroup')
}

const props = withDefaults(defineProps<Props>(), {
  section: 'criteriaGroup' // Default to criteria group context
})

const emit = defineEmits<{
  'update:modelValue': [value: EventAttribute[]]
}>()

// Convert PascalCase criteriaType to camelCase for config lookup
// e.g., 'ConditionOccurrence' -> 'conditionOccurrence'
const toCamelCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

// Use attribute configuration composable
const criteriaTypeKey = ref(toCamelCase(props.criteriaType))
const sectionRef = ref(props.section)
const { attributes, getAttributeLabel } = useAttributeConfig(
  criteriaTypeKey,
  sectionRef
)

// Watch for criteriaType changes and update the key
watch(() => props.criteriaType, (newType) => {
  criteriaTypeKey.value = toCamelCase(newType)
})

// Transform configuration attributes to match legacy availableAttributes format
// This maintains backward compatibility with existing component logic
// Note: getAttributeDescription is used internally by the composable to populate descriptions
const availableAttributes = attributes

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
  if (!attr) return
  if (attr.type === 'numericRange' || attr.type === 'dateRange') {
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

function addAttributeOfType(attributeKey: string, attributeType: string) {
  // Create a default attribute based on the type
  let newAttribute: any
  if (attributeType === 'numericRange') {
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
  } else if (attributeType === 'dateRange') {
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

// Note: getAttributeLabel is now provided by useAttributeConfig composable
// and is already exposed for use in template

function openConceptSetPicker() {
  // TODO: Implement concept set picker dialog
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
