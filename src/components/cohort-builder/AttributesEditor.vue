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
        </template>
      </div>
    </div>
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
  hasNestedCriteria?: boolean // Whether the event already has nested criteria
}

const props = withDefaults(defineProps<Props>(), {
  section: 'criteriaGroup', // Default to criteria group context
  hasNestedCriteria: false
})

const emit = defineEmits<{
  'update:modelValue': [value: EventAttribute[]]
  'add-nested-criteria': []
}>()

// Convert PascalCase criteriaType to camelCase for config lookup
// e.g., 'ConditionOccurrence' -> 'conditionOccurrence'
const toCamelCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

// Use attribute configuration composable
const criteriaTypeKey = ref(toCamelCase(props.criteriaType))
const sectionRef = ref(props.section)
const { getAttributeLabel } = useAttributeConfig(
  criteriaTypeKey,
  sectionRef
)

// Watch for criteriaType changes and update the key
watch(() => props.criteriaType, (newType) => {
  criteriaTypeKey.value = toCamelCase(newType)
})

// Watch for undefined values in modelValue and clean them up
watch(() => props.modelValue, (newValue) => {
  const hasUndefined = newValue.some(attr => attr === undefined || attr === null)
  if (hasUndefined) {
    // Filter out undefined/null values
    const cleaned = newValue.filter(attr => attr !== undefined && attr !== null)
    emit('update:modelValue', cleaned)
  }
}, { immediate: true })

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

function removeAttribute(index: number) {
  const newAttributes = [...props.modelValue]
  newAttributes.splice(index, 1)
  emit('update:modelValue', newAttributes)
}

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
