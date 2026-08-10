<template>
  <v-card
    class="observation-period-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="observation-period-editor__header d-flex align-center ga-3 py-3">
      <div class="observation-period-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="observation-period-editor__type">
          {{ observationPeriodTitle }}
        </div>
      </div>

      <AtlasSpacer />

      <AtlasMenu
        :close-on-content-click="true"
        location="bottom end"
        offset="8"
      >
        <template #activator="{ props: menuProps }">
          <AtlasButton
            v-bind="menuProps"
            class="observation-period-editor__add-attribute-button"
            variant="secondary"
            size="sm"
            icon="mdi-plus"
            :disabled="!canAddAttribute"
          >
            {{ addAttributeLabel }}
          </AtlasButton>
        </template>

        <AtlasList density="compact">
          <AtlasListItem
            v-for="attr in availableAttributes"
            :key="attr.key"
            :title="attr.label"
            :subtitle="attr.description"
            @click="addAttribute(attr)"
          />
        </AtlasList>
      </AtlasMenu>

      <AtlasButton
        icon="mdi-delete"
        variant="text"
        color="error"
        size="small"
        @click="emit('remove')"
      />
    </v-card-text>

    <AtlasDivider />

    <v-card-text>
      <CriteriaAttributes
        :attributes="activeAttributes"
        :concept-sets="conceptSets"
        @select-concept-set="emit('select-concept-set', $event)"
        @edit-concept-set="emit('edit-concept-set', $event)"
        @clear-concept-set="emit('clear-concept-set')"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import type { ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec, ConceptArrayBinding } from './criteria-editor.types'
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, Period } from '../circe.types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'

const props = defineProps<{
  criteria: Criteria
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  remove: []
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const observationPeriodTitle = computed(() => 'observation period')
const addAttributeLabel = computed(() => 'Add attribute...')

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Observation Period',
    description: 'Limit to first observation period in history',
    init: () => {
      observationPeriodData.value.First = true
    },
    clear: () => {
      delete observationPeriodData.value.First
    },
    isActive: () => observationPeriodData.value.First === true,
  },
  {
    key: 'PeriodStartDate',
    label: 'Period Start Date',
    description: 'Filter by period start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'PeriodStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'PeriodStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.PeriodStartDate
    },
    isActive: () => 'PeriodStartDate' in observationPeriodData.value,
  },
  {
    key: 'PeriodEndDate',
    label: 'Period End Date',
    description: 'Filter by period end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'PeriodEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'PeriodEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.PeriodEndDate
    },
    isActive: () => 'PeriodEndDate' in observationPeriodData.value,
  },
  {
    key: 'UserDefinedPeriod',
    label: 'User Defined Period',
    description: 'Set the user-defined period range',
    kind: 'period',
    componentProps: () => ({
      modelValue: ensureObjectField(observationPeriodData.value, 'UserDefinedPeriod', () => ({ StartDate: '', EndDate: '' })) as Period,
    }),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'UserDefinedPeriod', () => ({ StartDate: '', EndDate: '' }))
    },
    clear: () => {
      delete observationPeriodData.value.UserDefinedPeriod
    },
    isActive: () => 'UserDefinedPeriod' in observationPeriodData.value,
  },
  {
    key: 'PeriodType',
    label: 'Period Type',
    description: 'Filter by period type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(observationPeriodData.value, 'PeriodType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      observationPeriodData.value.PeriodType = []
    },
    clear: () => {
      delete observationPeriodData.value.PeriodType
    },
    isActive: () => 'PeriodType' in observationPeriodData.value,
  },
  {
    key: 'PeriodTypeCS',
    label: 'Period Type Concept Set',
    description: 'Filter period type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(observationPeriodData.value, 'PeriodTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      'Select Concept Set',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'PeriodTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete observationPeriodData.value.PeriodTypeCS
    },
    isActive: () => 'PeriodTypeCS' in observationPeriodData.value,
  },
  {
    key: 'PeriodLength',
    label: 'Period Length',
    description: 'Filter by period length',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'PeriodLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'PeriodLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.PeriodLength
    },
    isActive: () => 'PeriodLength' in observationPeriodData.value,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete observationPeriodData.value.DateAdjustment
    },
    isActive: () => 'DateAdjustment' in observationPeriodData.value,
  },
  {
    key: 'AgeAtStart',
    label: 'Age at Start',
    description: 'Filter by age at start of period',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.AgeAtStart
    },
    isActive: () => 'AgeAtStart' in observationPeriodData.value,
  },
  {
    key: 'AgeAtEnd',
    label: 'Age at End',
    description: 'Filter by age at end of period',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(observationPeriodData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete observationPeriodData.value.AgeAtEnd
    },
    isActive: () => 'AgeAtEnd' in observationPeriodData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(observationPeriodData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(observationPeriodData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete observationPeriodData.value.CorrelatedCriteria
    },
    isActive: () => 'CorrelatedCriteria' in observationPeriodData.value,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const observationPeriodData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.ObservationPeriod) {
    criteria.ObservationPeriod = {}
  }
  return criteria.ObservationPeriod
})

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.observation-period-editor__type {
  font-weight: 600;
}

.observation-period-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>