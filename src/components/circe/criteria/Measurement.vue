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
import { useI18n } from '@/composables/useI18n'
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import type { ConceptArray, Criteria, CriteriaGroup, ConceptSetSelection, DateRange, Measurement, NumericRange } from '@/models/circe-types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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

const { t } = useI18n()
const measurementTitle = computed(() => t('components.measurement.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() => t('components.criteria.selectConceptSet').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.measurement.attributes.first.label').value,
    description: t('components.measurement.attributes.first.description').value,
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
    label: t('components.measurement.attributes.occurrenceStartDate.label').value,
    description: t('components.measurement.attributes.occurrenceStartDate.description').value,
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
    isActive: () => measurementData.value.OccurrenceStartDate != null,
  },
  {
    key: 'MeasurementType',
    label: t('criteriaAttributes.measurementType.label').value,
    description: t('criteriaAttributes.measurementType.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'MeasurementType'),
        exclude: toRef(measurementData.value, 'MeasurementTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.MeasurementType = [] as ConceptArray
      measurementData.value.MeasurementTypeExclude = false
    },
    clear: () => {
      delete measurementData.value.MeasurementType
      delete measurementData.value.MeasurementTypeExclude
    },
    isActive: () => measurementData.value.MeasurementType != null,
  },
  {
    key: 'MeasurementTypeCS',
    label: t('criteriaAttributes.measurementTypeCS.label').value,
    description: t('criteriaAttributes.measurementTypeCS.description').value,
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
    isActive: () => measurementData.value.MeasurementTypeCS != null,
  },
  {
    key: 'Operator',
    label: t('criteriaAttributes.operator.label').value,
    description: t('criteriaAttributes.operator.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'Operator'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.Operator = [] as ConceptArray
    },
    clear: () => {
      delete measurementData.value.Operator
    },
    isActive: () => measurementData.value.Operator != null,
  },
  {
    key: 'OperatorCS',
    label: t('criteriaAttributes.operatorCS.label').value,
    description: t('criteriaAttributes.operatorCS.description').value,
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
    isActive: () => measurementData.value.OperatorCS != null,
  },
  {
    key: 'ValueAsNumber',
    label: t('criteriaAttributes.valueAsNumber.label').value,
    description: t('criteriaAttributes.valueAsNumber.description').value,
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
    isActive: () => measurementData.value.ValueAsNumber != null,
  },
  {
    key: 'ValueAsConcept',
    label: t('criteriaAttributes.valueAsConcept.label').value,
    description: t('criteriaAttributes.valueAsConcept.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'ValueAsConcept'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.ValueAsConcept = [] as ConceptArray
    },
    clear: () => {
      delete measurementData.value.ValueAsConcept
    },
    isActive: () => measurementData.value.ValueAsConcept != null,
  },
  {
    key: 'ValueAsConceptCS',
    label: t('criteriaAttributes.valueAsConceptCS.label').value,
    description: t('criteriaAttributes.valueAsConceptCS.description').value,
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
    isActive: () => measurementData.value.ValueAsConceptCS != null,
  },
  {
    key: 'Unit',
    label: t('criteriaAttributes.unit.label').value,
    description: t('components.measurement.attributes.unit.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'Unit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.Unit = [] as ConceptArray
    },
    clear: () => {
      delete measurementData.value.Unit
    },
    isActive: () => measurementData.value.Unit != null,
  },
  {
    key: 'UnitCS',
    label: t('criteriaAttributes.unitCS.label').value,
    description: t('criteriaAttributes.unitCS.description').value,
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
    isActive: () => measurementData.value.UnitCS != null,
  },
  {
    key: 'RangeLow',
    label: t('criteriaAttributes.rangeLow.label').value,
    description: t('criteriaAttributes.rangeLow.description').value,
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
    isActive: () => measurementData.value.RangeLow != null,
  },
  {
    key: 'RangeHigh',
    label: t('criteriaAttributes.rangeHigh.label').value,
    description: t('criteriaAttributes.rangeHigh.description').value,
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
    isActive: () => measurementData.value.RangeHigh != null,
  },
  {
    key: 'RangeLowRatio',
    label: t('criteriaAttributes.rangeLowRatio.label').value,
    description: t('criteriaAttributes.rangeLowRatio.description').value,
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
    isActive: () => measurementData.value.RangeLowRatio != null,
  },
  {
    key: 'RangeHighRatio',
    label: t('criteriaAttributes.rangeHighRatio.label').value,
    description: t('criteriaAttributes.rangeHighRatio.description').value,
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
    isActive: () => measurementData.value.RangeHighRatio != null,
  },
  {
    key: 'Abnormal',
    label: t('criteriaAttributes.abnormal.label').value,
    description: t('criteriaAttributes.abnormal.description').value,
    init: () => {
      measurementData.value.Abnormal = true
    },
    clear: () => {
      delete measurementData.value.Abnormal
    },
    isActive: () => measurementData.value.Abnormal != null,
  },
  {
    key: 'MeasurementSourceConcept',
    label: t('criteriaAttributes.measurementSourceConcept.label').value,
    description: t('criteriaAttributes.measurementSourceConcept.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      measurementSourceConceptModel as ConceptSetSelection,
      props.conceptSets,
      'Select Source Concept',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      measurementSourceConceptModel.activate()
    },
    clear: () => {
      measurementSourceConceptModel.deactivate()
    },
    isActive: () => measurementSourceConceptModel.isActive(),
  },
  {
    key: 'Age',
    label: t('criteriaAttributes.age.label').value,
    description: t('criteriaAttributes.age.description').value,
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
    isActive: () => measurementData.value.Age != null,
  },
  {
    key: 'Gender',
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
      domainFilter: 'Gender',
    }),
    init: () => {
      measurementData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete measurementData.value.Gender
    },
    isActive: () => measurementData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
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
    isActive: () => measurementData.value.GenderCS != null,
  },
  {
    key: 'ProviderSpecialty',
    label: t('criteriaAttributes.providerSpecialty.label').value,
    description: t('criteriaAttributes.providerSpecialty.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.ProviderSpecialty = [] as ConceptArray
    },
    clear: () => {
      delete measurementData.value.ProviderSpecialty
    },
    isActive: () => measurementData.value.ProviderSpecialty != null,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: t('criteriaAttributes.providerSpecialtyCS.label').value,
    description: t('criteriaAttributes.providerSpecialtyCS.description').value,
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
    isActive: () => measurementData.value.ProviderSpecialtyCS != null,
  },
  {
    key: 'VisitType',
    label: t('criteriaAttributes.visitType.label').value,
    description: t('criteriaAttributes.visitType.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(measurementData.value, 'VisitType'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      measurementData.value.VisitType = [] as ConceptArray
    },
    clear: () => {
      delete measurementData.value.VisitType
    },
    isActive: () => measurementData.value.VisitType != null,
  },
  {
    key: 'VisitTypeCS',
    label: t('criteriaAttributes.visitTypeCS.label').value,
    description: t('criteriaAttributes.visitTypeCS.description').value,
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
    isActive: () => measurementData.value.VisitTypeCS != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(measurementData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(measurementData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete measurementData.value.CorrelatedCriteria
    },
    isActive: () => measurementData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const measurementData = computed<Measurement>(() => {
  const criteria = props.criteria as { Measurement?: Measurement }
  if (!criteria.Measurement) {
    criteria.Measurement = {} as Measurement
  }
  return criteria.Measurement
})

const measurement = () => measurementData.value

const measurementConceptSetModel = createConceptSetModel(measurement, 'CodesetId') as ConceptSetSelection

const measurementSourceConceptModel = createConceptSetModel(measurement, 'MeasurementSourceConcept')

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