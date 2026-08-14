<template>
  <v-card
    class="drug-exposure-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="drug-exposure-editor__header d-flex align-center ga-3 py-3">
      <div class="drug-exposure-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="drug-exposure-editor__type">
          {{ drugExposureTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="drugExposureConceptSetModel"
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
            class="drug-exposure-editor__add-attribute-button"
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
import type { Criteria, CriteriaGroup, ConceptArray, ConceptSetSelection, DateAdjustment, DateRange, DrugExposure, NumericRange, TextFilter } from '@/models/circe-types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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

const drugExposureTitle = computed(() =>
  t('components.conditionDrugExposure.conditionDrugExposureText_1', 'a drug exposure of').value
)
const addAttributeLabel = computed(() =>
  t('components.conditionDrugExposure.addAttribute', 'Add attribute...').value
)
const selectConceptSetLabel = computed(() =>
  t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value
)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Exposure',
    description: 'Limit to first exposure in history',
    init: () => {
      drugExposureData.value.First = true
    },
    clear: () => {
      delete drugExposureData.value.First
    },
    isActive: () => drugExposureData.value.First === true,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at time of event',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugExposureData.value.Age
    },
    isActive: () => drugExposureData.value.Age != null,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'Gender') as ConceptArrayBinding['concepts'],
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete drugExposureData.value.Gender
    },
    isActive: () => drugExposureData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(drugExposureData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete drugExposureData.value.GenderCS
    },
    isActive: () => drugExposureData.value.GenderCS != null,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete drugExposureData.value.DateAdjustment
    },
    isActive: () => drugExposureData.value.DateAdjustment != null,
  },
  {
    key: 'OccurrenceStartDate',
    label: 'Start Date',
    description: 'Filter by start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugExposureData.value.OccurrenceStartDate
    },
    isActive: () => drugExposureData.value.OccurrenceStartDate != null,
  },
  {
    key: 'OccurrenceEndDate',
    label: 'End Date',
    description: 'Filter by end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'OccurrenceEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugExposureData.value.OccurrenceEndDate
    },
    isActive: () => drugExposureData.value.OccurrenceEndDate != null,
  },
  {
    key: 'DrugType',
    label: 'Drug Type',
    description: 'Filter by drug type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'DrugType') as ConceptArrayBinding['concepts'],
        exclude: toRef(drugExposureData.value, 'DrugTypeExclude') as NonNullable<ConceptArrayBinding['exclude']>,
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.DrugType = [] as ConceptArray
      drugExposureData.value.DrugTypeExclude = false
    },
    clear: () => {
      delete drugExposureData.value.DrugType
      delete drugExposureData.value.DrugTypeExclude
    },
    isActive: () => drugExposureData.value.DrugType != null || drugExposureData.value.DrugTypeExclude != null,
  },
  {
    key: 'DrugTypeCS',
    label: 'Drug Type Concept Set',
    description: 'Filter drug type by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(drugExposureData.value, 'DrugTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'DrugTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete drugExposureData.value.DrugTypeCS
    },
    isActive: () => drugExposureData.value.DrugTypeCS != null,
  },
  {
    key: 'StopReason',
    label: 'Stop Reason',
    description: 'Filter by stop reason text',
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'StopReason', (): TextFilter => ({ Text: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'StopReason', (): TextFilter => ({ Text: '', Op: 'contains' }))
    },
    clear: () => {
      delete drugExposureData.value.StopReason
    },
    isActive: () => drugExposureData.value.StopReason != null,
  },
  {
    key: 'Refills',
    label: 'Refills',
    description: 'Filter by number of refills',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'Refills', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'Refills', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugExposureData.value.Refills
    },
    isActive: () => drugExposureData.value.Refills != null,
  },
  {
    key: 'Quantity',
    label: 'Quantity',
    description: 'Filter by quantity',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugExposureData.value.Quantity
    },
    isActive: () => drugExposureData.value.Quantity != null,
  },
  {
    key: 'DaysSupply',
    label: 'Days Supply',
    description: 'Filter by days of drug supply',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'DaysSupply', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'DaysSupply', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugExposureData.value.DaysSupply
    },
    isActive: () => drugExposureData.value.DaysSupply != null,
  },
  {
    key: 'RouteConcept',
    label: 'Route',
    description: 'Filter by route of administration',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'RouteConcept') as ConceptArrayBinding['concepts'],
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.RouteConcept = [] as ConceptArray
    },
    clear: () => {
      delete drugExposureData.value.RouteConcept
    },
    isActive: () => drugExposureData.value.RouteConcept != null,
  },
  {
    key: 'RouteConceptCS',
    label: 'Route Concept Set',
    description: 'Filter route by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(drugExposureData.value, 'RouteConceptCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'RouteConceptCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete drugExposureData.value.RouteConceptCS
    },
    isActive: () => drugExposureData.value.RouteConceptCS != null,
  },
  {
    key: 'EffectiveDrugDose',
    label: 'Effective Drug Dose',
    description: 'Filter by effective drug dose',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'EffectiveDrugDose', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'EffectiveDrugDose', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete drugExposureData.value.EffectiveDrugDose
    },
    isActive: () => drugExposureData.value.EffectiveDrugDose != null,
  },
  {
    key: 'DoseUnit',
    label: 'Dose Unit',
    description: 'Filter by dose unit',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'DoseUnit') as ConceptArrayBinding['concepts'],
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.DoseUnit = [] as ConceptArray
    },
    clear: () => {
      delete drugExposureData.value.DoseUnit
    },
    isActive: () => drugExposureData.value.DoseUnit != null,
  },
  {
    key: 'DoseUnitCS',
    label: 'Dose Unit Concept Set',
    description: 'Filter dose unit by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(drugExposureData.value, 'DoseUnitCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'DoseUnitCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete drugExposureData.value.DoseUnitCS
    },
    isActive: () => drugExposureData.value.DoseUnitCS != null,
  },
  {
    key: 'LotNumber',
    label: 'Lot Number',
    description: 'Filter by lot number',
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(drugExposureData.value, 'LotNumber', (): TextFilter => ({ Text: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'LotNumber', (): TextFilter => ({ Text: '', Op: 'contains' }))
    },
    clear: () => {
      delete drugExposureData.value.LotNumber
    },
    isActive: () => drugExposureData.value.LotNumber != null,
  },
  {
    key: 'ProviderSpecialty',
    label: 'Provider Specialty',
    description: 'Filter by provider specialty',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'ProviderSpecialty') as ConceptArrayBinding['concepts'],
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.ProviderSpecialty = [] as ConceptArray
    },
    clear: () => {
      delete drugExposureData.value.ProviderSpecialty
    },
    isActive: () => drugExposureData.value.ProviderSpecialty != null,
  },
  {
    key: 'ProviderSpecialtyCS',
    label: 'Provider Specialty Concept Set',
    description: 'Filter provider specialty by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(drugExposureData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(drugExposureData.value, 'ProviderSpecialtyCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete drugExposureData.value.ProviderSpecialtyCS
    },
    isActive: () => drugExposureData.value.ProviderSpecialtyCS != null,
  },
  {
    key: 'DrugSourceConcept',
    label: 'Drug Source Concept',
    description: 'Filter by drug source concept',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      drugSourceConceptModel,
      props.conceptSets,
      t('components.eventCard.selectSourceConcept', 'Select Source Concept').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      drugExposureData.value.DrugSourceConcept = undefined
    },
    clear: () => {
      delete drugExposureData.value.DrugSourceConcept
    },
    isActive: () => drugExposureData.value.DrugSourceConcept != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(drugExposureData.value, 'CorrelatedCriteria', () => ({})) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(drugExposureData.value, 'CorrelatedCriteria', () => ({}))
    },
    clear: () => {
      delete drugExposureData.value.CorrelatedCriteria
    },
    isActive: () => drugExposureData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const drugExposureData = computed<DrugExposure>(() => {
  const criteria = props.criteria as { DrugExposure?: DrugExposure }
  if (!criteria.DrugExposure) {
    criteria.DrugExposure = {} as DrugExposure
  }
  return criteria.DrugExposure
})

const drugExposure = () => drugExposureData.value

const drugExposureConceptSetModel = createConceptSetModel(drugExposure, 'CodesetId') as ConceptSetSelection

const drugSourceConceptModel = createConceptSetModel(drugExposure, 'DrugSourceConcept') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.drug-exposure-editor__type {
  font-weight: 600;
}

.drug-exposure-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>