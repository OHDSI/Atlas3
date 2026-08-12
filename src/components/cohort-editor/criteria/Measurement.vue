<template>
  <v-card
    class="measurement-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="measurement-editor__header d-flex align-center ga-3 py-3">
      <div class="measurement-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="measurement-editor__type">
          {{ measurementTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="measurementConceptSetModel"
          :select-label="selectConceptSetLabel"
          @select="emit('select-concept-set', $event)"
          @edit="emit('edit-concept-set', $event)"
          @clear="emit('clear-concept-set')"
        />
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
            class="measurement-editor__add-attribute-button"
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
        variant="ghost"
        color="error"
        size="sm"
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
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateRange, NumericRange } from '../circe.types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import type { CriteriaAttributeSpec } from './criteria-editor.types'

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

const measurementTitle = computed(() => 'a measurement of')
const addAttributeLabel = computed(() => 'Add attribute...')
const selectConceptSetLabel = computed(() => 'Select Concept Set')

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Measurement',
    description: 'Limit to first measurement in history',
    init: () => {
      measurementData.value.First = true
    },
    clear: () => {
      delete measurementData.value.First
    },
    isActive: () => measurementData.value.First === true,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Measurement Date',
    description: 'Filter by measurement date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(measurementData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete measurementData.value.OccurrenceStartDate
    },
    isActive: () => 'OccurrenceStartDate' in measurementData.value,
  },
  {
    key: 'MeasurementType',
    label: 'Measurement Type',
    description: 'Filter by measurement type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'MeasurementType'),
        exclude: toRef(measurementData.value, 'MeasurementTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.MeasurementType = []
      measurementData.value.MeasurementTypeExclude = false
    },
    clear: () => {
      delete measurementData.value.MeasurementType
      delete measurementData.value.MeasurementTypeExclude
    },
    isActive: () => 'MeasurementType' in measurementData.value || 'MeasurementTypeExclude' in measurementData.value,
  },
  {
    key: 'MeasurementTypeCS',
    label: 'Measurement Type Concept Set',
    description: 'Filter measurement type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(measurementData.value, 'MeasurementTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'MeasurementTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete measurementData.value.MeasurementTypeCS
    },
    isActive: () => 'MeasurementTypeCS' in measurementData.value,
  },
  {
    key: 'Operator',
    label: 'Operator',
    description: 'Filter by measurement operator',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'Operator'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.Operator = []
    },
    clear: () => {
      delete measurementData.value.Operator
    },
    isActive: () => 'Operator' in measurementData.value,
  },
  {
    key: 'OperatorCS',
    label: 'Operator Concept Set',
    description: 'Filter operator by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(measurementData.value, 'OperatorCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'OperatorCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete measurementData.value.OperatorCS
    },
    isActive: () => 'OperatorCS' in measurementData.value,
  },
  {
    key: 'ValueAsNumber',
    label: 'Value as Number',
    description: 'Filter by numeric value',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(measurementData.value, 'ValueAsNumber', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'ValueAsNumber', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete measurementData.value.ValueAsNumber
    },
    isActive: () => 'ValueAsNumber' in measurementData.value,
  },
  {
    key: 'ValueAsConcept',
    label: 'Value as Concept',
    description: 'Filter by concept value',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'ValueAsConcept'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.ValueAsConcept = []
    },
    clear: () => {
      delete measurementData.value.ValueAsConcept
    },
    isActive: () => 'ValueAsConcept' in measurementData.value,
  },
  {
    key: 'ValueAsConceptCS',
    label: 'Value as Concept Set',
    description: 'Filter concept value by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(measurementData.value, 'ValueAsConceptCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'ValueAsConceptCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete measurementData.value.ValueAsConceptCS
    },
    isActive: () => 'ValueAsConceptCS' in measurementData.value,
  },
  {
    key: 'Unit',
    label: 'Unit',
    description: 'Filter by measurement unit',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'Unit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.Unit = []
    },
    clear: () => {
      delete measurementData.value.Unit
    },
    isActive: () => 'Unit' in measurementData.value,
  },
  {
    key: 'UnitCS',
    label: 'Unit Concept Set',
    description: 'Filter unit by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(measurementData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete measurementData.value.UnitCS
    },
    isActive: () => 'UnitCS' in measurementData.value,
  },
  {
    key: 'RangeLow',
    label: 'Range Low',
    description: 'Filter by range low',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(measurementData.value, 'RangeLow', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'RangeLow', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete measurementData.value.RangeLow
    },
    isActive: () => 'RangeLow' in measurementData.value,
  },
  {
    key: 'RangeHigh',
    label: 'Range High',
    description: 'Filter by range high',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(measurementData.value, 'RangeHigh', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'RangeHigh', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete measurementData.value.RangeHigh
    },
    isActive: () => 'RangeHigh' in measurementData.value,
  },
  {
    key: 'RangeLowRatio',
    label: 'Range Low Ratio',
    description: 'Filter by range low ratio',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(measurementData.value, 'RangeLowRatio', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'RangeLowRatio', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete measurementData.value.RangeLowRatio
    },
    isActive: () => 'RangeLowRatio' in measurementData.value,
  },
  {
    key: 'RangeHighRatio',
    label: 'Range High Ratio',
    description: 'Filter by range high ratio',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(measurementData.value, 'RangeHighRatio', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'RangeHighRatio', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete measurementData.value.RangeHighRatio
    },
    isActive: () => 'RangeHighRatio' in measurementData.value,
  },
  {
    key: 'Abnormal',
    label: 'Abnormal',
    description: 'Limit to abnormal measurements',
    init: () => {
      measurementData.value.Abnormal = true
    },
    clear: () => {
      delete measurementData.value.Abnormal
    },
    isActive: () => measurementData.value.Abnormal === true,
  },
  {
    key: 'MeasurementSourceConcept',
    label: 'Measurement Source Concept',
    description: 'Filter by measurement source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      measurementSourceConceptModel,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      measurementData.value.MeasurementSourceConcept = undefined
    },
    clear: () => {
      delete measurementData.value.MeasurementSourceConcept
    },
    isActive: () => 'MeasurementSourceConcept' in measurementData.value,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(measurementData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete measurementData.value.Age
    },
    isActive: () => 'Age' in measurementData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.Gender = []
    },
    clear: () => {
      delete measurementData.value.Gender
    },
    isActive: () => 'Gender' in measurementData.value,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(measurementData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete measurementData.value.GenderCS
    },
    isActive: () => 'GenderCS' in measurementData.value,
  },
  {
    key: 'ProviderSpecialty',
    label: 'Provider Specialty',
    description: 'Filter by provider specialty',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.ProviderSpecialty = []
    },
    clear: () => {
      delete measurementData.value.ProviderSpecialty
    },
    isActive: () => 'ProviderSpecialty' in measurementData.value,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: 'Provider Specialty Concept Set',
    description: 'Filter provider specialty by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(measurementData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete measurementData.value.ProviderSpecialtyCS
    },
    isActive: () => 'ProviderSpecialtyCS' in measurementData.value,
  },
  {
    key: 'VisitType',
    label: 'Visit Type',
    description: 'Filter by visit type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'VisitType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.VisitType = []
    },
    clear: () => {
      delete measurementData.value.VisitType
    },
    isActive: () => 'VisitType' in measurementData.value,
  },
  {
    key: 'VisitTypeCS',
    label: 'Visit Type Concept Set',
    description: 'Filter visit type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(measurementData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(measurementData.value, 'VisitTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete measurementData.value.VisitTypeCS
    },
    isActive: () => 'VisitTypeCS' in measurementData.value,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(measurementData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(measurementData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete measurementData.value.CorrelatedCriteria
    },
    isActive: () => 'CorrelatedCriteria' in measurementData.value,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const measurementData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.Measurement) {
    criteria.Measurement = {}
  }
  return criteria.Measurement
})

const measurementConceptSetModel = {
  get CodesetId() {
    return measurementData.value.CodesetId
  },
  set CodesetId(value: number | undefined) {
    measurementData.value.CodesetId = value
  },
} as ConceptSetSelection

const measurementSourceConceptModel = {
  get CodesetId() {
    return measurementData.value.MeasurementSourceConcept
  },
  set CodesetId(value: number | undefined) {
    measurementData.value.MeasurementSourceConcept = value
  },
} as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.measurement-editor__type {
  font-weight: 600;
}

.measurement-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>