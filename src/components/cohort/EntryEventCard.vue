<template>
  <div
    data-testid="entry-event-card"
    class="event-card mb-3"
  >
    <!-- Cardinality Sidebar -->
    <div
      class="cardinality-sidebar"
      :class="`cardinality-${cardinalityType}`"
    >
      <div class="cardinality-label">
        {{ cardinalityDisplay }}
      </div>
    </div>

    <!-- Event Content -->
    <div class="event-content">
      <!-- Event Header -->
      <div class="event-header">
        <div class="event-header__left">
          <div class="event-type-indicator">
            <span class="event-type-label">{{ eventTypeLabel }}</span>
          </div>
        </div>
        <div class="event-header__right">
          <v-menu>
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
            <v-list>
              <v-list-item
                v-for="attr in availableAttributes"
                :key="attr.key"
                :title="attr.label"
                :subtitle="attr.description"
                :disabled="attr.type === 'nested' && !!props.event.nestedCriteria"
                @click="addAttribute(attr.key, attr.type)"
              />
            </v-list>
          </v-menu>
          <v-btn
            icon
            size="small"
            variant="text"
            color="primary"
            @click="emit('remove')"
          >
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Event Body -->
      <div class="event-body">
          <!-- Event Concept Set -->
          <div class="concept-set-section">
            <div
              v-if="event.conceptSet"
              class="concept-set-selected"
            >
              <v-chip
                closable
                color="primary"
                style="cursor: pointer;"
                @click="emit('edit-concept-set', event.conceptSet)"
                @click:close="removeConceptSet"
              >
                {{ event.conceptSet.name }}
              </v-chip>
            </div>
            <v-btn
              v-else
              color="primary"
              variant="outlined"
              size="small"
              data-testid="concept-set-picker"
              @click="emit('select-concept-set')"
            >
              <v-icon class="mr-2">
                mdi-plus
              </v-icon>
              {{ t('components.conceptSetBuilder.selectConceptSet', 'Select Concept Set') }}
            </v-btn>
          </div>

          <!-- Attributes Section -->
          <div class="attributes-section mt-3">
            <AttributesEditor
              :model-value="event.attributes || []"
              :criteria-type="event.criteriaType"
              section="initialEvents"
              :has-nested-criteria="!!event.nestedCriteria"
              :cardinality="event.cardinality"
              :temporal-window="event.temporalWindow"
              @update:model-value="updateAttributes"
              @update:cardinality="updateCardinality"
              @update:temporal-window="updateTemporalWindows"
              @add-nested-criteria="addNestedCriteria"
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
              @update:model-value="updateNestedCriteria"
              @remove="removeNestedCriteria"
              @select-concept-set="emit('select-concept-set')"
            />
          </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'
import { useAttributeConfig } from '@/composables/useAttributeConfig'
import type { CohortEvent, CriteriaType, NestedCriteria } from '@/models/cohort.types'
import type { EventAttribute } from '@/models/event.types'
import AttributesEditor from '@/components/cohort-builder/AttributesEditor.vue'
import NestedCriteriaEditor from '@/components/cohort-builder/NestedCriteriaEditor.vue'

interface Props {
  event: CohortEvent
}

const props = defineProps<Props>()
const { t, tv } = useI18n()

const emit = defineEmits<{
  'update': [event: CohortEvent]
  'remove': []
  'select-concept-set': []
  'edit-concept-set': [conceptSet: any]
}>()

// Use configuration-driven filter list (supports all 16 filter types)
const { availableFilters } = useFilterConfig(ref('initialEvents'))

const eventTypeOptions = computed(() => {
  return availableFilters.value.map(filter => ({
    label: filter.name,
    value: filter.criteriaType as CriteriaType
  }))
})

const eventTypeLabel = computed(() => {
  const option = eventTypeOptions.value.find(opt => opt.value === props.event.criteriaType)
  return option?.label ?? t('components.cohortExpressionEditor.cohortEntryEvents')
})

