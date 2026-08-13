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
import type { Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, TextFilter } from '../circe.types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
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
    isActive: () => 'Age' in drugExposureData.value,
  },
  {
    key: 'Gender',
    label: 'Gender',
    description: 'Filter by patient gender',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.Gender = []
    },
    clear: () => {
      delete drugExposureData.value.Gender
    },
    isActive: () => 'Gender' in drugExposureData.value,
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
    isActive: () => 'GenderCS' in drugExposureData.value,
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
    isActive: () => 'DateAdjustment' in drugExposureData.value,
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
    isActive: () => 'OccurrenceStartDate' in drugExposureData.value,
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
    isActive: () => 'OccurrenceEndDate' in drugExposureData.value,
  },
  {
    key: 'DrugType',
    label: 'Drug Type',
    description: 'Filter by drug type',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'DrugType'),
        exclude: toRef(drugExposureData.value, 'DrugTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.DrugType = []
      drugExposureData.value.DrugTypeExclude = false
    },
    clear: () => {
      delete drugExposureData.value.DrugType
      delete drugExposureData.value.DrugTypeExclude
    },
    isActive: () => 'DrugType' in drugExposureData.value || 'DrugTypeExclude' in drugExposureData.value,
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
    isActive: () => 'DrugTypeCS' in drugExposureData.value,
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
    isActive: () => 'StopReason' in drugExposureData.value,
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
    isActive: () => 'Refills' in drugExposureData.value,
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
    isActive: () => 'Quantity' in drugExposureData.value,
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
    isActive: () => 'DaysSupply' in drugExposureData.value,
  },
  {
    key: 'RouteConcept',
    label: 'Route',
    description: 'Filter by route of administration',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'RouteConcept'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.RouteConcept = []
    },
    clear: () => {
      delete drugExposureData.value.RouteConcept
    },
    isActive: () => 'RouteConcept' in drugExposureData.value,
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
    isActive: () => 'RouteConceptCS' in drugExposureData.value,
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
    isActive: () => 'EffectiveDrugDose' in drugExposureData.value,
  },
  {
    key: 'DoseUnit',
    label: 'Dose Unit',
    description: 'Filter by dose unit',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'DoseUnit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.DoseUnit = []
    },
    clear: () => {
      delete drugExposureData.value.DoseUnit
    },
    isActive: () => 'DoseUnit' in drugExposureData.value,
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
    isActive: () => 'DoseUnitCS' in drugExposureData.value,
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
    isActive: () => 'LotNumber' in drugExposureData.value,
  },
  {
    key: 'ProviderSpecialty',
    label: 'Provider Specialty',
    description: 'Filter by provider specialty',
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(drugExposureData.value, 'ProviderSpecialty'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      drugExposureData.value.ProviderSpecialty = []
    },
    clear: () => {
      delete drugExposureData.value.ProviderSpecialty
    },
    isActive: () => 'ProviderSpecialty' in drugExposureData.value,
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
    isActive: () => 'ProviderSpecialtyCS' in drugExposureData.value,
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
    isActive: () => 'DrugSourceConcept' in drugExposureData.value,
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
    isActive: () => 'CorrelatedCriteria' in drugExposureData.value,
  },
])

// Exposed so the attribute-spec/schema cross-reference test can reach the spec list.
defineExpose({ attributeSpecs })

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const drugExposureData = computed<Record<string, any>>(() => {
  const criteria = props.criteria as Record<string, any>
  if (!criteria.DrugExposure) {
    criteria.DrugExposure = {}
  }
  return criteria.DrugExposure
})

const drugExposureConceptSetModel = {
  get CodesetId() {
    return drugExposureData.value.CodesetId
  },
  set CodesetId(value: number | undefined) {
    drugExposureData.value.CodesetId = value
  },
} as ConceptSetSelection

const drugSourceConceptModel = {
  get CodesetId() {
    return drugExposureData.value.DrugSourceConcept
  },
  set CodesetId(value: number | undefined) {
    drugExposureData.value.DrugSourceConcept = value
  },
} as ConceptSetSelection

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