const cardinalityType = computed(() => {
  if (!props.event.cardinality) return 'at_least'
  return props.event.cardinality.type.toLowerCase().replace(/_/g, '_')
})

const cardinalityDisplay = computed(() => {
  if (!props.event.cardinality) return `${t('options.atLeast', 'At least')} 1`
  const typeMap: Record<string, string> = {
    'AT_LEAST': tv('options.atLeast', 'At least'),
    'EXACTLY': tv('options.exactly', 'Exactly'),
    'AT_MOST': tv('options.atMost', 'At most')
  }
  const type = typeMap[props.event.cardinality.type] || t('options.atLeast', 'At least')
  return `${type} ${props.event.cardinality.count ?? 1}`
})

// Helper to convert PascalCase to camelCase for config lookup
const toCamelCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

// Get available attributes for the event
const criteriaTypeKey = computed(() => toCamelCase(props.event.criteriaType))
const sectionRef = ref('initialEvents')
const { attributes: availableAttributes } = useAttributeConfig(criteriaTypeKey, sectionRef)


function removeConceptSet() {
  emit('update', {
    ...props.event,
    conceptSet: undefined,
  })
}

function updateCardinality(cardinality: CohortEvent['cardinality']) {
  emit('update', {
    ...props.event,
    cardinality,
  })
}

function updateTemporalWindows(temporalWindow: CohortEvent['temporalWindow']) {
  emit('update', {
    ...props.event,
    temporalWindow,
  })
}

function updateAttributes(attributes: EventAttribute[]) {
  emit('update', {
    ...props.event,
    attributes,
  })
}

function addNestedCriteria() {
  emit('update', {
    ...props.event,
    nestedCriteria: {
      id: uuidv4(),
      logicType: 'ALL',
      events: []
    }
  })
}

function updateNestedCriteria(nested: NestedCriteria) {
  emit('update', {
    ...props.event,
    nestedCriteria: nested
  })
}

function removeNestedCriteria() {
  const updated = { ...props.event }
  delete updated.nestedCriteria
  emit('update', updated)
}

function addAttribute(attributeKey: string, attributeType: string) {
  // Handle nested criteria type specially - emit event instead of adding attribute
  if (attributeType === 'nested') {
    addNestedCriteria()
    return
  }

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

  // Add the new attribute to the event
  const currentAttributes = props.event.attributes || []
  emit('update', {
    ...props.event,
    attributes: [...currentAttributes, newAttribute]
  })
}
</script>

<style scoped>
.event-card {
  display: flex;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.cardinality-sidebar {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  border-right: 1px solid #1f425a;
}

.cardinality-at_least {
  background: linear-gradient(to right, #1f425a 30%, #ebf2fa 30%);
}

.cardinality-exactly {
  background: linear-gradient(to right, #2e7d32 30%, #e8f5e9 30%);
}

.cardinality-at_most {
  background: linear-gradient(to right, #c62828 30%, #ffebee 30%);
}

.cardinality-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-size: 13px;
  font-weight: 600;
  color: #1f425a;
  position: relative;
  z-index: 1;
  white-space: nowrap;
  padding-left: 8px;
}

.cardinality-exactly .cardinality-label {
  color: #2e7d32;
}

.cardinality-at_most .cardinality-label {
  color: #c62828;
}

.event-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.event-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.event-type-indicator {
  display: flex;
  align-items: center;
}

.event-type-label {
  font-size: 14px;
  font-weight: 600;
  color: #1f425a;
}

.event-header__right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.event-body {
  padding: 16px;
}

.concept-set-section {
  margin-bottom: 16px;
}

.concept-set-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.concept-set-selected {
  margin-top: 4px;
}

.temporal-section,
.cardinality-section {
  margin-top: 16px;
  padding: 12px;
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.attributes-section {
  margin-top: 16px;
}

.temporal-section-header,
.cardinality-section-header,
.attributes-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.temporal-section-label,
.cardinality-section-label,
.attributes-section-label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
</style>
